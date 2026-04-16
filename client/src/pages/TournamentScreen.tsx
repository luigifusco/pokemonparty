import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { BASE_PATH } from '../config';
import BattleScene from '../components/BattleScene';
import TeamSelectGrid from '../components/TeamSelectGrid';
import type { BattleSnapshot } from '@shared/battle-types';
import type { PokemonInstance } from '@shared/types';
import type { Tournament, TournamentSummary, TournamentMatch } from '@shared/tournament-types';
import './TournamentScreen.css';

const API = BASE_PATH;

interface TournamentScreenProps {
  playerName: string;
  collection: PokemonInstance[];
}

type Phase = 'list' | 'detail' | 'teamSelect' | 'waitingOpponent' | 'battle';

export default function TournamentScreen({ playerName, collection }: TournamentScreenProps) {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [phase, setPhase] = useState<Phase>('list');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(null);
  const [battleFinished, setBattleFinished] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch(API + '/api/tournaments');
      const data = await res.json();
      setTournaments(data.tournaments ?? []);
    } catch {}
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(API + '/api/tournament/' + id);
      const data = await res.json();
      setActiveTournament(data);
    } catch {}
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    const onUpdated = (summary: TournamentSummary) => {
      setTournaments(prev => {
        const idx = prev.findIndex(t => t.id === summary.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = summary; return next; }
        return [summary, ...prev];
      });
      if (activeTournament?.id === summary.id) fetchDetail(summary.id);
    };

    const onMatchReady = ({ tournamentId, matchId, opponent }: any) => {
      fetchDetail(tournamentId);
      setActiveMatchId(matchId);
      if (phase === 'detail' || phase === 'list') {
        // Stay on detail — user will see match ready
      }
    };

    const onBattleStart = ({ tournamentId, matchId, snapshot: snap }: any) => {
      setSnapshot(snap);
      setBattleFinished(false);
      setPhase('battle');
    };

    const onWaiting = () => setPhase('waitingOpponent');

    socket.on('tournament:updated', onUpdated);
    socket.on('tournament:matchReady', onMatchReady);
    socket.on('tournament:battleStart', onBattleStart);
    socket.on('tournament:waitingOpponent', onWaiting);

    return () => {
      socket.off('tournament:updated', onUpdated);
      socket.off('tournament:matchReady', onMatchReady);
      socket.off('tournament:battleStart', onBattleStart);
      socket.off('tournament:waitingOpponent', onWaiting);
    };
  }, [activeTournament, phase, fetchDetail]);

  const joinTournament = (id: string) => {
    socket.emit('tournament:join', id);
  };

  const leaveTournament = (id: string) => {
    socket.emit('tournament:leave', id);
  };

  const openDetail = (id: string) => {
    fetchDetail(id);
    setPhase('detail');
  };

  const findMyMatch = (): TournamentMatch | null => {
    if (!activeTournament) return null;
    return activeTournament.bracket.find(m =>
      m.status === 'active' && (m.player1 === playerName || m.player2 === playerName)
    ) ?? null;
  };

  const startTeamSelect = (matchId: string) => {
    setActiveMatchId(matchId);
    setSelected([]);
    setPhase('teamSelect');
  };

  const submitTeam = () => {
    if (!activeTournament || !activeMatchId) return;
    socket.emit('tournament:selectTeam', {
      tournamentId: activeTournament.id,
      matchId: activeMatchId,
      team: selected.map(idx => collection[idx].pokemon.id),
      heldItems: selected.map(idx => collection[idx].heldItem ?? null),
      moves: selected.map(idx => collection[idx].learnedMoves ?? null),
      abilities: selected.map(idx => collection[idx].ability ?? null),
    });
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const timeLeft = (ts: number) => {
    const diff = ts - Date.now();
    if (diff <= 0) return 'Expired';
    const min = Math.floor(diff / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    return min > 0 ? min + 'm ' + sec + 's' : sec + 's';
  };

  // ─── Battle View ───
  if (phase === 'battle' && snapshot) {
    return (
      <div style={{ position: 'relative', height: '100dvh' }}>
        <BattleScene snapshot={snapshot} turnDelayMs={1500} onFinished={() => setBattleFinished(true)} />
        {battleFinished && (
          <button className="tournament-continue-btn" onClick={() => {
            setSnapshot(null);
            setPhase('detail');
            if (activeTournament) fetchDetail(activeTournament.id);
          }}>
            {snapshot.winner === 'left' ? '🏆 You advance!' : '💀 Eliminated'}
          </button>
        )}
      </div>
    );
  }

  // ─── Waiting for Opponent ───
  if (phase === 'waitingOpponent') {
    return (
      <div className="tournament-screen">
        <div className="tournament-header">
          <button className="tournament-back" onClick={() => setPhase('detail')}>← Back</button>
          <h2>⏳ Waiting for opponent...</h2>
        </div>
        <div className="tournament-waiting">Your team is locked in. Waiting for your opponent to submit their team.</div>
      </div>
    );
  }

  // ─── Team Select ───
  if (phase === 'teamSelect' && activeTournament) {
    const teamSize = activeTournament.totalPokemon;
    const toggleSelect = (idx: number) => {
      if (selected.includes(idx)) setSelected(selected.filter(i => i !== idx));
      else if (selected.length < teamSize) setSelected([...selected, idx]);
    };
    return (
      <TeamSelectGrid
        instances={collection}
        selected={selected}
        onToggle={toggleSelect}
        teamSize={teamSize}
        onSubmit={selected.length === teamSize ? submitTeam : undefined}
        submitLabel="⚔️ Lock In!"
        headerLeft={<button className="battle-mp-back" onClick={() => setPhase('detail')}>← Back</button>}
        headerCenter={<span style={{ fontSize: 14, fontWeight: 'bold' }}>Tournament Match</span>}
      />
    );
  }

  // ─── Tournament Detail ───
  if (phase === 'detail' && activeTournament) {
    const t = activeTournament;
    const isParticipant = t.participants.includes(playerName);
    const myMatch = findMyMatch();
    const maxRound = Math.max(...t.bracket.map(m => m.round), 0);

    return (
      <div className="tournament-screen">
        <div className="tournament-header">
          <button className="tournament-back" onClick={() => { setPhase('list'); setActiveTournament(null); }}>← Back</button>
          <h2>🏆 {t.name}</h2>
        </div>

        <div className="tournament-detail-scroll">
          <div className="tournament-info-bar">
            <span className={'tournament-status-badge status-' + t.status}>{t.status}</span>
            <span>{t.fieldSize}v{t.fieldSize} · {t.totalPokemon} pkm</span>
            <span>{t.participants.length} players</span>
          </div>

          {t.status === 'registration' && (
            <div className="tournament-reg-info">
              <div>Registration closes: {formatTime(t.registrationEnd)}</div>
              {!isParticipant ? (
                <button className="tournament-join-btn" onClick={() => joinTournament(t.id)}>Join Tournament</button>
              ) : (
                <button className="tournament-leave-btn" onClick={() => leaveTournament(t.id)}>Leave</button>
              )}
              <div className="tournament-participants">
                {t.participants.map(p => <span key={p} className="tournament-participant">{p}</span>)}
              </div>
            </div>
          )}

          {myMatch && (
            <div className="tournament-my-match">
              <div className="tournament-my-match-title">⚔️ Your Match</div>
              <div className="tournament-my-match-info">
                vs <strong>{myMatch.player1 === playerName ? myMatch.player2 : myMatch.player1}</strong>
                {myMatch.deadline && <span className="tournament-deadline"> · {timeLeft(myMatch.deadline)} left</span>}
              </div>
              <button className="tournament-fight-btn" onClick={() => startTeamSelect(myMatch.id)}>
                Choose Team & Fight!
              </button>
            </div>
          )}

          {t.winner && (
            <div className="tournament-winner-banner">🏆 Winner: {t.winner}</div>
          )}

          {t.bracket.length > 0 && (
            <div className="tournament-bracket">
              {Array.from({ length: maxRound }, (_, i) => i + 1).map(round => (
                <div key={round} className="tournament-round">
                  <div className="tournament-round-title">
                    {round === maxRound ? 'Final' : round === maxRound - 1 ? 'Semifinal' : 'Round ' + round}
                  </div>
                  {t.bracket.filter(m => m.round === round).map(match => (
                    <div key={match.id} className={'tournament-match-card status-' + match.status}>
                      <div className={'tournament-match-player' + (match.winner === match.player1 ? ' winner' : '')}>
                        {match.player1 ?? 'TBD'}
                      </div>
                      <div className="tournament-match-vs">vs</div>
                      <div className={'tournament-match-player' + (match.winner === match.player2 ? ' winner' : '')}>
                        {match.player2 ?? 'TBD'}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Tournament List ───
  return (
    <div className="tournament-screen">
      <div className="tournament-header">
        <button className="tournament-back" onClick={() => navigate('/play')}>← Back</button>
        <h2>🏆 Tournaments</h2>
      </div>
      <div className="tournament-list">
        {tournaments.length === 0 && (
          <div className="tournament-empty">No tournaments right now. Check back later!</div>
        )}
        {tournaments.map(t => (
          <div key={t.id} className="tournament-card" onClick={() => openDetail(t.id)}>
            <div className="tournament-card-name">{t.name}</div>
            <div className="tournament-card-meta">
              <span className={'tournament-status-badge status-' + t.status}>{t.status}</span>
              <span>{t.fieldSize}v{t.fieldSize} · {t.totalPokemon} pkm</span>
              <span>{t.participantCount} players</span>
            </div>
            {t.winner && <div className="tournament-card-winner">🏆 {t.winner}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
