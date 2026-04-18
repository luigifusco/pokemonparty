import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PokemonInstance, Pokemon, BoxTier, OwnedItem } from '@shared/types';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { getHeldItemSprite, getHeldItemName } from '@shared/held-item-data';
import { evolveGate } from '@shared/evolution';
import { evolutionStepFor } from '@shared/evolution-helpers';
import PokemonCard from '../components/PokemonCard';
import ShardConfirmModal from '../components/ShardConfirmModal';
import './CollectionScreen.css';

const TIERS: (BoxTier | 'all')[] = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary'];

interface CollectionScreenProps {
  collection: PokemonInstance[];
  items: OwnedItem[];
  onEvolve: (instance: PokemonInstance, targetId: number) => void;
  onShard: (instance: PokemonInstance) => void;
}

function getEvoTargets(pokemon: Pokemon): Pokemon[] {
  if (!pokemon.evolutionTo) return [];
  return pokemon.evolutionTo
    .map((id) => POKEMON_BY_ID[id])
    .filter(Boolean);
}

export default function CollectionScreen({ collection, items, onShard }: CollectionScreenProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<BoxTier | 'all'>('all');
  const [shardMode, setShardMode] = useState(false);
  const [shardSelected, setShardSelected] = useState<Set<string>>(new Set());
  const [shardPreview, setShardPreview] = useState<PokemonInstance[] | null>(null);

  // Count tokens per pokemon id
  const tokenCounts = new Map<number, number>();
  for (const item of items) {
    if (item.itemType === 'token') {
      const pid = Number(item.itemData);
      tokenCounts.set(pid, (tokenCounts.get(pid) ?? 0) + 1);
    }
  }

  const filtered = collection
    .filter((inst) => filter === 'all' || inst.pokemon.tier === filter)
    .sort((a, b) => {
      const aFav = a.favorite ? 0 : 1;
      const bFav = b.favorite ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.pokemon.id - b.pokemon.id;
    });

  // Evolution is triggered from the Pokemon detail screen — clicking a
  // ready-to-evolve card just navigates there via the normal onClick.


  const toggleShardSelect = (inst: PokemonInstance) => {
    setShardSelected((prev) => {
      const next = new Set(prev);
      if (next.has(inst.instanceId)) next.delete(inst.instanceId);
      else next.add(inst.instanceId);
      return next;
    });
  };

  const confirmBulkShard = () => {
    const toShard = collection.filter((c) => shardSelected.has(c.instanceId));
    if (toShard.length === 0) return;
    setShardPreview(toShard);
  };

  const doBulkShard = () => {
    if (!shardPreview) return;
    for (const inst of shardPreview) onShard(inst);
    setShardPreview(null);
    setShardSelected(new Set());
    setShardMode(false);
  };

  const exitShardMode = () => {
    setShardSelected(new Set());
    setShardMode(false);
  };

  // Find the index in the original collection for navigation
  const getCollectionIndex = (inst: PokemonInstance) =>
    collection.findIndex((c) => c.instanceId === inst.instanceId);

  return (
    <div className="collection-screen">
      <div className="collection-header">
        <button className="collection-back" onClick={() => shardMode ? exitShardMode() : navigate('/play')}>
          {shardMode ? 'Cancel' : '← Back'}
        </button>
        <h2>{shardMode ? `Shard (${shardSelected.size} selected)` : `My Pokémon (${collection.length})`}</h2>
        {!shardMode && (
          <button className="collection-shard-mode-btn" onClick={() => setShardMode(true)}>Shard</button>
        )}
        {shardMode && shardSelected.size > 0 && (
          <button className="collection-shard-confirm-btn" onClick={confirmBulkShard}>
            Shard {shardSelected.size}
          </button>
        )}
      </div>
      <div className="collection-filters">
        {TIERS.map((tier) => (
          <button
            key={tier}
            className={`collection-filter-btn ${filter === tier ? 'active' : ''}`}
            onClick={() => setFilter(tier)}
          >
            {tier === 'all' ? 'All' : tier.charAt(0).toUpperCase() + tier.slice(1)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="collection-empty">No Pokémon yet — visit the shop!</div>
      ) : (
        <div className="collection-grid">
          {filtered.map((inst) => {
            const tokens = tokenCounts.get(inst.pokemon.id) ?? 0;
            const targets = getEvoTargets(inst.pokemon);
            const firstTarget = targets[0];
            const gate = firstTarget
              ? evolveGate({ bondXp: inst.bondXp ?? 0, tokens, targetTier: firstTarget.tier, step: evolutionStepFor(inst.pokemon) ?? undefined })
              : null;
            const canEvolve = !!gate && gate.canEvolve && targets.length > 0;
            const bondXp = inst.bondXp ?? 0;
            const bondPct = gate ? Math.min(100, Math.round((bondXp / gate.bondNeeded) * 100)) : 0;
            const isShardSelected = shardSelected.has(inst.instanceId);
            return (
              <PokemonCard
                key={inst.instanceId}
                pokemon={inst.pokemon}
                onClick={() => {
                  if (shardMode) toggleShardSelect(inst);
                  else navigate(`/pokemon/${getCollectionIndex(inst)}`);
                }}
                className={`${shardMode && isShardSelected ? 'shard-selected' : ''} ${inst.favorite ? 'favorite' : ''} ${!shardMode && canEvolve ? 'ready-to-evolve' : ''}`}
              >
                {inst.favorite && <div className="collection-favorite-badge" title="Favorite">★</div>}
                {shardMode && isShardSelected && (
                  <div className="shard-check">✓</div>
                )}
                {!shardMode && inst.heldItem && (
                  <div
                    className="collection-held-item"
                    title={getHeldItemName(inst.heldItem)}
                    aria-label={getHeldItemName(inst.heldItem)}
                  >
                    <img src={getHeldItemSprite(inst.heldItem)} alt="" />
                  </div>
                )}
                {!shardMode && gate && targets.length > 0 && !canEvolve && (
                  <div className="collection-bond-bar" title={`Bond ${bondXp}/${gate.bondNeeded} · Tokens ${tokens}/${gate.tokensNeeded}`}>
                    <div className="collection-bond-fill" style={{ width: `${bondPct}%` }} />
                    <span className="collection-bond-text">{bondXp}/{gate.bondNeeded}</span>
                  </div>
                )}
                {!shardMode && canEvolve && (
                  <div className="collection-evolve-badge" title="Ready to evolve!">✦</div>
                )}
              </PokemonCard>
            );
          })}
        </div>
      )}

      {shardPreview && (
        <ShardConfirmModal
          instances={shardPreview}
          onCancel={() => setShardPreview(null)}
          onConfirm={doBulkShard}
        />
      )}
    </div>
  );
}
