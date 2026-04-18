import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PokemonInstance, Stats, OwnedItem } from '@shared/types';
import { getEffectiveMoves } from '@shared/types';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { NATURE_BY_NAME, calcStat, STAT_LABELS } from '@shared/natures';
import { getHeldItemSprite, getHeldItemName, HELD_ITEMS_BY_ID } from '@shared/held-item-data';
import { evolveGate } from '@shared/evolution';
import RarityStars from '../components/RarityStars';
import './PokemonDetailScreen.css';

interface PokemonDetailScreenProps {
  collection: PokemonInstance[];
  items: OwnedItem[];
  onShard: (instance: PokemonInstance) => void;
  onEvolve: (instance: PokemonInstance, targetId: number) => void;
}

const STAT_KEYS: (keyof Stats)[] = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'];

const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
  grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC',
};

export default function PokemonDetailScreen({ collection, items, onShard, onEvolve }: PokemonDetailScreenProps) {
  const { idx } = useParams();
  const navigate = useNavigate();
  const [shardConfirm, setShardConfirm] = useState(false);
  const [evoPicker, setEvoPicker] = useState(false);

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

  // Compute evo/shard data
  const evoTargets = (pokemon.evolutionTo ?? [])
    .map((id) => POKEMON_BY_ID[id])
    .filter(Boolean);
  const tokenCount = items.filter((i) => i.itemType === 'token' && i.itemData === String(pokemon.id)).length;
  const bondXp = inst.bondXp ?? 0;
  const firstTarget = evoTargets[0];
  const gate = firstTarget
    ? evolveGate({ bondXp, tokens: tokenCount, targetTier: firstTarget.tier })
    : null;
  const canEvolve = evoTargets.length > 0 && !!gate && gate.canEvolve;
  const bondPct = gate ? Math.min(100, Math.round((bondXp / gate.bondNeeded) * 100)) : 0;

  const handleShard = () => {
    onShard(inst);
    navigate('/collection');
  };

  const handleEvolve = (targetId: number) => {
    setEvoPicker(false);
    onEvolve(inst, targetId);
  };

  return (
    <div className="pokemon-detail-screen">
      <div className="detail-header">
        <button className="detail-back" onClick={() => navigate('/collection')}>← Back</button>
        <h2>#{pokemon.id}</h2>
        <div className="detail-header-actions">
          {canEvolve && evoTargets.length === 1 && (
            <button className="detail-header-btn detail-evolve-btn" onClick={() => handleEvolve(evoTargets[0].id)}>✨ Evolve</button>
          )}
          {canEvolve && evoTargets.length > 1 && (
            <button className="detail-header-btn detail-evolve-btn" onClick={() => setEvoPicker(!evoPicker)}>✨ Evolve</button>
          )}
          {!shardConfirm ? (
            <button className="detail-header-btn detail-shard-btn" onClick={() => setShardConfirm(true)}>🔮 Shard</button>
          ) : (
            <button className="detail-header-btn detail-shard-yes" onClick={handleShard}>Confirm</button>
          )}
          {shardConfirm && (
            <button className="detail-header-btn detail-shard-no" onClick={() => setShardConfirm(false)}>✕</button>
          )}
        </div>
      </div>

      {evoPicker && canEvolve && (
        <div className="detail-evo-bar">
          {evoTargets.map((t) => (
            <button key={t.id} className="detail-evo-option" onClick={() => handleEvolve(t.id)}>
              <img src={t.sprite} alt={t.name} className="detail-evo-sprite" />
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="detail-scroll">
        <div
          className="detail-sprite-section"
          style={{
            ['--type-grad' as string]: `radial-gradient(ellipse 70% 55% at 50% 40%, ${TYPE_COLORS[pokemon.types[0]] ?? '#7aa7ff'}55, transparent 70%), radial-gradient(ellipse 60% 50% at 70% 70%, ${TYPE_COLORS[pokemon.types[1] ?? pokemon.types[0]] ?? '#a96bff'}33, transparent 70%)`,
          }}
        >
          {index > 0 && (
            <button className="detail-nav detail-nav-prev" onClick={() => navigate(`/pokemon/${index - 1}`, { replace: true })}>‹</button>
          )}
          {index < collection.length - 1 && (
            <button className="detail-nav detail-nav-next" onClick={() => navigate(`/pokemon/${index + 1}`, { replace: true })}>›</button>
          )}
          <div className="detail-top-row">
            <div className="detail-name">{pokemon.name}</div>
            <RarityStars tier={pokemon.tier} size="md" />
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

        {evoTargets.length > 0 && gate && (
          <div className="detail-bond-panel">
            <div className="detail-bond-label">
              Bond XP <span className="detail-bond-num">{bondXp} / {gate.bondNeeded}</span>
              {gate.bondMet && <span className="detail-bond-met">✓ ready</span>}
            </div>
            <div className="detail-bond-track"><div className="detail-bond-fill" style={{ width: `${bondPct}%` }} /></div>
            <div className="detail-bond-hint">
              or spend <strong>{gate.tokensNeeded}</strong> {pokemon.name} token{gate.tokensNeeded > 1 ? 's' : ''} ({tokenCount}/{gate.tokensNeeded})
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
}
