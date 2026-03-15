import './PokemonIcon.css';
import { BASE_PATH } from '../config';

interface PokemonIconProps {
  pokemonId: number;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a small Pokémon icon from the bwicons sprite sheet.
 * Icons are 32×32 on a 16-column grid indexed by national dex number.
 */
export default function PokemonIcon({ pokemonId, size, className = '', style }: PokemonIconProps) {
  const col = pokemonId % 16;
  const row = Math.floor(pokemonId / 16);
  const x = col * 32;
  const y = row * 32;

  const scale = size ? size / 32 : 1;

  return (
    <span
      className={`pkmn-icon ${className}`}
      style={{
        backgroundImage: `url(${BASE_PATH}/assets/bwicons-sheet.png)`,
        backgroundPosition: `-${x}px -${y}px`,
        ...(size ? { transform: `scale(${scale})`, transformOrigin: 'top left', marginRight: `${size - 32}px`, marginBottom: `${size - 32}px` } : {}),
        ...style,
      }}
    />
  );
}
