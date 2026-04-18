import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { BASE_PATH } from '../config';
import BattleScene from '../components/BattleScene';
import TeamSelectGrid from '../components/TeamSelectGrid';
import type { BattleSnapshot } from '@shared/battle-types';
import type { PokemonInstance } from '@shared/types';
import type { Tournament, TournamentSummary, TournamentMatch, FrozenPokemon } from '@shared/tournament-types';
import { CHARACTER_UNLOCK_CHAPTER } from '@shared/story-data';
import { useStoryChapters } from '../hooks/useStoryChapters';
import './TournamentScreen.css';

const API = BASE_PATH;

interface TournamentScreenProps {
  playerName: string;
  collection: PokemonInstance[];
  playerId?: string;
}

type Phase = 'list' | 'detail' | 'lockTeam' | 'teamSelect' | 'waitingOpponent' | 'battle';

export default function TournamentScreen({ playerName, collection, playerId }: TournamentScreenProps) {
  const navigate = useNavigate();
  const chapters = useStoryChapters(playerId);
  const characterPickUnlocked = chapters.has(CHARACTER_UNLOCK_CHAPTER);
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [phase, setPhase] = useState<Phase>('list');
  const [teamLocked, setTeamLocked] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<(string | null)[]>([]);
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(null);
  const [battleFinished, setBattleFinished] = useState(false);
  const [viewingTeamOf, setViewingTeamOf] = useState<string | null>(null);

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
    const onTeamLocked = () => setTeamLocked(true);

    socket.on('tournament:updated', onUpdated);
    socket.on('tournament:matchReady', onMatchReady);
    socket.on('tournament:battleStart', onBattleStart);
    socket.on('tournament:waitingOpponent', onWaiting);
    socket.on('tournament:teamLocked', onTeamLocked);

    return () => {
      socket.off('tournament:updated', onUpdated);
      socket.off('tournament:matchReady', onMatchReady);
      socket.off('tournament:battleStart', onBattleStart);
      socket.off('tournament:waitingOpponent', onWaiting);
      socket.off('tournament:teamLocked', onTeamLocked);
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
    setSelectedCharacters([]);
    // For fixed-team tournaments, skip team select — auto-submit with frozen team
    if (activeTournament?.fixedTeam) {
      socket.emit('tournament:selectTeam', {
        tournamentId: activeTournament.id,
        matchId,
        team: [], heldItems: [], moves: [], abilities: [],
      });
      return;
    }
    setPhase('teamSelect');
  };

  const submitTeam = () => {
    if (!activeTournament || !activeMatchId) return;
    socket.emit('tournament:selectTeam', {
      tournamentId: activeTournament.id,
      matchId: activeMatchId,
      team: selected.map(idx => collection[idx].pokemon.id),
      instanceIds: selected.map(idx => collection[idx].instanceId),
      heldItems: selected.map(idx => collection[idx].heldItem ?? null),
      moves: selected.map(idx => collection[idx].learnedMoves ?? null),
      abilities: selected.map(idx => collection[idx].ability ?? null),
      characters: selected.map((idx, i) => selectedCharacters[i] ?? collection[idx].character ?? null),
    });
  };

  const submitLockedTeam = () => {
    if (!activeTournament) return;
    const frozen: FrozenPokemon[] = selected.map((idx, i) => {
      const inst = collection[idx];
      return {
        pokemonId: inst.pokemon.id,
        name: inst.pokemon.name,
        sprite: inst.pokemon.sprite,
        heldItem: inst.heldItem ?? null,
        moves: inst.learnedMoves ?? inst.pokemon.moves as [string, string],
        ability: inst.ability ?? null,
        character: selectedCharacters[i] ?? inst.character ?? null,
      };
    });
    socket.emit('tournament:lockTeam', { tournamentId: activeTournament.id, team: frozen });
    setPhase('detail');
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
        <BattleScene
          snapshot={snapshot}
          turnDelayMs={1500}
          onFinished={() => setBattleFinished(true)}
          onContinue={battleFinished ? () => {
            setSnapshot(null);
            setPhase('detail');
            if (activeTournament) fetchDetail(activeTournament.id);
          } : undefined}
          continueLabel={snapshot.winner === 'left' ? 'You advance!' : 'Eliminated'}
        />
      </div>
    );
  }

  // ─── Waiting for Opponent ───
  if (phase === 'waitingOpponent') {
    return (
      <div className="ds-screen">
        <div className="ds-topbar">
          <button className="ds-btn ds-btn-ghost ds-btn-sm" onClick={() => setPhase('detail')}>← Back</button>
          <div className="ds-topbar-title">⏳ Waiting for opponent…</div>
        </div>
        <div className="tournament-waiting">
          Your team is locked in. Waiting for your opponent to submit their team.
        </div>
      </div>
    );
  }

  // ─── Lock Team (fixed-team tournament registration) ───
  if (phase === 'lockTeam' && activeTournament) {
    const teamSize = activeTournament.totalPokemon;
    const toggleSelect = (idx: number, character?: string | null) => {
      const i = selected.indexOf(idx);
      if (i !== -1) {
        setSelected(selected.filter((_, k) => k !== i));
        setSelectedCharacters(selectedCharacters.filter((_, k) => k !== i));
      } else if (selected.length < teamSize) {
        setSelected([...selected, idx]);
        setSelectedCharacters([...selectedCharacters, character ?? null]);
      }
    };
    return (
      <TeamSelectGrid
        instances={collection}
        selected={selected}
        onToggle={toggleSelect}
        teamSize={teamSize}
        onSubmit={selected.length === teamSize ? submitLockedTeam : undefined}
        submitLabel="Lock Team"
        enableCharacterPick={characterPickUnlocked}
        selectedCharacters={selectedCharacters}
        onBack={() => setPhase('detail')}
        title="Lock Tournament Team"
      />
    );
  }

  // ─── Team Select ───
  if (phase === 'teamSelect' && activeTournament) {
    const teamSize = activeTournament.totalPokemon;
    const toggleSelect = (idx: number, character?: string | null) => {
      const i = selected.indexOf(idx);
      if (i !== -1) {
        setSelected(selected.filter((_, k) => k !== i));
        setSelectedCharacters(selectedCharacters.filter((_, k) => k !== i));
      } else if (selected.length < teamSize) {
        setSelected([...selected, idx]);
        setSelectedCharacters([...selectedCharacters, character ?? null]);
      }
    };
    return (
      <TeamSelectGrid
        instances={collection}
        selected={selected}
        onToggle={toggleSelect}
        teamSize={teamSize}
        onSubmit={selected.length === teamSize ? submitTeam : undefined}
        submitLabel="Lock In!"
        enableCharacterPick={characterPickUnlocked}
        selectedCharacters={selectedCharacters}
        onBack={() => setPhase('detail')}
        title="Tournament Match"
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
      <div className="ds-screen">
        <div className="ds-topbar">
          <button className="ds-btn ds-btn-ghost ds-btn-sm" onClick={() => { setPhase('list'); setActiveTournament(null); }}>← Back</button>
          <div className="ds-topbar-title">{t.name}</div>
        </div>

        <div className="ds-screen-scroll">
          <div className="tournament-info-bar">
            <span className={'tournament-status-badge status-' + t.status}>{t.status}</span>
            <span>{t.fieldSize}v{t.fieldSize} · {t.totalPokemon} pkm</span>
            <span>{t.participants.length} players</span>
            {t.fixedTeam && <span className="ds-badge ds-badge-gold">Fixed Team</span>}
            {t.publicTeams && <span className="ds-badge ds-badge-accent">Public Teams</span>}
          </div>

          {t.prizes && Array.isArray(t.prizes) && t.prizes.length > 0 && (
            <div className="tournament-prizes-bar">
              {t.prizes.map((p, i) => {
                const isLast = i === t.prizes.length - 1;
                const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : isLast ? '🏅' : '#' + (i + 1);
                const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
                return (
                  <span key={i} className={'tournament-prize-chip ' + rankClass}>
                    {icon} {p.essence}✦{p.pack ? ' + ' + p.pack : ''}{p.pokemonIds?.length ? ' + ' + p.pokemonIds.length + 'pkm' : ''}
                  </span>
                );
              })}
            </div>
          )}

          {t.status === 'registration' && (
            <div className="tournament-reg-info">
              <div className="tournament-reg-deadline">
                Registration closes: <strong>{formatTime(t.registrationEnd)}</strong>
              </div>
              {!isParticipant ? (
                <button className="ds-btn ds-btn-primary ds-btn-block" onClick={() => joinTournament(t.id)}>
                  Join Tournament
                </button>
              ) : (
                <>
                  {t.fixedTeam && !t.frozenTeams[playerName] && (
                    <button className="ds-btn ds-btn-gold ds-btn-block" onClick={() => { setSelected([]); setSelectedCharacters([]); setPhase('lockTeam'); }}>
                      Lock Your Team
                    </button>
                  )}
                  {t.fixedTeam && t.frozenTeams[playerName] && (
                    <div className="tournament-team-locked">
                      Team locked: {t.frozenTeams[playerName].map(f => f.name).join(', ')}
                    </div>
                  )}
                  <button className="ds-btn ds-btn-ghost ds-btn-sm" onClick={() => leaveTournament(t.id)}>Leave</button>
                </>
              )}
              <div className="ds-section-title">Participants</div>
              <div className="tournament-participants">
                {t.participants.map(p => (
                  <span key={p} className={'tournament-participant' + (t.fixedTeam && t.frozenTeams[p] ? ' team-ready' : '')}>
                    {p}{t.fixedTeam && t.frozenTeams[p] ? ' ·' : ''}
                    {t.publicTeams && t.frozenTeams[p] && (
                      <button className="tournament-view-team-sm" onClick={() => setViewingTeamOf(p)}>View</button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {myMatch && (
            <div className="tournament-my-match">
              <div className="tournament-my-match-title">Your Match</div>
              <div className="tournament-my-match-info">
                vs <strong>{myMatch.player1 === playerName ? myMatch.player2 : myMatch.player1}</strong>
                {myMatch.deadline && <span className="tournament-deadline"> · {timeLeft(myMatch.deadline)} left</span>}
                {t.publicTeams && (() => {
                  const opp = myMatch.player1 === playerName ? myMatch.player2 : myMatch.player1;
                  return opp && t.frozenTeams[opp] ? (
                    <button className="ds-btn ds-btn-ghost ds-btn-sm" onClick={() => setViewingTeamOf(opp)}>View Team</button>
                  ) : null;
                })()}
              </div>
              <button className="ds-btn ds-btn-primary ds-btn-block" onClick={() => startTeamSelect(myMatch.id)}>
                Choose Team & Fight!
              </button>
            </div>
          )}

          {t.winner && (
            <div className="tournament-winner-banner">Winner: {t.winner}</div>
          )}

          {t.bracket.length > 0 && (
            <>
              <div className="ds-section-title">Bracket</div>
              <div className="tournament-bracket">
                {Array.from({ length: maxRound }, (_, i) => i + 1).map(round => (
                  <div key={round} className="tournament-round">
                    <div className="tournament-round-title">
                      {round === maxRound ? 'Final' : round === maxRound - 1 ? 'Semifinal' : 'Round ' + round}
                    </div>
                    {t.bracket.filter(m => m.round === round).map(match => (
                      <div key={match.id} className={'tournament-match-card status-' + match.status}>
                        <div className={'tournament-match-player' + (match.winner === match.player1 ? ' winner' : '')}>
                          <span className="tournament-match-player-name">{match.player1 ?? 'TBD'}</span>
                        </div>
                        <div className="tournament-match-vs">vs</div>
                        <div className={'tournament-match-player' + (match.winner === match.player2 ? ' winner' : '')}>
                          <span className="tournament-match-player-name">{match.player2 ?? 'TBD'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {viewingTeamOf && t.frozenTeams[viewingTeamOf] && (
          <div className="ds-overlay" onClick={(e) => e.target === e.currentTarget && setViewingTeamOf(null)}>
            <div className="ds-modal">
              <div className="tournament-team-modal-header">
                <span className="tournament-team-modal-header-title">{viewingTeamOf}'s Team</span>
                <button className="tournament-team-modal-close" onClick={() => setViewingTeamOf(null)}>✕</button>
              </div>
              <div className="tournament-team-modal-list">
                {t.frozenTeams[viewingTeamOf].map((fp, i) => (
                  <div key={i} className="tournament-team-pokemon">
                    <img src={fp.sprite} alt={fp.name} className="tournament-team-sprite" />
                    <div className="tournament-team-pokemon-info">
                      <div className="tournament-team-pokemon-name">{fp.name}</div>
                      {fp.ability && <div className="tournament-team-pokemon-detail">{fp.ability}</div>}
                      {fp.moves && <div className="tournament-team-pokemon-detail">{fp.moves[0]} / {fp.moves[1]}</div>}
                      {fp.heldItem && <div className="tournament-team-pokemon-detail">{fp.heldItem}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Tournament List ───
  return (
    <div className="ds-screen">
      <div className="ds-topbar">
        <button className="ds-btn ds-btn-ghost ds-btn-sm" onClick={() => navigate('/play')}>← Back</button>
        <div className="ds-topbar-title">Tournaments</div>
      </div>
      <div className="ds-screen-scroll">
        {tournaments.length === 0 ? (
          <div className="ds-empty">
            <div className="ds-empty-text">No tournaments right now.<br />Check back later!</div>
          </div>
        ) : (
          <div className="tournament-list">
            {tournaments.map(t => (
              <div key={t.id} className="ds-card ds-card-interactive" onClick={() => openDetail(t.id)}>
                <div className="tournament-card-name">{t.name}</div>
                <div className="tournament-card-meta">
                  <span className={'tournament-status-badge status-' + t.status}>{t.status}</span>
                  <span>{t.fieldSize}v{t.fieldSize} · {t.totalPokemon} pkm</span>
                  <span>· {t.participantCount} players</span>
                  {t.fixedTeam && <span className="ds-badge ds-badge-gold">Fixed</span>}
                </div>
                {t.winner && <div className="tournament-card-winner">Winner: {t.winner}</div>}
                {t.prizes && Array.isArray(t.prizes) && t.prizes[0] && (
                  <div className="tournament-card-prize">1st: {t.prizes[0].essence}✦{t.prizes[0].pack ? ' + ' + t.prizes[0].pack : ''}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
