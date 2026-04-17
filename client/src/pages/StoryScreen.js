import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { STORY_CHAPTERS, STORY_REGIONS } from '@shared/story-data';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { openBox, rollTM } from '@shared/boxes';
import { rollBoost } from '@shared/boost-data';
import BattleScene from '../components/BattleScene';
import TeamSelectGrid from '../components/TeamSelectGrid';
import PokemonIcon from '../components/PokemonIcon';
import { BASE_PATH } from '../config';
import './StoryScreen.css';
const API = BASE_PATH;
export default function StoryScreen({ playerId, essence, onGainEssence, onAddPokemon, onAddItems, collection }) {
    const navigate = useNavigate();
    const [completed, setCompleted] = useState(new Set());
    const [phase, setPhase] = useState('map');
    const [activeChapter, setActiveChapter] = useState(null);
    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [firstClear, setFirstClear] = useState(false);
    const [selected, setSelected] = useState([]);
    const [battleFinished, setBattleFinished] = useState(false);
    // Load progress
    useEffect(() => {
        fetch(`${API}/api/player/${playerId}/story`)
            .then(r => r.json())
            .then(data => setCompleted(new Set(data.completed)))
            .catch(() => { });
    }, [playerId]);
    const currentChapter = STORY_CHAPTERS.find(c => !completed.has(c.id)) ?? null;
    const startChapter = useCallback((chapter) => {
        setActiveChapter(chapter);
        setSelected([]);
        setSnapshot(null);
        setFirstClear(false);
        setBattleFinished(false);
        setPhase('intro');
    }, []);
    const startBattle = useCallback(async () => {
        if (!activeChapter)
            return;
        setLoading(true);
        try {
            const teamSize = activeChapter.team.length;
            let playerTeam;
            let playerMoves;
            let playerHeldItems;
            let playerAbilities;
            if (selected.length > 0) {
                // Use selected collection pokemon
                playerTeam = selected.map(idx => collection[idx].pokemon.id);
                playerMoves = selected.map(idx => collection[idx].learnedMoves ?? null);
                playerHeldItems = selected.map(idx => collection[idx].heldItem ?? null);
                playerAbilities = selected.map(idx => collection[idx].ability ?? null);
            }
            else {
                // No collection — use random pokemon
                const pool = Object.values(POKEMON_BY_ID).filter(p => p.tier !== 'legendary');
                playerTeam = Array.from({ length: teamSize }, () => pool[Math.floor(Math.random() * pool.length)].id);
            }
            const res = await fetch(`${API}/api/battle/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leftTeam: playerTeam,
                    rightTeam: activeChapter.team,
                    fieldSize: activeChapter.fieldSize,
                    leftMoves: playerMoves,
                    leftHeldItems: playerHeldItems,
                    leftAbilities: playerAbilities,
                }),
            });
            const data = await res.json();
            setSnapshot(data.snapshot);
            setPhase('battle');
        }
        catch (err) {
            console.error('Battle failed:', err);
        }
        finally {
            setLoading(false);
        }
    }, [activeChapter, collection, selected]);
    const handleBattleEnd = useCallback(async () => {
        if (!activeChapter || !snapshot)
            return;
        if (snapshot.winner === 'left') {
            // Mark complete on server
            const res = await fetch(`${API}/api/player/${playerId}/story/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chapterId: activeChapter.id }),
            });
            const data = await res.json();
            setFirstClear(data.firstClear);
            setCompleted(prev => new Set([...prev, activeChapter.id]));
            if (data.firstClear) {
                onGainEssence(activeChapter.essenceReward);
                if (activeChapter.packReward) {
                    const pack = openBox(activeChapter.packReward);
                    await onAddPokemon(pack.map(p => p.id));
                    const tm = rollTM();
                    const boost = rollBoost();
                    onAddItems([
                        { itemType: 'tm', itemData: tm },
                        { itemType: 'boost', itemData: boost },
                    ]);
                }
            }
            setPhase('victory');
        }
        else {
            // Lost — go back to map
            setPhase('map');
            setActiveChapter(null);
        }
    }, [activeChapter, snapshot, playerId, onGainEssence, onAddPokemon, onAddItems]);
    // Map view
    if (phase === 'map') {
        return (_jsxs("div", { className: "story-screen", children: [_jsxs("div", { className: "story-header", children: [_jsx("button", { className: "story-back", onClick: () => navigate('/play'), children: "\u2190 Back" }), _jsx("h2", { children: "\uD83D\uDCD6 The Stolen Spark" })] }), _jsxs("div", { className: "story-progress-bar", children: [_jsx("div", { className: "story-progress-fill", style: { width: `${(completed.size / STORY_CHAPTERS.length) * 100}%` } }), _jsxs("span", { className: "story-progress-text", children: [completed.size, "/", STORY_CHAPTERS.length] })] }), _jsx("div", { className: "story-chapters", children: STORY_REGIONS.map(region => {
                        const chapters = STORY_CHAPTERS.filter(c => c.region === region);
                        if (chapters.length === 0)
                            return null;
                        return (_jsxs("div", { className: "story-region", children: [_jsx("div", { className: "story-region-name", children: region }), _jsx("div", { className: "story-region-chapters", children: chapters.map(ch => {
                                        const done = completed.has(ch.id);
                                        const unlocked = ch.id === 1 || completed.has(ch.id - 1);
                                        const isCurrent = currentChapter?.id === ch.id;
                                        return (_jsxs("div", { className: `story-chapter-card ${done ? 'done' : ''} ${isCurrent ? 'current' : ''} ${!unlocked ? 'locked' : ''}`, onClick: () => unlocked && startChapter(ch), children: [_jsx("img", { src: ch.sprite, alt: ch.trainerName, className: "story-chapter-sprite" }), _jsxs("div", { className: "story-chapter-info", children: [_jsx("div", { className: "story-chapter-name", children: ch.trainerName }), _jsx("div", { className: "story-chapter-title", children: ch.trainerTitle }), _jsxs("div", { className: "story-chapter-format", children: [ch.fieldSize, "v", ch.fieldSize, " \u00B7 ", ch.team.length, " pkmn"] })] }), _jsx("div", { className: "story-chapter-status", children: done ? '✅' : !unlocked ? '🔒' : isCurrent ? '⚔️' : '○' })] }, ch.id));
                                    }) })] }, region));
                    }) })] }));
    }
    // Team selection
    if (phase === 'select' && activeChapter) {
        const teamSize = activeChapter.team.length;
        const instances = collection;
        const toggleSelect = (idx) => {
            if (selected.includes(idx)) {
                setSelected(selected.filter(i => i !== idx));
            }
            else if (selected.length < teamSize) {
                setSelected([...selected, idx]);
            }
        };
        return (_jsx(TeamSelectGrid, { instances: instances, selected: selected, onToggle: toggleSelect, teamSize: teamSize, onSubmit: selected.length === teamSize ? () => startBattle() : undefined, submitLabel: "\u2694\uFE0F Battle!", headerLeft: _jsx("button", { className: "battle-mp-back", onClick: () => setPhase('intro'), children: "\u2190 Back" }), headerCenter: _jsxs("span", { style: { fontSize: 14, fontWeight: 'bold' }, children: ["Pick ", teamSize, " Pok\u00E9mon"] }) }));
    }
    // Intro dialogue
    if (phase === 'intro' && activeChapter) {
        return (_jsx("div", { className: "story-screen", children: _jsxs("div", { className: "story-dialogue", children: [_jsx("img", { src: activeChapter.sprite, alt: activeChapter.trainerName, className: "story-dialogue-sprite" }), _jsx("div", { className: "story-dialogue-name", children: activeChapter.trainerName }), _jsx("div", { className: "story-dialogue-title", children: activeChapter.trainerTitle }), _jsx("div", { className: "story-dialogue-text", children: activeChapter.introline }), _jsx("div", { className: "story-dialogue-team", children: activeChapter.team.map((id, i) => (_jsx(PokemonIcon, { pokemonId: id, size: 32 }, i))) }), _jsx("button", { className: "story-fight-btn", onClick: () => collection.length > 0 ? setPhase('select') : startBattle(), disabled: loading, children: loading ? 'Loading...' : '⚔️ Choose Team' }), _jsx("button", { className: "story-retreat-btn", onClick: () => { setPhase('map'); setActiveChapter(null); }, children: "\u2190 Retreat" })] }) }));
    }
    // Battle
    if (phase === 'battle' && snapshot && activeChapter) {
        return (_jsxs("div", { className: "story-battle-wrapper", children: [_jsx(BattleScene, { snapshot: snapshot, turnDelayMs: 1500, onFinished: () => setBattleFinished(true) }), battleFinished && snapshot.winner && (_jsx("button", { className: "story-continue-btn", onClick: handleBattleEnd, children: snapshot.winner === 'left' ? '🏆 Continue' : '💀 Try Again' }))] }));
    }
    // Victory
    if (phase === 'victory' && activeChapter) {
        return (_jsx("div", { className: "story-screen", children: _jsxs("div", { className: "story-dialogue", children: [_jsx("img", { src: activeChapter.sprite, alt: activeChapter.trainerName, className: "story-dialogue-sprite" }), _jsx("div", { className: "story-dialogue-name", children: activeChapter.trainerName }), _jsx("div", { className: "story-dialogue-text", children: activeChapter.winLine }), firstClear && (_jsxs("div", { className: "story-rewards", children: [_jsxs("div", { className: "story-reward", children: ["\u2726 +", activeChapter.essenceReward, " Essence"] }), activeChapter.packReward && (_jsxs("div", { className: "story-reward", children: ["\uD83C\uDF81 ", activeChapter.packReward, " pack!"] })), activeChapter.isBoss && (_jsx("div", { className: "story-reward story-shard", children: "\uD83D\uDC8E Shard obtained!" }))] })), _jsx("button", { className: "story-fight-btn", onClick: () => { setPhase('map'); setActiveChapter(null); }, children: "Continue \u2192" })] }) }));
    }
    return null;
}
