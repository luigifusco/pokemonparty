import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import BattleScene from '../components/BattleScene';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { calculateBattleEssence } from '@shared/essence';
import { getRecentTrainers, addRecentTrainer } from '../recentTrainers';
import type { Pokemon, PokemonInstance } from '@shared/types';
import type { BattleSnapshot, EloUpdate } from '@shared/battle-types';
import './DraftBattle.css';
import './BattleDemo.css';
import './BattleMultiplayer.css';

type Phase = 'challenge' | 'waiting' | 'draft' | 'battle';

interface DraftMultiplayerProps {
  playerName: string;
  collection: PokemonInstance[];
  essence: number;
  onGainEssence: (amount: number) => void;
  onEloUpdate: (newElo: number) => void;
}

export default function DraftMultiplayer({ playerName, collection, essence, onGainEssence, onEloUpdate }: DraftMultiplayerProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('challenge');
  const [targetName, setTargetName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [battleId, setBattleId] = useState('');
  const [challengers, setChallengers] = useState<string[]>([]);

  // Draft state
  const [myPosition, setMyPosition] = useState<1 | 2>(1);
  const [player1Picks, setPlayer1Picks] = useState<number[]>([]);
  const [player2Picks, setPlayer2Picks] = useState<number[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [picksNeeded, setPicksNeeded] = useState(1);
  const [myPhasePicks, setMyPhasePicks] = useState<Pokemon[]>([]);

  // Battle state
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(null);
  const [opponentTeamIds, setOpponentTeamIds] = useState<number[]>([]);
  const [rewarded, setRewarded] = useState(false);

  const isMyTurn = phase === 'draft' && currentPlayer === myPosition;
  const allPickedIds = new Set([...player1Picks, ...player2Picks]);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onConnect = () => socket.emit('player:identify', playerName);
    if (socket.connected) socket.emit('player:identify', playerName);
    socket.on('connect', onConnect);

    const onMatched = ({ battleId, opponent, yourPosition }: { battleId: string; opponent: string; yourPosition: 1 | 2 }) => {
      setBattleId(battleId);
      setOpponentName(opponent);
      setMyPosition(yourPosition);
      addRecentTrainer(playerName, opponent);
      setPhase('draft');
      setPlayer1Picks([]);
      setPlayer2Picks([]);
      setCurrentPlayer(1);
      setPicksNeeded(1);
      setMyPhasePicks([]);
    };

    const onWaiting = () => setPhase('waiting');

    const onChallenged = ({ challenger }: { challenger: string }) => {
      setChallengers((prev) => prev.includes(challenger) ? prev : [...prev, challenger]);
    };

    const onDraftUpdate = (data: {
      battleId: string;
      player1Picks: number[];
      player2Picks: number[];
      phase: number;
      currentPlayer: 1 | 2;
      picksNeeded: number;
    }) => {
      setPlayer1Picks(data.player1Picks);
      setPlayer2Picks(data.player2Picks);
      setCurrentPlayer(data.currentPlayer);
      setPicksNeeded(data.picksNeeded);
      setMyPhasePicks([]);
    };

    const onBattleStart = (data: {
      battleId: string;
      player1: string;
      player2: string;
      player1Team: number[];
      player2Team: number[];
      snapshot: BattleSnapshot;
    }) => {
      const isPlayer1 = data.player1 === playerName;
      const theirTeam = isPlayer1 ? data.player2Team : data.player1Team;
      setOpponentTeamIds(theirTeam);
      setSnapshot(data.snapshot);
      setBattleId(data.battleId);
      setPhase('battle');
    };

    const handleEloUpdate = (update: EloUpdate) => {
      const myNewElo = update.winnerName === playerName ? update.winnerNewElo : update.loserNewElo;
      onEloUpdate(myNewElo);
    };

    socket.on('draft:matched', onMatched);
    socket.on('draft:waiting', onWaiting);
    socket.on('draft:challenged', onChallenged);
    socket.on('draft:update', onDraftUpdate);
    socket.on('draft:start', onBattleStart);
    socket.on('draft:eloUpdate', handleEloUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('draft:matched', onMatched);
      socket.off('draft:waiting', onWaiting);
      socket.off('draft:challenged', onChallenged);
      socket.off('draft:update', onDraftUpdate);
      socket.off('draft:start', onBattleStart);
      socket.off('draft:eloUpdate', handleEloUpdate);
    };
  }, [playerName]);

  const handleChallenge = () => {
    if (!targetName.trim()) return;
    socket.emit('draft:challenge', targetName.trim());
  };

  const handleCancel = () => {
    socket.emit('draft:cancel');
    setPhase('challenge');
  };

  const togglePick = (p: Pokemon) => {
    if (!isMyTurn || allPickedIds.has(p.id)) return;

    if (myPhasePicks.find((s) => s.id === p.id)) {
      setMyPhasePicks(myPhasePicks.filter((s) => s.id !== p.id));
    } else if (myPhasePicks.length < picksNeeded) {
      setMyPhasePicks([...myPhasePicks, p]);
    }
  };

  const submitPicks = () => {
    if (myPhasePicks.length !== picksNeeded) return;
    socket.emit('draft:submitPicks', {
      battleId,
      picks: myPhasePicks.map((p) => p.id),
    });
    // Optimistically update local state
    if (myPosition === 1) {
      setPlayer1Picks((prev) => [...prev, ...myPhasePicks.map((p) => p.id)]);
    } else {
      setPlayer2Picks((prev) => [...prev, ...myPhasePicks.map((p) => p.id)]);
    }
    setMyPhasePicks([]);
    setCurrentPlayer(myPosition === 1 ? 2 : 1);
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
        <button className="battle-demo-back" onClick={() => navigate('/play')}>← Back to Menu</button>
      </div>
    );
  }

  // Draft phase
  if (phase === 'draft') {
    const myPicks = myPosition === 1 ? player1Picks : player2Picks;
    const opponentPicks = myPosition === 1 ? player2Picks : player1Picks;
    const pendingPickIds = new Set(myPhasePicks.map((p) => p.id));
    const allDrafted = new Set([...allPickedIds, ...pendingPickIds]);
    const sortedCollection = [...collection].sort((a, b) => a.pokemon.id - b.pokemon.id);

    let turnText = '';
    if (isMyTurn) {
      turnText = `Your turn — Pick ${picksNeeded} Pokémon`;
    } else {
      turnText = `Waiting for ${opponentName} to pick...`;
    }

    return (
      <div className="battle-mp-screen">
        <div className="battle-mp-team-header">
          <button className="battle-mp-back" onClick={() => navigate('/play')}>← Back</button>
          <h2>⚡ Draft Battle</h2>
          <div className="opponent-name">vs {opponentName}</div>
        </div>

        <div className="draft-turn-banner">
          <span className={!isMyTurn ? 'blink' : ''}>{turnText}</span>
        </div>

        <div className="draft-teams">
          <div className="draft-team-row">
            <span className="draft-team-label">You:</span>
            <div className="draft-team-slots">
              {myPicks.map((id) => {
                const p = POKEMON_BY_ID[id];
                return p ? (
                  <div key={id} className="team-select-chosen-card">
                    <img src={p.sprite} alt={p.name} />
                    <span>{p.name}</span>
                  </div>
                ) : null;
              })}
              {myPhasePicks.map((p) => (
                <div key={p.id} className="team-select-chosen-card draft-pending" onClick={() => togglePick(p)}>
                  <img src={p.sprite} alt={p.name} />
                  <span>{p.name}</span>
                </div>
              ))}
              {Array.from({ length: 3 - myPicks.length - myPhasePicks.length }).map((_, i) => (
                <div key={`em-${i}`} className="team-select-chosen-card empty">?</div>
              ))}
            </div>
          </div>
          <div className="draft-team-row">
            <span className="draft-team-label">{opponentName}:</span>
            <div className="draft-team-slots">
              {opponentPicks.map((id) => {
                const p = POKEMON_BY_ID[id];
                return p ? (
                  <div key={id} className="team-select-chosen-card">
                    <img src={p.sprite} alt={p.name} />
                    <span>{p.name}</span>
                  </div>
                ) : null;
              })}
              {Array.from({ length: 3 - opponentPicks.length }).map((_, i) => (
                <div key={`eo-${i}`} className="team-select-chosen-card empty">?</div>
              ))}
            </div>
          </div>
        </div>

        {isMyTurn && myPhasePicks.length === picksNeeded && (
          <div style={{ textAlign: 'center', padding: '4px' }}>
            <button className="team-select-go" onClick={submitPicks}>✓ Confirm</button>
          </div>
        )}

        <div className="team-select-scroll">
          <div className="team-select-grid">
            {sortedCollection.map((inst) => {
              const p = inst.pokemon;
              const isPicked = allDrafted.has(p.id);
              const isSelected = pendingPickIds.has(p.id);
              return (
                <div
                  key={inst.instanceId}
                  className={`team-select-card ${isSelected ? 'selected' : ''} ${isPicked && !isSelected ? 'drafted' : ''}`}
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

  // Challenge phase
  return (
    <div className="battle-mp-screen">
      <div className="battle-mp-header">
        <button className="battle-mp-back" onClick={() => navigate('/play')}>← Back</button>
        <h2>⚡ Draft Battle</h2>
      </div>
      <div className="battle-mp-content">
        {challengers.length > 0 && (
          <div className="battle-mp-challenged">
            ⚡ Draft challenge from: {challengers.join(', ')}
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
              ⚡ Challenge to Draft!
            </button>
          </>
        )}

        {phase === 'waiting' && (
          <>
            <div className="battle-mp-status waiting">
              Waiting for {targetName} to accept draft challenge...
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
