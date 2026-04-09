import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { useOnlinePlayers } from '../useOnlinePlayers';
import type { PokemonInstance } from '@shared/types';
import { randomNature, randomIVs } from '@shared/natures';
import './TradeScreen.css';
import '../pages/BattleDemo.css';

type Phase = 'request' | 'waiting' | 'selectPokemon' | 'waitingPartner' | 'confirm' | 'waitingConfirm' | 'animation';

interface TradeScreenProps {
  playerName: string;
  collection: PokemonInstance[];
  onTrade: (give: PokemonInstance, receive: PokemonInstance) => void;
}

export default function TradeScreen({ playerName, collection, onTrade }: TradeScreenProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const autoChallenge = (location.state as any)?.autoChallenge as string | undefined;
  const onlinePlayers = useOnlinePlayers(playerName);
  const [phase, setPhase] = useState<Phase>('request');
  const [targetName, setTargetName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [tradeId, setTradeId] = useState('');
  const [incomingFrom, setIncomingFrom] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [myPokemonId, setMyPokemonId] = useState<number | null>(null);
  const [theirPokemonId, setTheirPokemonId] = useState<number | null>(null);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    const onConnect = () => socket.emit('player:identify', playerName);
    if (socket.connected) socket.emit('player:identify', playerName);
    socket.on('connect', onConnect);

    const onMatched = ({ tradeId, partner }: { tradeId: string; partner: string }) => {
      setTradeId(tradeId);
      setPartnerName(partner);
      setPhase('selectPokemon');
    };

    const onWaiting = () => setPhase('waiting');

    const onIncoming = ({ from }: { from: string }) => {
      setIncomingFrom((prev) => prev.includes(from) ? prev : [...prev, from]);
    };

    const onBothSelected = ({ player1Pokemon, player2Pokemon }: { tradeId: string; player1Pokemon: number; player2Pokemon: number }) => {
      // Figure out which is mine
      // The server sets player1 = whoever initiated first, we need to check
      // We stored our selection, so the other one is theirs
      if (myPokemonId === player1Pokemon) {
        setTheirPokemonId(player2Pokemon);
      } else if (myPokemonId === player2Pokemon) {
        setTheirPokemonId(player1Pokemon);
      } else {
        // We might not have set myPokemonId yet via state, use the one that matches
        setMyPokemonId(player1Pokemon);
        setTheirPokemonId(player2Pokemon);
      }
      setPhase('confirm');
    };

    const onWaitingForPartner = () => setPhase('waitingPartner');
    const onWaitingConfirm = () => setPhase('waitingConfirm');

    const onExecute = ({ player1, player1Pokemon, player2Pokemon }: { tradeId: string; player1: string; player2: string; player1Pokemon: number; player2Pokemon: number }) => {
      const isPlayer1 = player1 === playerName;
      const givePokemonId = isPlayer1 ? player1Pokemon : player2Pokemon;
      const receivePokemonId = isPlayer1 ? player2Pokemon : player1Pokemon;
      setMyPokemonId(givePokemonId);
      setTheirPokemonId(receivePokemonId);
      setPhase('animation');

      setTimeout(() => {
        const giveInst = collection.find((inst) => inst.pokemon.id === givePokemonId);
        const receivePokemon = POKEMON_BY_ID[receivePokemonId];
        if (giveInst && receivePokemon) {
          const receiveInst: PokemonInstance = {
            instanceId: crypto.randomUUID(),
            pokemon: receivePokemon,
            ivs: randomIVs(),
            nature: randomNature(),
            ability: '',
          };
          onTrade(giveInst, receiveInst);
        }
      }, 2000);
    };

    socket.on('trade:matched', onMatched);
    socket.on('trade:waiting', onWaiting);
    socket.on('trade:incoming', onIncoming);
    socket.on('trade:bothSelected', onBothSelected);
    socket.on('trade:waitingForPartner', onWaitingForPartner);
    socket.on('trade:waitingConfirm', onWaitingConfirm);
    socket.on('trade:execute', onExecute);

    return () => {
      socket.off('connect', onConnect);
      socket.off('trade:matched', onMatched);
      socket.off('trade:waiting', onWaiting);
      socket.off('trade:incoming', onIncoming);
      socket.off('trade:bothSelected', onBothSelected);
      socket.off('trade:waitingForPartner', onWaitingForPartner);
      socket.off('trade:waitingConfirm', onWaitingConfirm);
      socket.off('trade:execute', onExecute);
    };
  }, [playerName, myPokemonId]);

  // Auto-request when accepting a notification
  useEffect(() => {
    if (autoChallenge && phase === 'request') {
      setTargetName(autoChallenge);
      socket.emit('trade:request', autoChallenge);
      window.history.replaceState({}, '');
    }
  }, [autoChallenge]);

  const handleRequest = () => {
    if (!targetName.trim()) return;
    socket.emit('trade:request', targetName.trim());
  };

  const handleCancel = () => {
    socket.emit('trade:cancel');
    setPhase('request');
  };

  const handleSelectPokemon = () => {
    if (selectedIdx === null) return;
    const inst = collection[selectedIdx];
    setMyPokemonId(inst.pokemon.id);
    socket.emit('trade:selectPokemon', { tradeId, pokemonId: inst.pokemon.id });
  };

  const handleConfirm = () => {
    socket.emit('trade:confirm', { tradeId });
  };

  const myPokemon = myPokemonId !== null ? POKEMON_BY_ID[myPokemonId] : null;
  const theirPokemon = theirPokemonId !== null ? POKEMON_BY_ID[theirPokemonId] : null;

  // Animation phase
  if (phase === 'animation' && myPokemon && theirPokemon) {
    return (
      <div className="trade-overlay">
        <div className="trade-animation">
          <div className="trade-anim-card outgoing">
            <img src={myPokemon.sprite} alt={myPokemon.name} />
            <div className="name">{myPokemon.name}</div>
          </div>
          <div className="trade-anim-arrows">⇄</div>
          <div className="trade-anim-card incoming">
            <img src={theirPokemon.sprite} alt={theirPokemon.name} />
            <div className="name">{theirPokemon.name}</div>
          </div>
        </div>
        <div className="trade-anim-text">Trade complete!</div>
        <div className="trade-anim-received">You received {theirPokemon.name}!</div>
        <button className="trade-anim-close" onClick={() => navigate('/play')}>OK</button>
      </div>
    );
  }

  // Confirm phase
  if (phase === 'confirm' || phase === 'waitingConfirm') {
    return (
      <div className="trade-screen">
        <div className="trade-header">
          <h2>Confirm Trade</h2>
        </div>
        <div className="trade-content">
          <div className="trade-confirm-view">
            <div className="trade-confirm-card">
              <div className="label">You give</div>
              {myPokemon && (
                <>
                  <img src={myPokemon.sprite} alt={myPokemon.name} />
                  <div className="name">{myPokemon.name}</div>
                </>
              )}
            </div>
            <div className="trade-confirm-arrow">⇄</div>
            <div className="trade-confirm-card">
              <div className="label">You get</div>
              {theirPokemon && (
                <>
                  <img src={theirPokemon.sprite} alt={theirPokemon.name} />
                  <div className="name">{theirPokemon.name}</div>
                </>
              )}
            </div>
          </div>
          {phase === 'confirm' && (
            <button className="trade-btn confirm" onClick={handleConfirm}>
              ✅ Confirm Trade
            </button>
          )}
          {phase === 'waitingConfirm' && (
            <div className="trade-status waiting">Waiting for {partnerName} to confirm...</div>
          )}
        </div>
      </div>
    );
  }

  // Select pokemon phase
  if (phase === 'selectPokemon' || phase === 'waitingPartner') {
    const indices = collection.map((_, i) => i).sort((a, b) => collection[a].pokemon.id - collection[b].pokemon.id);

    return (
      <div className="trade-screen">
        <div className="trade-header">
          <h2>Trade with {partnerName}</h2>
        </div>
        <div style={{ padding: '8px 12px', textAlign: 'center' }}>
          {phase === 'waitingPartner' ? (
            <div className="trade-status waiting">Waiting for {partnerName} to pick...</div>
          ) : (
            <div className="trade-select-label">Select a Pokémon to trade</div>
          )}
        </div>
        {selectedIdx !== null && phase === 'selectPokemon' && (
          <div style={{ textAlign: 'center', padding: '8px' }}>
            <div className="trade-selected-pokemon" style={{ display: 'inline-flex' }}>
              <img src={collection[selectedIdx].pokemon.sprite} alt={collection[selectedIdx].pokemon.name} />
              <div className="name">{collection[selectedIdx].pokemon.name}</div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <button className="trade-btn" onClick={handleSelectPokemon} style={{ maxWidth: '200px' }}>
                Offer this Pokémon
              </button>
            </div>
          </div>
        )}
        <div className="team-select-grid" style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {indices.map((idx) => {
            const p = collection[idx].pokemon;
            const isSelected = selectedIdx === idx;
            return (
              <div
                key={idx}
                className={`team-select-card ${isSelected ? 'selected' : ''}`}
                onClick={() => phase === 'selectPokemon' && setSelectedIdx(idx)}
              >
                <img src={p.sprite} alt={p.name} />
                <div className="team-select-card-name">{p.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Request phase
  return (
    <div className="trade-screen">
      <div className="trade-header">
        <button className="trade-back" onClick={() => navigate('/play')}>← Back</button>
        <h2>🔄 Trade</h2>
      </div>
      <div className="trade-content">
        {incomingFrom.length > 0 && (
          <div className="trade-incoming">
            🔄 Trade request from: {incomingFrom.join(', ')}
          </div>
        )}

        {phase === 'request' && (
          <>
            {onlinePlayers.length > 0 && (
              <div className="online-players-section">
                <div className="online-players-label">🟢 Online</div>
                <div className="recent-trainers">
                  {onlinePlayers.map((name) => (
                    <button key={name} className="recent-trainer-btn" onClick={() => setTargetName(name)}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <input
              className="trade-input"
              type="text"
              placeholder="Partner's name"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRequest()}
              maxLength={20}
            />
            <button
              className="trade-btn"
              onClick={handleRequest}
              disabled={!targetName.trim()}
            >
              🔄 Request Trade
            </button>
          </>
        )}

        {phase === 'waiting' && (
          <>
            <div className="trade-status waiting">
              Waiting for {targetName} to accept...
            </div>
            <button className="trade-btn" onClick={handleCancel}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}
