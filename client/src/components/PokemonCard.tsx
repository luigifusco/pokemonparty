import type { Pokemon, PokemonType } from '@shared/types';
import RarityStars from './RarityStars';
import './PokemonCard.css';

interface PokemonCardProps {
  pokemon: Pokemon;
  count?: number;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

const TYPE_COLORS: Record<PokemonType, string> = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
  grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC',
};

function typeGradient(types: PokemonType[]): string {
  const a = TYPE_COLORS[types[0]] ?? '#7aa7ff';
  const b = TYPE_COLORS[types[1] ?? types[0]] ?? '#a96bff';
  return `linear-gradient(160deg, ${a}66 0%, ${b}33 55%, transparent 100%)`;
}

export default function PokemonCard({ pokemon, count, onClick, children, className }: PokemonCardProps) {
  const rarityClass = `ds-rarity-${pokemon.tier}`;
  const style: React.CSSProperties = {
    ...(onClick ? { cursor: 'pointer' } : {}),
    ['--type-grad' as string]: typeGradient(pokemon.types),
  };
  return (
    <div className={`pkmn-card ${rarityClass} ${className ?? ''}`} onClick={onClick} style={style}>
      {count !== undefined && count > 1 && <div className="pkmn-card-count">×{count}</div>}
      <img src={pokemon.sprite} alt={pokemon.name} />
      <div className="pkmn-card-name">{pokemon.name}</div>
      <RarityStars tier={pokemon.tier} size="sm" className="pkmn-card-stars" />
      {children}
    </div>
  );
}
