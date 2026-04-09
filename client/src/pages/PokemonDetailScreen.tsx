import { useParams, useNavigate } from 'react-router-dom';
import type { PokemonInstance, Stats } from '@shared/types';
import { getEffectiveMoves } from '@shared/types';
import { NATURE_BY_NAME, calcStat, STAT_LABELS } from '@shared/natures';
import { getHeldItemSprite, getHeldItemName, HELD_ITEMS_BY_ID } from '@shared/held-item-data';
import './PokemonDetailScreen.css';

interface PokemonDetailScreenProps {
  collection: PokemonInstance[];
}

const STAT_KEYS: (keyof Stats)[] = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'];

const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
  grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC',
};

export default function PokemonDetailScreen({ collection }: PokemonDetailScreenProps) {
  const { idx } = useParams();
  const navigate = useNavigate();

  const index = parseInt(idx ?? '', 10);
  const inst = collection[index];

  if (!inst) {
    return (
      <div className="pokemon-detail-screen">
        <div className="detail-header">
          <button className="detail-back" onClick={() => navigate('/collection')}>← Back</button>
          <h2>Not found</h2>
        </div>
      </div>
    );
  }

  const { pokemon, ivs, nature } = inst;
  const natureData = NATURE_BY_NAME[nature];

  return (
    <div className="pokemon-detail-screen">
      <div className="detail-header">
        <button className="detail-back" onClick={() => navigate('/collection')}>← Back</button>
        <h2>#{pokemon.id}</h2>
      </div>

      <div className="detail-scroll">
        <div className="detail-sprite-section">
          {index > 0 && (
            <button className="detail-nav detail-nav-prev" onClick={() => navigate(`/pokemon/${index - 1}`, { replace: true })}>‹</button>
          )}
          {index < collection.length - 1 && (
            <button className="detail-nav detail-nav-next" onClick={() => navigate(`/pokemon/${index + 1}`, { replace: true })}>›</button>
          )}
          <div className="detail-top-row">
            <div className="detail-name">{pokemon.name}</div>
            <div className={`detail-tier tier-${pokemon.tier}`}>{pokemon.tier}</div>
          </div>
          <img className="detail-sprite" src={pokemon.sprite} alt={pokemon.name} />
          <div className="detail-bottom-row">
            <div className="detail-meta-row">
              {pokemon.types.map((t) => (
                <span key={t} className="detail-type-badge" style={{ background: TYPE_COLORS[t] ?? '#888' }}>
                  {t}
                </span>
              ))}
            </div>
            <div className="detail-nature">
              <span className="detail-nature-name">{nature}</span>
              {natureData.plus && natureData.minus && (
                <span className="detail-nature-effect">
                  +{STAT_LABELS[natureData.plus]} / −{STAT_LABELS[natureData.minus]}
                </span>
              )}
              {!natureData.plus && <span className="detail-nature-effect">Neutral</span>}
            </div>
          </div>
        </div>

        <div className="detail-section-title">Stats</div>
        <div className="detail-stats">
          {STAT_KEYS.map((key) => {
            const base = pokemon.stats[key];
            const iv = ivs[key];
            const computed = calcStat(key, base, iv, natureData);
            const isPlus = natureData.plus === key;
            const isMinus = natureData.minus === key;
            const maxStat = key === 'hp' ? 250 : 200;
            return (
              <div key={key} className="detail-stat-row">
                <span className={`detail-stat-label ${isPlus ? 'plus' : ''} ${isMinus ? 'minus' : ''}`}>
                  {STAT_LABELS[key]}
                </span>
                <span className="detail-stat-value">{computed}</span>
                <div className="detail-stat-bar-bg">
                  <div
                    className={`detail-stat-bar ${isPlus ? 'plus' : ''} ${isMinus ? 'minus' : ''}`}
                    style={{ width: `${Math.min(100, (computed / maxStat) * 100)}%` }}
                  />
                </div>
                <span className={`detail-stat-iv ${iv >= 28 ? 'great' : iv <= 5 ? 'low' : ''}`}>
                  {iv}
                </span>
              </div>
            );
          })}
        </div>

        <div className="detail-section-title">Moves</div>
        <div className="detail-moves">
          {getEffectiveMoves(inst).map((moveName, i) => (
            <div key={i} className="detail-move-card">
              <span className="detail-move-name">{moveName}</span>
            </div>
          ))}
        </div>

        <div className="detail-section-title">Ability</div>
        <div className="detail-ability">
          <div className="detail-ability-name">{inst.ability}</div>
        </div>

        <div className="detail-section-title">Held Item</div>
        <div className="detail-held-item">
          {inst.heldItem ? (
            <div className="detail-held-item-info">
              <img src={getHeldItemSprite(inst.heldItem)} alt="" className="detail-held-icon" />
              <div>
                <div className="detail-held-name">{getHeldItemName(inst.heldItem)}</div>
                <div className="detail-held-desc">{HELD_ITEMS_BY_ID[inst.heldItem]?.description}</div>
              </div>
            </div>
          ) : (
            <div className="detail-held-none">None</div>
          )}
        </div>

        <div className="detail-section-title">Base Stats</div>
        <div className="detail-base-stats">
          {STAT_KEYS.map((key) => (
            <div key={key} className="detail-base-cell">
              <span className="detail-base-label">{STAT_LABELS[key]}</span>
              <span className="detail-base-value">{pokemon.stats[key]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
