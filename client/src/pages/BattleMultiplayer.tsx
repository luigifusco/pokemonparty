import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import BattleScene from '../components/BattleScene';
import BattleConfigScreen from '../components/BattleConfigScreen';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { calculateBattleEssence } from '@shared/essence';
import { useOnlinePlayers } from '../useOnlinePlayers';
import Avatar from '../components/Avatar';
import type { PokemonInstance } from '@shared/types';
import { getEffectiveMoves } from '@shared/types';
import type { BattleSnapshot, BattleConfig, EloUpdate } from '@shared/battle-types';
import { DEFAULT_BATTLE_CONFIG } from '@shared/battle-types';
import { getHeldItemSprite, getHeldItemName } from '@shared/held-item-data';
import PokemonIcon from '../components/PokemonIcon';
import TeamSelectGrid from '../components/TeamSelectGrid';
import { CHARACTER_UNLOCK_CHAPTER } from '@shared/story-data';
import { useStoryChapters } from '../hooks/useStoryChapters';
import './BattleMultiplayer.css';
import '../pages/BattleDemo.css';

type Phase = 'config' | 'challenge' | 'waiting' | 'teamSelect' | 'waitingTeam' | 'battle';

interface BattleMultiplayerProps {
  playerName: string;
  collection: PokemonInstance[];
  essence: number;
  onGainEssence: (amount: number) => void;
  onEloUpdate: (newElo: number) => void;
  recentPokemonIds?: number[];
  onUpdateRecentPokemonIds?: (ids: number[]) => void;
  playerId?: string;
}

export default function BattleMultiplayer({ playerName, collection, essence, onGainEssence, onEloUpdate, recentPokemonIds, onUpdateRecentPokemonIds, playerId }: BattleMultiplayerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const chapters = useStoryChapters(playerId);
  const characterPickUnlocked = chapters.has(CHARACTER_UNLOCK_CHAPTER);
  const autoChallenge = (location.state as any)?.autoChallenge as string | undefined;
  const onlinePlayers = useOnlinePlayers(playerName);
  const [config, setConfig] = useState<BattleConfig>(DEFAULT_BATTLE_CONFIG);
  const [phase, setPhase] = useState<Phase>(autoChallenge ? 'challenge' : 'config');
  const [targetName, setTargetName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [battleId, setBattleId] = useState('');
  const [teamSize, setTeamSize] = useState(3);
  const [challengers, setChallengers] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<(string | null)[]>([]);
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(null);
  const [bondAwards, setBondAwards] = useState<{ instanceId: string; delta: number; total: number }[]>([]);
  const [opponentTeamIds, setOpponentTeamIds] = useState<number[]>([]);
  const [rewarded, setRewarded] = useState(false);
  const [battleFinished, setBattleFinished] = useState(false);

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

    const onMatched = ({ battleId, opponent, fieldSize, totalPokemon }: { battleId: string; opponent: string; fieldSize?: number; totalPokemon?: number }) => {
      setBattleId(battleId);
      setOpponentName(opponent);
      if (totalPokemon) setTeamSize(totalPokemon);
      if (fieldSize) setConfig((prev) => ({ ...prev, fieldSize: fieldSize as 2 | 3, totalPokemon: totalPokemon ?? prev.totalPokemon }));
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
      const myNewElo = update.winnerName === playerName ? update.winnerNewElo : update.loserNewElo;
      onEloUpdate(myNewElo);
    };

    const onBondAwards = ({ awards }: { awards: Array<{ instanceId: string; delta: number; total: number }> }) => {
      if (Array.isArray(awards) && awards.length > 0) setBondAwards(awards);
    };

    socket.on('battle:matched', onMatched);
    socket.on('battle:waiting', onWaiting);
    socket.on('battle:challenged', onChallenged);
    socket.on('battle:start', onBattleStart);
    socket.on('battle:waitingForOpponent', onWaitingForOpponent);
    socket.on('battle:eloUpdate', handleEloUpdate);
    socket.on('battle:bondUpdate', onBondAwards);

    return () => {
      socket.off('connect', onConnect);
      socket.off('battle:matched', onMatched);
      socket.off('battle:waiting', onWaiting);
      socket.off('battle:challenged', onChallenged);
      socket.off('battle:start', onBattleStart);
      socket.off('battle:waitingForOpponent', onWaitingForOpponent);
      socket.off('battle:eloUpdate', handleEloUpdate);
      socket.off('battle:bondUpdate', onBondAwards);
    };
  }, [playerName, opponentName]);

  // Auto-challenge when accepting a notification
  useEffect(() => {
    if (autoChallenge && phase === 'challenge') {
      setTargetName(autoChallenge);
      socket.emit('battle:challenge', { target: autoChallenge, fieldSize: config.fieldSize, totalPokemon: config.totalPokemon });
      window.history.replaceState({}, '');
    }
  }, [autoChallenge]);

  const handleChallenge = () => {
    if (!targetName.trim()) return;
    socket.emit('battle:challenge', { target: targetName.trim(), fieldSize: config.fieldSize, totalPokemon: config.totalPokemon });
  };

  const challengePlayer = (name: string) => {
    setTargetName(name);
    socket.emit('battle:challenge', { target: name, fieldSize: config.fieldSize, totalPokemon: config.totalPokemon });
  };

  const handleCancel = () => {
    socket.emit('battle:cancel');
    setPhase('challenge');
  };

  const togglePokemon = (idx: number, character?: string | null) => {
    const i = selected.indexOf(idx);
    if (i !== -1) {
      setSelected(selected.filter((_, k) => k !== i));
      setSelectedCharacters(selectedCharacters.filter((_, k) => k !== i));
    } else if (selected.length < teamSize) {
      setSelected([...selected, idx]);
      setSelectedCharacters([...selectedCharacters, character ?? null]);
    }
  };

  const submitTeam = () => {
    const teamPokemonIds = selected.map((idx) => collection[idx].pokemon.id);
    const teamInstanceIds = selected.map((idx) => collection[idx].instanceId);
    socket.emit('battle:selectTeam', {
      battleId,
      team: teamPokemonIds,
      instanceIds: teamInstanceIds,
      heldItems: selected.map((idx) => collection[idx].heldItem ?? null),
      moves: selected.map((idx) => {
        const inst = collection[idx];
        return inst.learnedMoves ?? null;
      }),
      abilities: selected.map((idx) => collection[idx].ability ?? null),
      characters: selected.map((idx, i) => selectedCharacters[i] ?? collection[idx].character ?? null),
    });
    // Optimistically update recent pokemon with the just-submitted team
    if (onUpdateRecentPokemonIds && recentPokemonIds) {
      const merged = [...new Set([...teamPokemonIds, ...recentPokemonIds])];
      onUpdateRecentPokemonIds(merged);
    }
    setPhase('waitingTeam');
  };

  // Config phase
  if (phase === 'config') {
    return (
      <BattleConfigScreen
        onConfirm={(c) => {
          setConfig(c);
          setTeamSize(c.totalPokemon);
          setPhase('challenge');
        }}
        onBack={() => navigate('/play')}
      />
    );
  }

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
        <BattleScene
          snapshot={snapshot}
          turnDelayMs={2000}
          essenceGained={snapshot.winner === 'left' ? essenceGained : undefined}
          bondAwards={bondAwards}
          onFinished={() => setBattleFinished(true)}
          onContinue={battleFinished ? () => navigate('/play') : undefined}
          continueLabel={snapshot.winner === 'left' ? 'Claim Rewards' : 'Back to Menu'}
        />
      </div>
    );
  }

  // Team selection phase
  if (phase === 'teamSelect' || phase === 'waitingTeam') {
    return (
      <TeamSelectGrid
        instances={collection}
        selected={selected}
        onToggle={(idx, ch) => phase === 'teamSelect' && togglePokemon(idx, ch)}
        teamSize={teamSize}
        disabled={phase === 'waitingTeam'}
        onSubmit={selected.length === teamSize ? submitTeam : undefined}
        submitLabel="Lock In!"
        recentPokemonIds={recentPokemonIds}
        enableCharacterPick={characterPickUnlocked}
        selectedCharacters={selectedCharacters}
        onBack={() => navigate('/play')}
        title="Pick Your Team"
        opponent={{ name: opponentName }}
        aboveGrid={phase === 'waitingTeam' ? (
          <div className="battle-mp-team-status">Waiting for opponent's team...</div>
        ) : undefined}
      />
    );
  }

  // Challenge phase
  return (
    <div className="battle-mp-screen">
      <div className="battle-mp-header">
        <button className="battle-mp-back" onClick={() => setPhase('config')}>← Back</button>
        <h2>Battle ({config.fieldSize}v{config.fieldSize}, {config.totalPokemon} total)</h2>
      </div>
      <div className="battle-mp-content">
        {challengers.length > 0 && (
          <div className="battle-mp-challenged">
            Challenged by: {challengers.join(', ')}
          </div>
        )}

        {phase === 'challenge' && (
          <>
            {onlinePlayers.length > 0 && (
              <div className="online-players-section">
                <div className="online-players-label">Online — tap to challenge</div>
                <div className="online-players-grid">
                  {onlinePlayers.map((p) => (
                    <button
                      key={p.name}
                      className="online-player-card"
                      onClick={() => challengePlayer(p.name)}
                      title={`Challenge ${p.name}`}
                    >
                      <Avatar name={p.name} picture={p.picture} className="online-player-avatar" />
                      <span className="online-player-name">{p.name}</span>
                    </button>
                  ))}
                </div>
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
              Challenge!
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
