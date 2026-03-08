import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BattleScene from '../components/BattleScene';
import type { BattleSnapshot } from '@shared/battle-types';
import { POKEMON } from '@shared/pokemon-data';
import { calculateBattleEssence } from '@shared/essence';
import type { Pokemon } from '@shared/types';
import './DraftBattle.css';
import './BattleDemo.css';
import './BattleMultiplayer.css';

const API_BASE = '/pokemonparty';

const DRAFT_SCHEDULE: { who: 'player' | 'ai'; picks: number }[] = [
  { who: 'player', picks: 1 },
  { who: 'ai', picks: 2 },
  { who: 'player', picks: 2 },
  { who: 'ai', picks: 1 },
];

interface DraftBattleProps {
  essence: number;
  onGainEssence: (amount: number) => void;
}

export default function DraftBattle({ essence, onGainEssence }: DraftBattleProps) {
  const navigate = useNavigate();
  const [playerTeam, setPlayerTeam] = useState<Pokemon[]>([]);
  const [aiTeam, setAiTeam] = useState<Pokemon[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phasePicks, setPhasePicks] = useState<Pokemon[]>([]);
  const [pickedIds, setPickedIds] = useState<Set<number>>(new Set());
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(null);
  const [rewarded, setRewarded] = useState(false);
  const [loading, setLoading] = useState(false);

  const draftDone = phaseIndex >= DRAFT_SCHEDULE.length;
  const currentPhase = draftDone ? null : DRAFT_SCHEDULE[phaseIndex];
  const isPlayerTurn = currentPhase?.who === 'player';
  const aiThinking = currentPhase?.who === 'ai';

  // AI auto-pick
  useEffect(() => {
    if (draftDone || !currentPhase || currentPhase.who !== 'ai') return;

    const timer = setTimeout(() => {
      const available = POKEMON.filter((p) => !pickedIds.has(p.id));
      const picks: Pokemon[] = [];
      const newPickedIds = new Set(pickedIds);

      for (let i = 0; i < currentPhase.picks && available.length > 0; i++) {
        const idx = Math.floor(Math.random() * available.length);
        const pick = available.splice(idx, 1)[0];
        picks.push(pick);
        newPickedIds.add(pick.id);
      }

      setAiTeam((prev) => [...prev, ...picks]);
      setPickedIds(newPickedIds);
      setPhaseIndex((prev) => prev + 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [phaseIndex, pickedIds]);

  // Auto-start battle when draft complete
  useEffect(() => {
    if (!draftDone || snapshot || loading) return;
    if (playerTeam.length !== 3 || aiTeam.length !== 3) return;

    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/battle/simulate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leftTeam: playerTeam.map((p) => p.id),
            rightTeam: aiTeam.map((p) => p.id),
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
    run();
  }, [draftDone, playerTeam, aiTeam, snapshot, loading]);

  const togglePick = (p: Pokemon) => {
    if (!isPlayerTurn || pickedIds.has(p.id)) return;

    if (phasePicks.find((s) => s.id === p.id)) {
      setPhasePicks(phasePicks.filter((s) => s.id !== p.id));
    } else if (phasePicks.length < (currentPhase?.picks ?? 0)) {
      setPhasePicks([...phasePicks, p]);
    }
  };

  const confirmPicks = () => {
    if (!currentPhase || phasePicks.length !== currentPhase.picks) return;
    const newPickedIds = new Set(pickedIds);
    for (const p of phasePicks) newPickedIds.add(p.id);
    setPlayerTeam((prev) => [...prev, ...phasePicks]);
    setPickedIds(newPickedIds);
    setPhasePicks([]);
    setPhaseIndex((prev) => prev + 1);
  };

  const resetDraft = () => {
    setSnapshot(null);
    setPlayerTeam([]);
    setAiTeam([]);
    setPickedIds(new Set());
    setPhaseIndex(0);
    setPhasePicks([]);
    setRewarded(false);
    setLoading(false);
  };

  // Battle result
  if (snapshot) {
    const essenceGained = calculateBattleEssence(aiTeam);
    if (snapshot.winner === 'left' && !rewarded) {
      onGainEssence(essenceGained);
      setRewarded(true);
    }
    return (
      <div className="battle-demo-wrapper">
        <BattleScene snapshot={snapshot} turnDelayMs={2000} essenceGained={essenceGained} />
        <button className="battle-demo-back" onClick={resetDraft}>← New Draft</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="battle-mp-screen">
        <div className="draft-loading">⏳ Simulating battle...</div>
      </div>
    );
  }

  const sorted = [...POKEMON].sort((a, b) => a.id - b.id);

  let turnText = '';
  if (aiThinking) {
    turnText = '🤖 AI is picking...';
  } else if (isPlayerTurn && currentPhase) {
    turnText = `Your turn — Pick ${currentPhase.picks} Pokémon`;
  } else if (draftDone) {
    turnText = 'Draft complete! Starting battle...';
  }

  return (
    <div className="battle-mp-screen">
      <div className="battle-mp-team-header">
        <button className="battle-mp-back" onClick={() => navigate('/play')}>← Back</button>
        <h2>⚡ Draft vs AI</h2>
      </div>

      <div className="draft-turn-banner">
        <span className={aiThinking ? 'blink' : ''}>{turnText}</span>
      </div>

      <div className="draft-teams">
        <div className="draft-team-row">
          <span className="draft-team-label">You:</span>
          <div className="draft-team-slots">
            {playerTeam.map((p) => (
              <div key={p.id} className="team-select-chosen-card">
                <img src={p.sprite} alt={p.name} />
                <span>{p.name}</span>
              </div>
            ))}
            {phasePicks.map((p) => (
              <div key={p.id} className="team-select-chosen-card draft-pending" onClick={() => togglePick(p)}>
                <img src={p.sprite} alt={p.name} />
                <span>{p.name}</span>
              </div>
            ))}
            {Array.from({ length: 3 - playerTeam.length - phasePicks.length }).map((_, i) => (
              <div key={`ep-${i}`} className="team-select-chosen-card empty">?</div>
            ))}
          </div>
        </div>
        <div className="draft-team-row">
          <span className="draft-team-label">AI:</span>
          <div className="draft-team-slots">
            {aiTeam.map((p) => (
              <div key={p.id} className="team-select-chosen-card">
                <img src={p.sprite} alt={p.name} />
                <span>{p.name}</span>
              </div>
            ))}
            {Array.from({ length: 3 - aiTeam.length }).map((_, i) => (
              <div key={`ea-${i}`} className="team-select-chosen-card empty">?</div>
            ))}
          </div>
        </div>
      </div>

      {isPlayerTurn && currentPhase && phasePicks.length === currentPhase.picks && (
        <div style={{ textAlign: 'center', padding: '4px' }}>
          <button className="team-select-go" onClick={confirmPicks}>✓ Confirm</button>
        </div>
      )}

      <div className="team-select-scroll">
        <div className="team-select-grid">
          {sorted.map((p) => {
            const isPicked = pickedIds.has(p.id);
            const isSelected = !!phasePicks.find((s) => s.id === p.id);
            return (
              <div
                key={p.id}
                className={`team-select-card ${isSelected ? 'selected' : ''} ${isPicked ? 'drafted' : ''}`}
                onClick={() => togglePick(p)}
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
