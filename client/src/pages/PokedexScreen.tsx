import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { POKEMON } from '@shared/pokemon-data';
import type { BoxTier } from '@shared/types';
import PokemonCard from '../components/PokemonCard';
import './PokedexScreen.css';

const TIERS: (BoxTier | 'all')[] = ['all', 'common', 'uncommon', 'rare', 'legendary'];

export default function PokedexScreen() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<BoxTier | 'all'>('all');

  const filtered = filter === 'all'
    ? POKEMON
    : POKEMON.filter((p) => p.tier === filter);

  const sorted = [...filtered].sort((a, b) => a.id - b.id);

  return (
    <div className="pokedex-screen">
      <div className="pokedex-header">
        <button className="pokedex-back" onClick={() => navigate('/play')}>← Back</button>
        <h2>All Pokémon ({sorted.length})</h2>
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
        {sorted.map((p) => (
          <PokemonCard key={p.id} pokemon={p} />
        ))}
      </div>
    </div>
  );
}
