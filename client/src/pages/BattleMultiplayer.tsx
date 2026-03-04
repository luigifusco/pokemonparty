import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import BattleScene from '../components/BattleScene';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { calculateBattleEssence } from '@shared/essence';
import { getRecentTrainers, addRecentTrainer } from '../recentTrainers';
import type { Pokemon } from '@shared/types';
import type { BattleSnapshot, EloUpdate } from '@shared/battle-types';
import './BattleMultiplayer.css';
import '../pages/BattleDemo.css';

type Phase = 'challenge' | 'waiting' | 'teamSelect' | 'waitingTeam' | 'battle';

interface BattleMultiplayerProps {
  playerName: string;
  collection: Pokemon[];
  essence: number;
  onGainEssence: (amount: number) => void;
  onEloUpdate: (newElo: number) => void;
}

export default function BattleMultiplayer({ playerName, collection, essence, onGainEssence, onEloUpdate }: BattleMultiplayerProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('challenge');
  const [targetName, setTargetName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [battleId, setBattleId] = useState('');
  const [challengers, setChallengers] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]); // indices into collection
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(null);
  const [opponentTeamIds, setOpponentTeamIds] = useState<number[]>([]);
  const [rewarded, setRewarded] = useState(false);
  const [eloUpdate, setEloUpdate] = useState<EloUpdate | null>(null);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      socket.emit('player:identify', playerName);
    };

    if (socket.connected) {
      socket.emit('player:identify', playerName);
    }
    socket.on('connect', onConnect);

    const onMatched = ({ battleId, opponent }: { battleId: string; opponent: string }) => {
      setBattleId(battleId);
      setOpponentName(opponent);
      addRecentTrainer(playerName, opponent);
      setPhase('teamSelect');
    };

    const onWaiting = () => {
      setPhase('waiting');
    };

    const onChallenged = ({ challenger }: { challenger: string }) => {
      setChallengers((prev) => prev.includes(challenger) ? prev : [...prev, challenger]);
    };

    const onBattleStart = (data: { battleId: string; player1: string; player2: string; player1Team: number[]; player2Team: number[]; snapshot: BattleSnapshot }) => {
      const isPlayer1 = data.player1 === playerName;
      const theirTeam = isPlayer1 ? data.player2Team : data.player1Team;
      setOpponentTeamIds(theirTeam);

      setSnapshot(data.snapshot);
      setBattleId(data.battleId);
      setPhase('battle');
    };

    const onWaitingForOpponent = () => {
      setPhase('waitingTeam');
    };

    const handleEloUpdate = (update: EloUpdate) => {
      setEloUpdate(update);
      const myNewElo = update.winnerName === playerName ? update.winnerNewElo : update.loserNewElo;
      onEloUpdate(myNewElo);
    };

    socket.on('battle:matched', onMatched);
    socket.on('battle:waiting', onWaiting);
    socket.on('battle:challenged', onChallenged);
    socket.on('battle:start', onBattleStart);
    socket.on('battle:waitingForOpponent', onWaitingForOpponent);
    socket.on('battle:eloUpdate', handleEloUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('battle:matched', onMatched);
      socket.off('battle:waiting', onWaiting);
      socket.off('battle:challenged', onChallenged);
      socket.off('battle:start', onBattleStart);
      socket.off('battle:waitingForOpponent', onWaitingForOpponent);
      socket.off('battle:eloUpdate', handleEloUpdate);
    };
  }, [playerName, opponentName]);

  const handleChallenge = () => {
    if (!targetName.trim()) return;
    socket.emit('battle:challenge', targetName.trim());
  };

  const handleCancel = () => {
    socket.emit('battle:cancel');
    setPhase('challenge');
  };

  const togglePokemon = (idx: number) => {
    if (selected.includes(idx)) {
      setSelected(selected.filter((i) => i !== idx));
    } else if (selected.length < 3) {
      setSelected([...selected, idx]);
    }
  };

  const submitTeam = () => {
    socket.emit('battle:selectTeam', {
      battleId,
      team: selected.map((idx) => collection[idx].id),
    });
    setPhase('waitingTeam');
  };

  // Battle phase
  if (phase === 'battle' && snapshot) {
    const opponentPokemon = opponentTeamIds.map((id) => POKEMON_BY_ID[id]).filter(Boolean);
    const essenceGained = calculateBattleEssence(opponentPokemon);

    if (snapshot.winner === 'left' && !rewarded) {
      onGainEssence(essenceGained);
      setRewarded(true);
    }

    return (
      <div className="battle-demo-wrapper">
        <BattleScene snapshot={snapshot} turnDelayMs={2000} essenceGained={essenceGained} />
        {eloUpdate && (
          <div className="battle-elo-update">
            {eloUpdate.winnerName === playerName
              ? `📈 Elo: +${eloUpdate.winnerDelta} → ${eloUpdate.winnerNewElo}`
              : `📉 Elo: ${eloUpdate.loserDelta} → ${eloUpdate.loserNewElo}`}
          </div>
        )}
        <button className="battle-demo-back" onClick={() => navigate('/play')}>
          ← Back to Menu
        </button>
      </div>
    );
  }

  // Team selection phase
  if (phase === 'teamSelect' || phase === 'waitingTeam') {
    // Build sorted indices
    const indices = collection.map((_, i) => i).sort((a, b) => collection[a].id - collection[b].id);

    return (
      <div className="battle-mp-screen">
        <div className="battle-mp-team-header">
          <button className="battle-mp-back" onClick={() => navigate('/play')}>← Back</button>
          <h2>Pick Your Team ({selected.length}/3)</h2>
          <div className="opponent-name">vs {opponentName}</div>
        </div>
        {phase === 'waitingTeam' && (
          <div className="battle-mp-team-status">Waiting for opponent's team...</div>
        )}
        {phase === 'teamSelect' && (
          <>
            <div className="team-select-chosen" style={{ padding: '4px 8px' }}>
              {selected.map((idx) => {
                const p = collection[idx];
                return (
                  <div key={idx} className="team-select-chosen-card" onClick={() => togglePokemon(idx)}>
                    <img src={p.sprite} alt={p.name} />
                    <span>{p.name}</span>
                  </div>
                );
              })}
              {Array.from({ length: 3 - selected.length }).map((_, i) => (
                <div key={`empty-${i}`} className="team-select-chosen-card empty">?</div>
              ))}
            </div>
            {selected.length === 3 && (
              <div style={{ textAlign: 'center', padding: '4px' }}>
                <button className="team-select-go" onClick={submitTeam}>⚔️ Lock In!</button>
              </div>
            )}
          </>
        )}
        <div className="team-select-scroll">
          <div className="team-select-grid">
            {indices.map((idx) => {
              const p = collection[idx];
              const isSelected = selected.includes(idx);
              return (
                <div
                  key={idx}
                  className={`team-select-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => phase === 'teamSelect' && togglePokemon(idx)}
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

  // Challenge phase
  return (
    <div className="battle-mp-screen">
      <div className="battle-mp-header">
        <button className="battle-mp-back" onClick={() => navigate('/play')}>← Back</button>
        <h2>⚔️ Battle</h2>
      </div>
      <div className="battle-mp-content">
        {challengers.length > 0 && (
          <div className="battle-mp-challenged">
            ⚡ Challenged by: {challengers.join(', ')}
          </div>
        )}

        {phase === 'challenge' && (
          <>
            {getRecentTrainers(playerName).length > 0 && (
              <div className="recent-trainers">
                {getRecentTrainers(playerName).map((name) => (
                  <button key={name} className="recent-trainer-btn" onClick={() => setTargetName(name)}>
                    {name}
                  </button>
                ))}
              </div>
            )}
            <input
              className="battle-mp-input"
              type="text"
              placeholder="Opponent's name"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChallenge()}
              maxLength={20}
            />
            <button
              className="battle-mp-btn"
              onClick={handleChallenge}
              disabled={!targetName.trim()}
            >
              ⚔️ Challenge!
            </button>
          </>
        )}

        {phase === 'waiting' && (
          <>
            <div className="battle-mp-status waiting">
              Waiting for {targetName} to challenge you back...
            </div>
            <button className="battle-mp-btn" onClick={handleCancel}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
