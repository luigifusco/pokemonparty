import { useNavigate } from 'react-router-dom';
import { POKEMON } from '@shared/pokemon-data';
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
