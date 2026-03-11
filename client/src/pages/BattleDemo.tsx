import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BattleScene from '../components/BattleScene';
import BattleConfigScreen from '../components/BattleConfigScreen';
import type { BattleSnapshot, BattleConfig } from '@shared/battle-types';
import { POKEMON } from '@shared/pokemon-data';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { calculateBattleEssence } from '@shared/essence';
import type { Pokemon } from '@shared/types';
import { BASE_PATH } from '../config';
import './BattleDemo.css';
import './BattleMultiplayer.css';

const API_BASE = BASE_PATH;

function pickRandomFrom(count: number, exclude: Set<number>): Pokemon[] {
  const available = POKEMON.filter((p) => !exclude.has(p.id));
  const picks: Pokemon[] = [];
  while (picks.length < count && available.length > 0) {
    const idx = Math.floor(Math.random() * available.length);
    picks.push(available.splice(idx, 1)[0]);
  }
  return picks;
}

// Draft schedule: player picks 1, AI picks 2, player picks 2, AI picks 1 (for 3-total)
// For other sizes we generalize: alternate, player first, distributing evenly
function buildDraftSchedule(total: number): { who: 'player' | 'ai'; picks: number }[] {
  const schedule: { who: 'player' | 'ai'; picks: number }[] = [];
  let playerLeft = total;
  let aiLeft = total;
  let turn: 'player' | 'ai' = 'player';
  // Simple alternation: pick 1 at a time
  while (playerLeft > 0 || aiLeft > 0) {
    if (turn === 'player' && playerLeft > 0) {
      schedule.push({ who: 'player', picks: 1 });
      playerLeft--;
    } else if (turn === 'ai' && aiLeft > 0) {
      schedule.push({ who: 'ai', picks: 1 });
      aiLeft--;
    }
    turn = turn === 'player' ? 'ai' : 'player';
  }
  return schedule;
}

interface BattleDemoProps {
  essence: number;
  onGainEssence: (amount: number) => void;
}

export default function BattleDemo({ essence, onGainEssence }: BattleDemoProps) {
  const navigate = useNavigate();
  const [config, setConfig] = useState<BattleConfig | null>(null);
  const [selected, setSelected] = useState<Pokemon[]>([]);
  const [aiTeam, setAiTeam] = useState<Pokemon[]>([]);
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(null);
  const [opponentTeam, setOpponentTeam] = useState<Pokemon[]>([]);
  const [rewarded, setRewarded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Draft state
  const [draftSchedule, setDraftSchedule] = useState<{ who: 'player' | 'ai'; picks: number }[]>([]);
  const [draftPhase, setDraftPhase] = useState(0);
  const [allPicked, setAllPicked] = useState<Set<number>>(new Set());
  const [draftBattleStarted, setDraftBattleStarted] = useState(false);

  const teamSize = config?.totalPokemon ?? 3;
  const isDraft = config?.selectionMode === 'draft';
  const draftDone = isDraft && draftPhase >= draftSchedule.length;
  const currentDraftStep = isDraft && !draftDone ? draftSchedule[draftPhase] : null;
  const isMyDraftTurn = currentDraftStep?.who === 'player';

  const startBattleWithTeams = async (myTeam: Pokemon[], theirTeam: Pokemon[]) => {
    if (!config) return;
    setOpponentTeam(theirTeam);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/battle/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftTeam: myTeam.map((p) => p.id),
          rightTeam: theirTeam.map((p) => p.id),
          fieldSize: config.fieldSize,
          selectionMode: config.selectionMode,
        }),
      });
      const data = await res.json();
      setSnapshot(data.snapshot);
    } catch (err) {
      console.error('Battle simulation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // AI auto-pick during draft
  useEffect(() => {
    if (!isDraft || draftDone || !currentDraftStep || currentDraftStep.who !== 'ai') return;
    const timer = setTimeout(() => {
      const picks = pickRandomFrom(currentDraftStep.picks, allPicked);
      setAiTeam((prev) => [...prev, ...picks]);
      setAllPicked((prev) => {
        const next = new Set(prev);
        picks.forEach((p) => next.add(p.id));
        return next;
      });
      setDraftPhase((prev) => prev + 1);
    }, 600);
    return () => clearTimeout(timer);
  }, [isDraft, draftDone, draftPhase, currentDraftStep, allPicked]);

  // Auto-start battle when draft completes
  useEffect(() => {
    if (!isDraft || !draftDone || snapshot || loading || draftBattleStarted) return;
    setDraftBattleStarted(true);
    startBattleWithTeams(selected, aiTeam);
  }, [draftDone, isDraft, snapshot, loading, draftBattleStarted, selected, aiTeam]);

  // Config screen
  if (!config) {
    return (
      <BattleConfigScreen
        onConfirm={(c) => {
          setConfig(c);
          if (c.selectionMode === 'draft') {
            setDraftSchedule(buildDraftSchedule(c.totalPokemon));
            setDraftPhase(0);
            setAllPicked(new Set());
            setSelected([]);
            setAiTeam([]);
            setDraftBattleStarted(false);
          }
        }}
        onBack={() => navigate('/play')}
        showDraftOption={true}
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
        <BattleScene snapshot={snapshot} turnDelayMs={2000} essenceGained={essenceGained} />
        <button className="battle-demo-back" onClick={() => { setSnapshot(null); setSelected([]); setAiTeam([]); setOpponentTeam([]); setRewarded(false); setConfig(null); setDraftSchedule([]); setDraftPhase(0); setAllPicked(new Set()); setDraftBattleStarted(false); }}>
          ← New Battle
        </button>
      </div>
    );
  }

  // --- Draft mode ---
  if (isDraft) {
    const draftToggle = (p: Pokemon) => {
      if (!isMyDraftTurn || !currentDraftStep) return;
      if (allPicked.has(p.id)) return;
      if (selected.find((s) => s.id === p.id)) {
        setSelected(selected.filter((s) => s.id !== p.id));
      } else if (selected.length < aiTeam.length + currentDraftStep.picks) {
        // Allow picking up to current step count beyond what's already confirmed
        const pendingCount = selected.length - (draftPhase > 0 ? selected.length - currentDraftStep.picks : 0);
        setSelected([...selected, p]);
      }
    };

    const confirmDraftPick = () => {
      if (!currentDraftStep) return;
      // The picks for this phase are the last N selected
      const myPhasePicks = selected.slice(-currentDraftStep.picks);
      setAllPicked((prev) => {
        const next = new Set(prev);
        myPhasePicks.forEach((p) => next.add(p.id));
        return next;
      });
      setDraftPhase((prev) => prev + 1);
    };

    // How many picks have been confirmed so far by the player
    const confirmedPlayerPicks = allPicked.size - aiTeam.length;
    const pendingPicks = selected.length - confirmedPlayerPicks;
    const neededPicks = currentDraftStep?.picks ?? 0;

    const sorted = [...POKEMON].sort((a, b) => a.id - b.id);

    return (
      <div className="battle-mp-screen">
        <div className="battle-mp-team-header">
          <button className="battle-mp-back" onClick={() => setConfig(null)}>← Back</button>
          <h2>⚡ Draft ({selected.length} / {teamSize})</h2>
        </div>

        <div className="draft-turn-banner" style={{ textAlign: 'center', padding: '8px', fontSize: '14px', color: isMyDraftTurn ? '#6fdb73' : '#aaa' }}>
          {draftDone ? '⏳ Starting battle...' : isMyDraftTurn ? `Your pick (${neededPicks})` : `AI is picking...`}
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', padding: '4px 8px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#aaa', textAlign: 'center', marginBottom: '4px' }}>You</div>
            <div className="team-select-chosen">
              {selected.map((p) => (
                <div key={p.id} className="team-select-chosen-card">
                  <img src={p.sprite} alt={p.name} />
                  <span>{p.name}</span>
                </div>
              ))}
              {Array.from({ length: teamSize - selected.length }).map((_, i) => (
                <div key={`empty-${i}`} className="team-select-chosen-card empty">?</div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#aaa', textAlign: 'center', marginBottom: '4px' }}>AI</div>
            <div className="team-select-chosen">
              {aiTeam.map((p) => (
                <div key={p.id} className="team-select-chosen-card">
                  <img src={p.sprite} alt={p.name} />
                  <span>{p.name}</span>
                </div>
              ))}
              {Array.from({ length: teamSize - aiTeam.length }).map((_, i) => (
                <div key={`ae-${i}`} className="team-select-chosen-card empty">?</div>
              ))}
            </div>
          </div>
        </div>

        {isMyDraftTurn && pendingPicks === neededPicks && (
          <div style={{ textAlign: 'center', padding: '4px' }}>
            <button className="team-select-go" onClick={confirmDraftPick}>✓ Confirm</button>
          </div>
        )}

        <div className="team-select-scroll">
          <div className="team-select-grid">
            {sorted.map((p) => {
              const isPicked = allPicked.has(p.id);
              const isSelected = !!selected.find((s) => s.id === p.id);
              return (
                <div
                  key={p.id}
                  className={`team-select-card ${isSelected ? 'selected' : ''} ${isPicked && !isSelected ? 'drafted' : ''}`}
                  onClick={() => {
                    if (!isMyDraftTurn || isPicked) return;
                    if (isSelected) {
                      // Only allow deselecting unconfirmed picks
                      if (!allPicked.has(p.id)) setSelected(selected.filter((s) => s.id !== p.id));
                    } else if (pendingPicks < neededPicks) {
                      setSelected([...selected, p]);
                    }
                  }}
                >
                  <img src={p.sprite} alt={p.name} />
                  <div className="team-select-card-name">{p.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- Blind mode ---
  const toggle = (p: Pokemon) => {
    if (selected.find((s) => s.id === p.id)) {
      setSelected(selected.filter((s) => s.id !== p.id));
    } else if (selected.length < teamSize) {
      setSelected([...selected, p]);
    }
  };

  const startBattle = async () => {
    const opponent = pickRandomFrom(teamSize, new Set(selected.map((p) => p.id)));
    startBattleWithTeams(selected, opponent);
  };

  const sorted = [...POKEMON].sort((a, b) => a.id - b.id);

  return (
    <div className="battle-mp-screen">
      <div className="battle-mp-team-header">
        <button className="battle-mp-back" onClick={() => setConfig(null)}>← Back</button>
        <h2>Pick Your Team ({selected.length}/{teamSize})</h2>
        {selected.length === teamSize && (
          <button className="team-select-go" onClick={startBattle} disabled={loading}>
            {loading ? '⏳ Simulating...' : '⚔️ Battle!'}
          </button>
        )}
      </div>
      <div className="team-select-chosen">
        {selected.map((p) => (
          <div key={p.id} className="team-select-chosen-card" onClick={() => toggle(p)}>
            <img src={p.sprite} alt={p.name} />
            <span>{p.name}</span>
          </div>
        ))}
        {Array.from({ length: teamSize - selected.length }).map((_, i) => (
          <div key={`empty-${i}`} className="team-select-chosen-card empty">?</div>
        ))}
      </div>
      <div className="team-select-scroll">
        <div className="team-select-grid">
          {sorted.map((p) => {
            const isSelected = !!selected.find((s) => s.id === p.id);
            return (
              <div
                key={p.id}
                className={`team-select-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggle(p)}
              >
                <img src={p.sprite} alt={p.name} />
                <div className="team-select-card-name">{p.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
