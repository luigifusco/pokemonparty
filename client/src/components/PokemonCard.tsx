import type { Pokemon } from '@shared/types';
import './PokemonCard.css';

interface PokemonCardProps {
  pokemon: Pokemon;
  count?: number;
  onClick?: () => void;
  children?: React.ReactNode;
}

export default function PokemonCard({ pokemon, count, onClick, children }: PokemonCardProps) {
  return (
    <div className="pkmn-card" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      {count !== undefined && count > 1 && <div className="pkmn-card-count">×{count}</div>}
      <img src={pokemon.sprite} alt={pokemon.name} />
      <div className="pkmn-card-name">{pokemon.name}</div>
      <div className={`pkmn-card-tier tier-${pokemon.tier}`}>{pokemon.tier}</div>
      {children}
    </div>
  );
}
