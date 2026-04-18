import { useNavigate } from 'react-router-dom';
import { POKEMON } from '@shared/pokemon-data';
import RarityStars from '../components/RarityStars';
import './PokedexScreen.css';

interface PokedexScreenProps {
  discovered: Set<number>;
}

export default function PokedexScreen({ discovered }: PokedexScreenProps) {
  const navigate = useNavigate();

  const sorted = [...POKEMON].sort((a, b) => a.id - b.id);
  const discoveredCount = POKEMON.filter((p) => discovered.has(p.id)).length;

  return (
    <div className="pokedex-screen">
      <div className="pokedex-header">
        <button className="pokedex-back" onClick={() => navigate('/play')}>← Back</button>
        <h2>Pokédex ({discoveredCount}/{POKEMON.length})</h2>
      </div>
      <div className="pokedex-grid">
        {sorted.map((p) => {
          const isDiscovered = discovered.has(p.id);
          return (
            <div key={p.id} className={`pkmn-card ${isDiscovered ? '' : 'undiscovered'}`}>
              <span className="pokedex-dex-num">#{String(p.id).padStart(3, '0')}</span>
              <img
                src={p.sprite}
                alt={isDiscovered ? p.name : '???'}
                className={isDiscovered ? '' : 'silhouette'}
              />
              <div className="pkmn-card-name">{isDiscovered ? p.name : '???'}</div>
              {isDiscovered && (
                <RarityStars tier={p.tier} size="sm" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
