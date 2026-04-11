import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { STORY_CHAPTERS, STORY_REGIONS } from '@shared/story-data';
import type { StoryChapter } from '@shared/story-data';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { openBox, rollTM } from '@shared/boxes';
import { rollBoost } from '@shared/boost-data';
import BattleScene from '../components/BattleScene';
import type { BattleSnapshot } from '@shared/battle-types';
import type { PokemonInstance } from '@shared/types';
import PokemonIcon from '../components/PokemonIcon';
import { BASE_PATH } from '../config';
import './StoryScreen.css';

const API = BASE_PATH;

interface StoryScreenProps {
  playerId: string;
  essence: number;
  onGainEssence: (amount: number) => void;
  onAddPokemon: (pokemonIds: number[]) => Promise<PokemonInstance[]>;
  onAddItems: (items: { itemType: string; itemData: string }[]) => void;
  collection: PokemonInstance[];
}

type Phase = 'map' | 'intro' | 'battle' | 'victory' | 'reward';

export default function StoryScreen({ playerId, essence, onGainEssence, onAddPokemon, onAddItems, collection }: StoryScreenProps) {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<Phase>('map');
  const [activeChapter, setActiveChapter] = useState<StoryChapter | null>(null);
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [firstClear, setFirstClear] = useState(false);

  // Load progress
  useEffect(() => {
    fetch(`${API}/api/player/${playerId}/story`)
      .then(r => r.json())
      .then(data => setCompleted(new Set(data.completed)))
      .catch(() => {});
  }, [playerId]);

  const currentChapter = STORY_CHAPTERS.find(c => !completed.has(c.id)) ?? null;

  const startChapter = useCallback((chapter: StoryChapter) => {
    setActiveChapter(chapter);
    setPhase('intro');
    setSnapshot(null);
    setFirstClear(false);
  }, []);

  const startBattle = useCallback(async () => {
    if (!activeChapter) return;
    setLoading(true);
    try {
      // Use player's collection if they have pokemon, else use the chapter's team mirrored
      const playerTeamSize = activeChapter.team.length;
      const playerTeam = collection.length >= playerTeamSize
        ? collection.slice(0, playerTeamSize).map(inst => inst.pokemon.id)
        : activeChapter.team.map(() => {
            // Give random pokemon of similar strength
            const pool = Object.values(POKEMON_BY_ID).filter(p => p.tier !== 'legendary');
            return pool[Math.floor(Math.random() * pool.length)].id;
          });

      const res = await fetch(`${API}/api/battle/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftTeam: playerTeam,
          rightTeam: activeChapter.team,
          fieldSize: activeChapter.fieldSize,
        }),
      });
      const data = await res.json();
      setSnapshot(data.snapshot);
      setPhase('battle');
    } catch (err) {
      console.error('Battle failed:', err);
    } finally {
      setLoading(false);
    }
  }, [activeChapter, collection]);

  const handleBattleEnd = useCallback(async () => {
    if (!activeChapter || !snapshot) return;
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
    } else {
      // Lost — go back to map
      setPhase('map');
      setActiveChapter(null);
    }
  }, [activeChapter, snapshot, playerId, onGainEssence, onAddPokemon, onAddItems]);

  // Map view
  if (phase === 'map') {
    return (
      <div className="story-screen">
        <div className="story-header">
          <button className="story-back" onClick={() => navigate('/play')}>← Back</button>
          <h2>📖 The Stolen Spark</h2>
        </div>
        <div className="story-progress-bar">
          <div className="story-progress-fill" style={{ width: `${(completed.size / STORY_CHAPTERS.length) * 100}%` }} />
          <span className="story-progress-text">{completed.size}/{STORY_CHAPTERS.length}</span>
        </div>
        <div className="story-chapters">
          {STORY_REGIONS.map(region => {
            const chapters = STORY_CHAPTERS.filter(c => c.region === region);
            if (chapters.length === 0) return null;
            return (
              <div key={region} className="story-region">
                <div className="story-region-name">{region}</div>
                <div className="story-region-chapters">
                  {chapters.map(ch => {
                    const done = completed.has(ch.id);
                    const unlocked = ch.id === 1 || completed.has(ch.id - 1);
                    const isCurrent = currentChapter?.id === ch.id;
                    return (
                      <div
                        key={ch.id}
                        className={`story-chapter-card ${done ? 'done' : ''} ${isCurrent ? 'current' : ''} ${!unlocked ? 'locked' : ''}`}
                        onClick={() => unlocked && startChapter(ch)}
                      >
                        <img src={ch.sprite} alt={ch.trainerName} className="story-chapter-sprite" />
                        <div className="story-chapter-info">
                          <div className="story-chapter-name">{ch.trainerName}</div>
                          <div className="story-chapter-title">{ch.trainerTitle}</div>
                          <div className="story-chapter-format">{ch.fieldSize}v{ch.fieldSize} · {ch.team.length} pkmn</div>
                        </div>
                        <div className="story-chapter-status">
                          {done ? '✅' : !unlocked ? '🔒' : isCurrent ? '⚔️' : '○'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Intro dialogue
  if (phase === 'intro' && activeChapter) {
    return (
      <div className="story-screen">
        <div className="story-dialogue">
          <img src={activeChapter.sprite} alt={activeChapter.trainerName} className="story-dialogue-sprite" />
          <div className="story-dialogue-name">{activeChapter.trainerName}</div>
          <div className="story-dialogue-title">{activeChapter.trainerTitle}</div>
          <div className="story-dialogue-text">{activeChapter.introline}</div>
          <div className="story-dialogue-team">
            {activeChapter.team.map((id, i) => (
              <PokemonIcon key={i} pokemonId={id} size={32} />
            ))}
          </div>
          <button className="story-fight-btn" onClick={startBattle} disabled={loading}>
            {loading ? 'Loading...' : '⚔️ Battle!'}
          </button>
          <button className="story-retreat-btn" onClick={() => { setPhase('map'); setActiveChapter(null); }}>
            ← Retreat
          </button>
        </div>
      </div>
    );
  }

  // Battle
  if (phase === 'battle' && snapshot && activeChapter) {
    return (
      <div className="story-battle-wrapper">
        <BattleScene snapshot={snapshot} turnDelayMs={1500} />
        {snapshot.winner && (
          <button className="story-continue-btn" onClick={handleBattleEnd}>
            {snapshot.winner === 'left' ? '🏆 Continue' : '💀 Try Again'}
          </button>
        )}
      </div>
    );
  }

  // Victory
  if (phase === 'victory' && activeChapter) {
    return (
      <div className="story-screen">
        <div className="story-dialogue">
          <img src={activeChapter.sprite} alt={activeChapter.trainerName} className="story-dialogue-sprite" />
          <div className="story-dialogue-name">{activeChapter.trainerName}</div>
          <div className="story-dialogue-text">{activeChapter.winLine}</div>
          {firstClear && (
            <div className="story-rewards">
              <div className="story-reward">✦ +{activeChapter.essenceReward} Essence</div>
              {activeChapter.packReward && (
                <div className="story-reward">🎁 {activeChapter.packReward} pack!</div>
              )}
              {activeChapter.isBoss && (
                <div className="story-reward story-shard">💎 Shard obtained!</div>
              )}
            </div>
          )}
          <button className="story-fight-btn" onClick={() => { setPhase('map'); setActiveChapter(null); }}>
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
