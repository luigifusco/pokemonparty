import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { POKEMON } from '@shared/pokemon-data';
import type { BoxTier } from '@shared/types';
import './PokedexScreen.css';

const TIERS: (BoxTier | 'all')[] = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary'];

interface PokedexScreenProps {
  discovered: Set<number>;
}

export default function PokedexScreen({ discovered }: PokedexScreenProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<BoxTier | 'all'>('all');

  const filtered = filter === 'all'
    ? POKEMON
    : POKEMON.filter((p) => p.tier === filter);

  const sorted = [...filtered].sort((a, b) => a.id - b.id);
  const discoveredCount = POKEMON.filter((p) => discovered.has(p.id)).length;

  return (
    <div className="pokedex-screen">
      <div className="pokedex-header">
        <button className="pokedex-back" onClick={() => navigate('/play')}>← Back</button>
        <h2>Pokédex ({discoveredCount}/{POKEMON.length})</h2>
      </div>
      <div className="pokedex-filters">
        {TIERS.map((tier) => (
          <button
            key={tier}
            className={`pokedex-filter-btn ${filter === tier ? 'active' : ''}`}
            onClick={() => setFilter(tier)}
          >
            {tier === 'all' ? 'All' : tier.charAt(0).toUpperCase() + tier.slice(1)}
          </button>
        ))}
      </div>
      <div className="pokedex-grid">
        {sorted.map((p) => {
          const isDiscovered = discovered.has(p.id);
          return (
            <div key={p.id} className={`pkmn-card ${isDiscovered ? '' : 'undiscovered'}`}>
              <img
                src={p.sprite}
                alt={isDiscovered ? p.name : '???'}
                className={isDiscovered ? '' : 'silhouette'}
              />
              <div className="pkmn-card-name">{isDiscovered ? p.name : '???'}</div>
              {isDiscovered && (
                <div className={`pkmn-card-tier tier-${p.tier}`}>{p.tier}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
