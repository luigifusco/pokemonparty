import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BattleScene from '../components/BattleScene';
import BattleConfigScreen from '../components/BattleConfigScreen';
import TeamSelectGrid from '../components/TeamSelectGrid';
import { POKEMON } from '@shared/pokemon-data';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { calculateBattleEssence } from '@shared/essence';
import { AI_TRAINERS } from '@shared/trainer-data';
import { BASE_PATH } from '../config';
import PokemonIcon from '../components/PokemonIcon';
import './BattleDemo.css';
import './BattleMultiplayer.css';
const API_BASE = BASE_PATH;
const REGION_ORDER = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova'];
const ROLE_ORDER = ['Gym Leader', 'Elite Four', 'Champion', 'Rival', 'Villain'];
function trainerRole(t) {
    if (['Team Plasma Boss', 'Team Plasma Scientist', 'Team Aqua Boss', 'Team Magma Boss'].includes(t.title))
        return 'Villain';
    if (t.title === 'Pokémon Master')
        return 'Champion';
    return t.title;
}
function pickRandomFrom(count, exclude) {
    const available = POKEMON.filter((p) => !exclude.has(p.id));
    const picks = [];
    while (picks.length < count && available.length > 0) {
        const idx = Math.floor(Math.random() * available.length);
        picks.push(available.splice(idx, 1)[0]);
    }
    return picks;
}
// Snake draft: A picks 1, B picks 2, A picks 2, ..., last player picks 1
function buildDraftSchedule(total) {
    const schedule = [];
    let playerLeft = total;
    let aiLeft = total;
    let turn = 'player';
    let first = true;
    while (playerLeft > 0 || aiLeft > 0) {
        const left = turn === 'player' ? playerLeft : aiLeft;
        if (left <= 0) {
            turn = turn === 'player' ? 'ai' : 'player';
            continue;
        }
        // First pick is 1, last pick is whatever remains (capped at 1 for balance), middle picks are 2
        const otherLeft = turn === 'player' ? aiLeft : playerLeft;
        let picks;
        if (first) {
            picks = 1;
            first = false;
        }
        else if (left <= 1 || (otherLeft === 0 && left <= 1)) {
            picks = left;
        }
        else {
            picks = Math.min(2, left);
        }
        schedule.push({ who: turn, picks });
        if (turn === 'player')
            playerLeft -= picks;
        else
            aiLeft -= picks;
        turn = turn === 'player' ? 'ai' : 'player';
    }
    return schedule;
}
export default function BattleDemo({ essence, onGainEssence, collection }) {
    const navigate = useNavigate();
    const [trainer, setTrainer] = useState(null);
    const [config, setConfig] = useState(null);
    const [selected, setSelected] = useState([]); // indices into `instances`
    const [aiTeam, setAiTeam] = useState([]);
    const [snapshot, setSnapshot] = useState(null);
    const [opponentTeam, setOpponentTeam] = useState([]);
    const [rewarded, setRewarded] = useState(false);
    const [loading, setLoading] = useState(false);
    // Draft state
    const [draftSchedule, setDraftSchedule] = useState([]);
    const [draftPhase, setDraftPhase] = useState(0);
    const [allPickedIndices, setAllPickedIndices] = useState(new Set()); // instance indices already confirmed by player
    const [allPickedAiIds, setAllPickedAiIds] = useState(new Set()); // pokemon IDs picked by AI
    const [draftBattleStarted, setDraftBattleStarted] = useState(false);
    const teamSize = config?.totalPokemon ?? 3;
    const useOwn = config?.useOwnPokemon ?? false;
    const isDraft = config?.selectionMode === 'draft';
    // Build instances array: either player collection or synthetic instances from global POKEMON
    const instances = useMemo(() => {
        if (useOwn)
            return collection;
        return POKEMON.map((p) => ({
            instanceId: `synth-${p.id}`,
            pokemon: p,
            ivs: { hp: 15, attack: 15, defense: 15, spAtk: 15, spDef: 15, speed: 15 },
            nature: 'Serious',
            ability: '',
        }));
    }, [useOwn, collection]);
    const draftDone = isDraft && draftPhase >= draftSchedule.length;
    const currentDraftStep = isDraft && !draftDone ? draftSchedule[draftPhase] : null;
    const isMyDraftTurn = currentDraftStep?.who === 'player';
    const getSelectedPokemon = () => selected.map((idx) => instances[idx].pokemon);
    const startBattleWithTeams = async (myTeam, theirTeam) => {
        if (!config)
            return;
        setOpponentTeam(theirTeam);
        setLoading(true);
        try {
            const leftMoves = useOwn ? myTeam.map((p) => {
                const inst = instances.find((i) => i.pokemon.id === p.id);
                return inst?.learnedMoves ?? null;
            }) : undefined;
            const leftHeldItems = useOwn ? myTeam.map((p) => {
                const inst = instances.find((i) => i.pokemon.id === p.id);
                return inst?.heldItem ?? null;
            }) : undefined;
            const leftAbilities = useOwn ? myTeam.map((p) => {
                const inst = instances.find((i) => i.pokemon.id === p.id);
                return inst?.ability ?? null;
            }) : undefined;
            const res = await fetch(`${API_BASE}/api/battle/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leftTeam: myTeam.map((p) => p.id),
                    rightTeam: theirTeam.map((p) => p.id),
                    fieldSize: config.fieldSize,
                    selectionMode: config.selectionMode,
                    leftMoves,
                    leftHeldItems,
                    leftAbilities,
                }),
            });
            const data = await res.json();
            setSnapshot(data.snapshot);
        }
        catch (err) {
            console.error('Battle simulation failed:', err);
        }
        finally {
            setLoading(false);
        }
    };
    // Build the trainer's available pokemon pool based on team size
    const trainerPool = useMemo(() => {
        if (!trainer)
            return [];
        const allIds = [...trainer.coreTeam, ...trainer.extraTeam].slice(0, Math.max(teamSize, 6));
        return allIds.map((id) => POKEMON_BY_ID[id]).filter(Boolean);
    }, [trainer, teamSize]);
    // AI auto-pick during draft (from trainer's pool)
    useEffect(() => {
        if (!isDraft || draftDone || !currentDraftStep || currentDraftStep.who !== 'ai')
            return;
        const excludeIds = new Set(allPickedAiIds);
        for (const idx of allPickedIndices)
            excludeIds.add(instances[idx]?.pokemon.id);
        const timer = setTimeout(() => {
            const available = trainerPool.filter((p) => !excludeIds.has(p.id));
            const picks = [];
            for (let i = 0; i < currentDraftStep.picks && available.length > 0; i++) {
                const ri = Math.floor(Math.random() * available.length);
                picks.push(available.splice(ri, 1)[0]);
            }
            setAiTeam((prev) => [...prev, ...picks]);
            setAllPickedAiIds((prev) => {
                const next = new Set(prev);
                picks.forEach((p) => next.add(p.id));
                return next;
            });
            setDraftPhase((prev) => prev + 1);
        }, 600);
        return () => clearTimeout(timer);
    }, [isDraft, draftDone, draftPhase, currentDraftStep, allPickedIndices, allPickedAiIds, instances, trainerPool]);
    // Auto-start battle when draft completes
    useEffect(() => {
        if (!isDraft || !draftDone || snapshot || loading || draftBattleStarted)
            return;
        setDraftBattleStarted(true);
        startBattleWithTeams(getSelectedPokemon(), aiTeam);
    }, [draftDone, isDraft, snapshot, loading, draftBattleStarted, selected, aiTeam]);
    // Trainer selection screen
    const [regionFilter, setRegionFilter] = useState(null);
    const [roleFilter, setRoleFilter] = useState(null);
    const filteredTrainers = useMemo(() => {
        return AI_TRAINERS.filter((t) => {
            if (regionFilter && t.region !== regionFilter)
                return false;
            if (roleFilter && trainerRole(t) !== roleFilter)
                return false;
            return true;
        });
    }, [regionFilter, roleFilter]);
    if (!trainer) {
        return (_jsxs("div", { className: "battle-mp-screen", children: [_jsxs("div", { className: "battle-mp-header", children: [_jsx("button", { className: "battle-mp-back", onClick: () => navigate('/play'), children: "\u2190 Back" }), _jsx("h2", { children: "\u2694\uFE0F Challenge a Trainer" })] }), _jsxs("div", { className: "trainer-filters", children: [_jsx("div", { className: "trainer-filter-row", children: REGION_ORDER.map((r) => (_jsx("button", { className: `trainer-filter-pill${regionFilter === r ? ' active' : ''}`, onClick: () => setRegionFilter(regionFilter === r ? null : r), children: r }, r))) }), _jsx("div", { className: "trainer-filter-row", children: ROLE_ORDER.map((r) => (_jsx("button", { className: `trainer-filter-pill role${roleFilter === r ? ' active' : ''}`, onClick: () => setRoleFilter(roleFilter === r ? null : r), children: r }, r))) })] }), _jsx("div", { className: "trainer-list", children: filteredTrainers.map((t) => (_jsxs("div", { className: "trainer-card", onClick: () => setTrainer(t), children: [_jsx("img", { src: t.sprite, alt: t.name, className: "trainer-sprite" }), _jsxs("div", { className: "trainer-info", children: [_jsx("div", { className: "trainer-name", children: t.name }), _jsxs("div", { className: "trainer-title", children: [t.title, " \u2014 ", t.region] }), _jsx("div", { className: "trainer-team-preview", children: [...t.coreTeam, ...t.extraTeam].map((id) => (_jsx(PokemonIcon, { pokemonId: id, size: 24 }, id))) })] })] }, t.id))) })] }));
    }
    // Config screen
    if (!config) {
        return (_jsx(BattleConfigScreen, { onConfirm: (c) => {
                setConfig(c);
                if (c.selectionMode === 'draft') {
                    setDraftSchedule(buildDraftSchedule(c.totalPokemon));
                    setDraftPhase(0);
                    setAllPickedIndices(new Set());
                    setAllPickedAiIds(new Set());
                    setSelected([]);
                    setAiTeam([]);
                    setDraftBattleStarted(false);
                }
            }, onBack: () => setTrainer(null), showDraftOption: true, showOwnPokemonOption: true, ownPokemonCount: collection.length }));
    }
    if (snapshot) {
        const essenceGained = calculateBattleEssence(opponentTeam);
        if (snapshot.winner === 'left' && !rewarded) {
            onGainEssence(essenceGained);
            setRewarded(true);
        }
        return (_jsxs("div", { className: "battle-demo-wrapper", children: [_jsx(BattleScene, { snapshot: snapshot, turnDelayMs: 2000, essenceGained: essenceGained, trainerId: trainer?.id }), _jsx("button", { className: "battle-demo-back", onClick: () => { setSnapshot(null); setSelected([]); setAiTeam([]); setOpponentTeam([]); setRewarded(false); setConfig(null); setTrainer(null); setDraftSchedule([]); setDraftPhase(0); setAllPickedIndices(new Set()); setAllPickedAiIds(new Set()); setDraftBattleStarted(false); }, children: "\u2715" })] }));
    }
    // --- Draft mode ---
    if (isDraft) {
        const draftToggle = (idx) => {
            if (!isMyDraftTurn || !currentDraftStep)
                return;
            // Block if this specific instance is already confirmed, or if AI picked this pokemon ID
            if (allPickedIndices.has(idx))
                return;
            if (allPickedAiIds.has(instances[idx].pokemon.id))
                return;
            if (selected.includes(idx)) {
                if (!allPickedIndices.has(idx))
                    setSelected(selected.filter((i) => i !== idx));
            }
            else if (selected.length < aiTeam.length + currentDraftStep.picks) {
                setSelected([...selected, idx]);
            }
        };
        const confirmDraftPick = () => {
            if (!currentDraftStep)
                return;
            const myPhasePicks = selected.slice(-currentDraftStep.picks);
            setAllPickedIndices((prev) => {
                const next = new Set(prev);
                myPhasePicks.forEach((idx) => next.add(idx));
                return next;
            });
            setDraftPhase((prev) => prev + 1);
        };
        const confirmedPlayerPicks = allPickedIndices.size;
        const pendingPicks = selected.length - confirmedPlayerPicks;
        const neededPicks = currentDraftStep?.picks ?? 0;
        // Disable: confirmed player picks, and any instance whose pokemon ID was AI-picked
        const disabledIndices = new Set();
        instances.forEach((inst, idx) => {
            if (allPickedIndices.has(idx) && !selected.includes(idx)) {
                disabledIndices.add(idx);
            }
            if (allPickedAiIds.has(inst.pokemon.id)) {
                disabledIndices.add(idx);
            }
        });
        return (_jsx(TeamSelectGrid, { instances: instances, selected: selected, onToggle: draftToggle, teamSize: teamSize, disabledIndices: disabledIndices, onSubmit: isMyDraftTurn && pendingPicks === neededPicks ? confirmDraftPick : undefined, submitLabel: "\u2713 Confirm", headerLeft: _jsx("button", { className: "battle-mp-back", onClick: () => setConfig(null), children: "\u2190 Back" }), headerCenter: _jsxs("h2", { children: ["\u26A1 Draft (", selected.length, " / ", teamSize, ")"] }), aboveGrid: _jsxs(_Fragment, { children: [_jsx("div", { className: "draft-turn-banner", style: { textAlign: 'center', padding: '8px', fontSize: '14px', color: isMyDraftTurn ? '#6fdb73' : '#aaa' }, children: draftDone ? '⏳ Starting battle...' : isMyDraftTurn ? `Your pick (${neededPicks})` : `AI is picking...` }), _jsxs("div", { style: { display: 'flex', gap: '8px', justifyContent: 'center', padding: '0 8px 4px', alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("div", { style: { fontSize: '11px', color: '#aaa' }, children: "AI:" }), aiTeam.map((p) => (_jsx(PokemonIcon, { pokemonId: p.id, size: 28 }, p.id))), Array.from({ length: teamSize - aiTeam.length }).map((_, i) => (_jsx("span", { style: { width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 4, fontSize: 12, color: '#555' }, children: "?" }, `ae-${i}`)))] })] }) }));
    }
    // --- Blind mode ---
    const toggleBlind = (idx) => {
        if (selected.includes(idx)) {
            setSelected(selected.filter((i) => i !== idx));
        }
        else if (selected.length < teamSize) {
            setSelected([...selected, idx]);
        }
    };
    const startBattle = async () => {
        const myTeam = getSelectedPokemon();
        // Use trainer's team (core + extra as needed)
        const opponent = trainerPool.slice(0, teamSize);
        startBattleWithTeams(myTeam, opponent);
    };
    return (_jsx(TeamSelectGrid, { instances: instances, selected: selected, onToggle: toggleBlind, teamSize: teamSize, onSubmit: selected.length === teamSize ? startBattle : undefined, submitLabel: loading ? '⏳ Simulating...' : '⚔️ Battle!', headerLeft: _jsx("button", { className: "battle-mp-back", onClick: () => setConfig(null), children: "\u2190 Back" }), headerCenter: _jsxs("h2", { children: ["Pick Your Team (", selected.length, "/", teamSize, ")"] }) }));
}
