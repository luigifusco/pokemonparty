import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BattleScene from '../components/BattleScene';
import BattleConfigScreen from '../components/BattleConfigScreen';
import TeamSelectGrid from '../components/TeamSelectGrid';
import type { BattleSnapshot, BattleConfig } from '@shared/battle-types';
import { POKEMON } from '@shared/pokemon-data';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { calculateBattleEssence } from '@shared/essence';
import type { Pokemon, PokemonInstance } from '@shared/types';
import { getEffectiveMoves } from '@shared/types';
import { AI_TRAINERS } from '@shared/trainer-data';
import type { AITrainer } from '@shared/trainer-data';
import { CHARACTER_UNLOCK_CHAPTER } from '@shared/story-data';
import { BASE_PATH } from '../config';
import PokemonIcon from '../components/PokemonIcon';
import { useStoryChapters } from '../hooks/useStoryChapters';
import './BattleDemo.css';
import './BattleMultiplayer.css';

const API_BASE = BASE_PATH;

const REGION_ORDER = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova'];
const ROLE_ORDER = ['Gym Leader', 'Elite Four', 'Champion', 'Rival', 'Villain'];

function trainerRole(t: AITrainer): string {
  if (['Team Plasma Boss', 'Team Plasma Scientist', 'Team Aqua Boss', 'Team Magma Boss'].includes(t.title)) return 'Villain';
  if (t.title === 'Pokémon Master') return 'Champion';
  return t.title;
}

function pickRandomFrom(count: number, exclude: Set<number>): Pokemon[] {
  const available = POKEMON.filter((p) => !exclude.has(p.id));
  const picks: Pokemon[] = [];
  while (picks.length < count && available.length > 0) {
    const idx = Math.floor(Math.random() * available.length);
    picks.push(available.splice(idx, 1)[0]);
  }
  return picks;
}

// Snake draft: A picks 1, B picks 2, A picks 2, ..., last player picks 1
function buildDraftSchedule(total: number): { who: 'player' | 'ai'; picks: number }[] {
  const schedule: { who: 'player' | 'ai'; picks: number }[] = [];
  let playerLeft = total;
  let aiLeft = total;
  let turn: 'player' | 'ai' = 'player';
  let first = true;

  while (playerLeft > 0 || aiLeft > 0) {
    const left = turn === 'player' ? playerLeft : aiLeft;
    if (left <= 0) { turn = turn === 'player' ? 'ai' : 'player'; continue; }

    // First pick is 1, last pick is whatever remains (capped at 1 for balance), middle picks are 2
    const otherLeft = turn === 'player' ? aiLeft : playerLeft;
    let picks: number;
    if (first) {
      picks = 1;
      first = false;
    } else if (left <= 1 || (otherLeft === 0 && left <= 1)) {
      picks = left;
    } else {
      picks = Math.min(2, left);
    }

    schedule.push({ who: turn, picks });
    if (turn === 'player') playerLeft -= picks; else aiLeft -= picks;
    turn = turn === 'player' ? 'ai' : 'player';
  }
  return schedule;
}

interface BattleDemoProps {
  essence: number;
  onGainEssence: (amount: number) => void;
  collection: PokemonInstance[];
  recentPokemonIds?: number[];
  playerName?: string;
  playerId?: string;
}

export default function BattleDemo({ essence, onGainEssence, collection, recentPokemonIds, playerName, playerId }: BattleDemoProps) {
  const navigate = useNavigate();
  const chapters = useStoryChapters(playerId);
  const characterPickUnlocked = chapters.has(CHARACTER_UNLOCK_CHAPTER);
  const [trainer, setTrainer] = useState<AITrainer | null>(null);
  const [config, setConfig] = useState<(BattleConfig & { useOwnPokemon?: boolean }) | null>(null);
  const [selected, setSelected] = useState<number[]>([]);       // indices into `instances`
  const [selectedCharacters, setSelectedCharacters] = useState<(string | null)[]>([]);
  const [aiTeam, setAiTeam] = useState<Pokemon[]>([]);
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(null);
  const [bondAwards, setBondAwards] = useState<{ instanceId: string; delta: number; total: number }[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<Pokemon[]>([]);
  const [rewarded, setRewarded] = useState(false);
  const [battleFinished, setBattleFinished] = useState(false);
  const [loading, setLoading] = useState(false);

  // Draft state
  const [draftSchedule, setDraftSchedule] = useState<{ who: 'player' | 'ai'; picks: number }[]>([]);
  const [draftPhase, setDraftPhase] = useState(0);
  const [allPickedIndices, setAllPickedIndices] = useState<Set<number>>(new Set());   // instance indices already confirmed by player
  const [allPickedAiIds, setAllPickedAiIds] = useState<Set<number>>(new Set());       // pokemon IDs picked by AI
  const [draftBattleStarted, setDraftBattleStarted] = useState(false);

  const teamSize = config?.totalPokemon ?? 3;
  const useOwn = config?.useOwnPokemon ?? false;
  const isDraft = config?.selectionMode === 'draft';

  // Build instances array: either player collection or synthetic instances from global POKEMON
  const instances: PokemonInstance[] = useMemo(() => {
    if (useOwn) return collection;
    return POKEMON.map((p) => ({
      instanceId: `synth-${p.id}`,
      pokemon: p,
      ivs: { hp: 15, attack: 15, defense: 15, spAtk: 15, spDef: 15, speed: 15 },
      nature: 'Serious' as const,
      ability: '',
    }));
  }, [useOwn, collection]);

  const draftDone = isDraft && draftPhase >= draftSchedule.length;
  const currentDraftStep = isDraft && !draftDone ? draftSchedule[draftPhase] : null;
  const isMyDraftTurn = currentDraftStep?.who === 'player';

  const getSelectedPokemon = (): Pokemon[] => selected.map((idx) => instances[idx].pokemon);

  const startBattleWithTeams = async (myTeam: Pokemon[], theirTeam: Pokemon[]) => {
    if (!config) return;
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
      const leftCharacters = useOwn ? myTeam.map((p, i) => {
        const inst = instances.find((it) => it.pokemon.id === p.id);
        // selectedCharacters is aligned with `selected` array, which order-matches myTeam
        const override = selectedCharacters[i] ?? null;
        return override ?? inst?.character ?? null;
      }) : undefined;

      const leftInstanceIds = useOwn ? myTeam.map((p) => {
        const inst = instances.find((i) => i.pokemon.id === p.id);
        return inst?.instanceId ?? null;
      }).filter((x): x is string => !!x) : undefined;

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
          leftCharacters,
          playerName: playerName,
          leftInstanceIds,
          bondMode: 'ai',
        }),
      });
      const data = await res.json();
      setSnapshot(data.snapshot);
      setBondAwards(data.bondAwards ?? []);
    } catch (err) {
      console.error('Battle simulation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build the trainer's available pokemon pool based on team size
  const trainerPool: Pokemon[] = useMemo(() => {
    if (!trainer) return [];
    const allIds = [...trainer.coreTeam, ...trainer.extraTeam].slice(0, Math.max(teamSize, 6));
    return allIds.map((id) => POKEMON_BY_ID[id]).filter(Boolean);
  }, [trainer, teamSize]);

  // AI auto-pick during draft (from trainer's pool)
  useEffect(() => {
    if (!isDraft || draftDone || !currentDraftStep || currentDraftStep.who !== 'ai') return;
    const excludeIds = new Set(allPickedAiIds);
    for (const idx of allPickedIndices) excludeIds.add(instances[idx]?.pokemon.id);
    const timer = setTimeout(() => {
      const available = trainerPool.filter((p) => !excludeIds.has(p.id));
      const picks: Pokemon[] = [];
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
    if (!isDraft || !draftDone || snapshot || loading || draftBattleStarted) return;
    setDraftBattleStarted(true);
    startBattleWithTeams(getSelectedPokemon(), aiTeam);
  }, [draftDone, isDraft, snapshot, loading, draftBattleStarted, selected, aiTeam]);

  // Trainer selection screen
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const filteredTrainers = useMemo(() => {
    return AI_TRAINERS.filter((t) => {
      if (regionFilter && t.region !== regionFilter) return false;
      if (roleFilter && trainerRole(t) !== roleFilter) return false;
      return true;
    });
  }, [regionFilter, roleFilter]);

  if (!trainer) {
    return (
      <div className="battle-mp-screen">
        <div className="battle-mp-header">
          <button className="battle-mp-back" onClick={() => navigate('/play')}>← Back</button>
          <h2>Challenge a Trainer</h2>
        </div>
        <div className="trainer-filters">
          <div className="trainer-filter-row">
            {REGION_ORDER.map((r) => (
              <button key={r} className={`trainer-filter-pill${regionFilter === r ? ' active' : ''}`}
                onClick={() => setRegionFilter(regionFilter === r ? null : r)}>{r}</button>
            ))}
          </div>
          <div className="trainer-filter-row">
            {ROLE_ORDER.map((r) => (
              <button key={r} className={`trainer-filter-pill role${roleFilter === r ? ' active' : ''}`}
                onClick={() => setRoleFilter(roleFilter === r ? null : r)}>{r}</button>
            ))}
          </div>
        </div>
        <div className="trainer-list">
          {filteredTrainers.map((t) => (
            <div key={t.id} className="trainer-card" onClick={() => setTrainer(t)}>
              <img src={t.sprite} alt={t.name} className="trainer-sprite" />
              <div className="trainer-info">
                <div className="trainer-name">{t.name}</div>
                <div className="trainer-title">{t.title} — {t.region}</div>
                <div className="trainer-team-preview">
                  {[...t.coreTeam, ...t.extraTeam].map((id) => (
                    <PokemonIcon key={id} pokemonId={id} size={24} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Config screen
  if (!config) {
    return (
      <BattleConfigScreen
        onConfirm={(c) => {
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
        }}
        onBack={() => setTrainer(null)}
        showDraftOption={true}
        showOwnPokemonOption={true}
        ownPokemonCount={collection.length}
      />
    );
  }

  if (snapshot) {
    const essenceGained = calculateBattleEssence(opponentTeam);
    if (snapshot.winner === 'left' && !rewarded) {
      onGainEssence(essenceGained);
      setRewarded(true);
    }
    return (
      <div className="battle-demo-wrapper">
        <BattleScene
          snapshot={snapshot}
          turnDelayMs={2000}
          essenceGained={snapshot.winner === 'left' ? essenceGained : undefined}
          trainerId={trainer?.id}
          bondAwards={bondAwards}
          onFinished={() => setBattleFinished(true)}
          onContinue={battleFinished ? () => { setSnapshot(null); setBondAwards([]); setSelected([]); setSelectedCharacters([]); setAiTeam([]); setOpponentTeam([]); setRewarded(false); setBattleFinished(false); setConfig(null); setTrainer(null); setDraftSchedule([]); setDraftPhase(0); setAllPickedIndices(new Set()); setAllPickedAiIds(new Set()); setDraftBattleStarted(false); } : undefined}
          continueLabel={snapshot.winner === 'left' ? 'Claim Rewards' : 'Back'}
        />
      </div>
    );
  }

  // --- Draft mode ---
  if (isDraft) {
    const draftToggle = (idx: number, character?: string | null) => {
      if (!isMyDraftTurn || !currentDraftStep) return;
      if (allPickedIndices.has(idx)) return;
      if (allPickedAiIds.has(instances[idx].pokemon.id)) return;
      const i = selected.indexOf(idx);
      if (i !== -1) {
        if (!allPickedIndices.has(idx)) {
          setSelected(selected.filter((_, k) => k !== i));
          setSelectedCharacters(selectedCharacters.filter((_, k) => k !== i));
        }
      } else if (selected.length < aiTeam.length + currentDraftStep.picks) {
        setSelected([...selected, idx]);
        setSelectedCharacters([...selectedCharacters, character ?? null]);
      }
    };

    const confirmDraftPick = () => {
      if (!currentDraftStep) return;
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
    const disabledIndices = new Set<number>();
    instances.forEach((inst, idx) => {
      if (allPickedIndices.has(idx) && !selected.includes(idx)) {
        disabledIndices.add(idx);
      }
      if (allPickedAiIds.has(inst.pokemon.id)) {
        disabledIndices.add(idx);
      }
    });

    return (
      <TeamSelectGrid
        instances={instances}
        selected={selected}
        onToggle={draftToggle}
        teamSize={teamSize}
        disabledIndices={disabledIndices}
        onSubmit={isMyDraftTurn && pendingPicks === neededPicks ? confirmDraftPick : undefined}
        submitLabel="Confirm"
        recentPokemonIds={useOwn ? recentPokemonIds : undefined}
        enableCharacterPick={useOwn && characterPickUnlocked}
        selectedCharacters={selectedCharacters}
        onBack={() => setConfig(null)}
        title="Draft"
        subtitle={draftDone ? '⏳ Starting battle…' : isMyDraftTurn ? `Your pick (${neededPicks})` : 'AI is picking…'}
        aboveGrid={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '8px 12px 4px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>AI:</div>
            {aiTeam.map((p) => (
              <PokemonIcon key={p.id} pokemonId={p.id} size={28} />
            ))}
            {Array.from({ length: teamSize - aiTeam.length }).map((_, i) => (
              <span key={`ae-${i}`} style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--color-border-strong)', borderRadius: 6, fontSize: 12, color: 'var(--color-text-faint)' }}>?</span>
            ))}
          </div>
        }
      />
    );
  }

  // --- Blind mode ---
  const toggleBlind = (idx: number, character?: string | null) => {
    const i = selected.indexOf(idx);
    if (i !== -1) {
      setSelected(selected.filter((_, k) => k !== i));
      setSelectedCharacters(selectedCharacters.filter((_, k) => k !== i));
    } else if (selected.length < teamSize) {
      setSelected([...selected, idx]);
      setSelectedCharacters([...selectedCharacters, character ?? null]);
    }
  };

  const startBattle = async () => {
    const myTeam = getSelectedPokemon();
    // Use trainer's team (core + extra as needed)
    const opponent = trainerPool.slice(0, teamSize);
    startBattleWithTeams(myTeam, opponent);
  };

  return (
    <TeamSelectGrid
      instances={instances}
      selected={selected}
      onToggle={toggleBlind}
      teamSize={teamSize}
      onSubmit={selected.length === teamSize ? startBattle : undefined}
      submitLabel={loading ? 'Simulating...' : 'Battle!'}
      recentPokemonIds={useOwn ? recentPokemonIds : undefined}
      enableCharacterPick={useOwn && characterPickUnlocked}
      selectedCharacters={selectedCharacters}
      onBack={() => setConfig(null)}
      title="Pick Your Team"
    />
  );
}
