import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTMSprite, getMoveType } from '@shared/move-data';
import { getBoostSprite, getBoostName, BOOST_ITEMS, MAX_IV } from '@shared/boost-data';
import type { StatKey } from '@shared/boost-data';
import { HELD_ITEMS_BY_ID, getHeldItemSprite, getHeldItemName } from '@shared/held-item-data';
import { STAT_LABELS } from '@shared/natures';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import type { OwnedItem, PokemonInstance } from '@shared/types';
import { getEffectiveMoves } from '@shared/types';
import { canLearnMove } from '@shared/tm-learnsets';
import PokemonIcon from '../components/PokemonIcon';
import './ItemsScreen.css';

interface ItemsScreenProps {
  items: OwnedItem[];
  collection: PokemonInstance[];
  onTeachTM: (instance: PokemonInstance, moveName: string, moveSlot: 0 | 1) => void;
  onUseBoost: (instance: PokemonInstance, stat: StatKey) => void;
  onGiveHeldItem: (instance: PokemonInstance, itemId: string) => void;
  onTakeHeldItem: (instance: PokemonInstance) => void;
}

interface TMGroup {
  moveName: string;
  count: number;
}

interface TokenGroup {
  pokemonId: number;
  pokemonName: string;
  count: number;
}

interface BoostGroup {
  stat: StatKey;
  name: string;
  count: number;
}

type TeachPhase =
  | { step: 'pickPokemon'; moveName: string }
  | { step: 'pickMove'; moveName: string; instance: PokemonInstance };

type BoostPhase =
  | { step: 'pickPokemon'; stat: StatKey };

type HeldItemPhase =
  | { step: 'pickPokemon'; itemId: string };

interface HeldItemGroup {
  itemId: string;
  name: string;
  count: number;
}

export default function ItemsScreen({ items, collection, onTeachTM, onUseBoost, onGiveHeldItem, onTakeHeldItem }: ItemsScreenProps) {
  const navigate = useNavigate();
  const [teachPhase, setTeachPhase] = useState<TeachPhase | null>(null);
  const [heldItemPhase, setHeldItemPhase] = useState<HeldItemPhase | null>(null);
  const [boostPhase, setBoostPhase] = useState<BoostPhase | null>(null);
  const [successAnim, setSuccessAnim] = useState<{ icon: string; text: string; pokemonSprite: string } | null>(null);

  const showSuccess = (icon: string, text: string, pokemonSprite: string) => {
    setSuccessAnim({ icon, text, pokemonSprite });
    setTimeout(() => setSuccessAnim(null), 1400);
  };

  // Group TMs by move name
  const tmGroups: TMGroup[] = [];
  const tmCounts = new Map<string, number>();
  for (const item of items) {
    if (item.itemType === 'tm') {
      tmCounts.set(item.itemData, (tmCounts.get(item.itemData) ?? 0) + 1);
    }
  }
  for (const [moveName, count] of [...tmCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    tmGroups.push({ moveName, count });
  }

  // Group Tokens by pokemon ID
  const tokenGroups: TokenGroup[] = [];
  const tokenCounts = new Map<number, number>();
  for (const item of items) {
    if (item.itemType === 'token') {
      const pid = Number(item.itemData);
      tokenCounts.set(pid, (tokenCounts.get(pid) ?? 0) + 1);
    }
  }
  for (const [pokemonId, count] of [...tokenCounts.entries()].sort((a, b) => a[0] - b[0])) {
    const pokemon = POKEMON_BY_ID[pokemonId];
    tokenGroups.push({ pokemonId, pokemonName: pokemon?.name ?? `#${pokemonId}`, count });
  }

  // Group Boosts by stat
  const boostGroups: BoostGroup[] = [];
  const boostCounts = new Map<StatKey, number>();
  for (const item of items) {
    if (item.itemType === 'boost') {
      const stat = item.itemData as StatKey;
      boostCounts.set(stat, (boostCounts.get(stat) ?? 0) + 1);
    }
  }
  for (const boost of BOOST_ITEMS) {
    const count = boostCounts.get(boost.stat);
    if (count) {
      boostGroups.push({ stat: boost.stat, name: boost.name, count });
    }
  }

  // Group Held Items by item ID
  const heldItemGroups: HeldItemGroup[] = [];
  const heldItemCounts = new Map<string, number>();
  for (const item of items) {
    if (item.itemType === 'held_item') {
      heldItemCounts.set(item.itemData, (heldItemCounts.get(item.itemData) ?? 0) + 1);
    }
  }
  for (const [itemId, count] of [...heldItemCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    heldItemGroups.push({ itemId, name: getHeldItemName(itemId), count });
  }

  // Pokemon holding items (for take-item display)
  const pokemonWithItems = collection.filter((inst) => inst.heldItem);

  const hasItems = tmGroups.length > 0 || tokenGroups.length > 0 || boostGroups.length > 0 || heldItemGroups.length > 0 || pokemonWithItems.length > 0;

  const handleUseTM = (moveName: string) => {
    setTeachPhase({ step: 'pickPokemon', moveName });
  };

  const handleUseBoost = (stat: StatKey) => {
    setBoostPhase({ step: 'pickPokemon', stat });
  };

  const handleGiveHeldItem = (itemId: string) => {
    setHeldItemPhase({ step: 'pickPokemon', itemId });
  };

  const handleHeldItemPickPokemon = (inst: PokemonInstance) => {
    if (!heldItemPhase) return;
    onGiveHeldItem(inst, heldItemPhase.itemId);
    showSuccess('🎁', `${inst.pokemon.name} received ${getHeldItemName(heldItemPhase.itemId)}!`, inst.pokemon.sprite);
    setHeldItemPhase(null);
  };

  const handleBoostPickPokemon = (inst: PokemonInstance) => {
    if (!boostPhase) return;
    if (inst.ivs[boostPhase.stat] >= MAX_IV) return;
    onUseBoost(inst, boostPhase.stat);
    showSuccess('💪', `${inst.pokemon.name}'s ${STAT_LABELS[boostPhase.stat]} maxed out!`, inst.pokemon.sprite);
    setBoostPhase(null);
  };

  const handlePickPokemon = (inst: PokemonInstance) => {
    if (!teachPhase || teachPhase.step !== 'pickPokemon') return;
    setTeachPhase({ step: 'pickMove', moveName: teachPhase.moveName, instance: inst });
  };

  const handlePickMoveSlot = (slot: 0 | 1) => {
    if (!teachPhase || teachPhase.step !== 'pickMove') return;
    onTeachTM(teachPhase.instance, teachPhase.moveName, slot);
    showSuccess('💿', `${teachPhase.instance.pokemon.name} learned ${teachPhase.moveName}!`, teachPhase.instance.pokemon.sprite);
    setTeachPhase(null);
  };

  // Sorted collection for pokemon picker
  const sortedCollection = [...collection].sort((a, b) => a.pokemon.id - b.pokemon.id);

  return (
    <div className="items-screen">
      <div className="items-header">
        <button className="items-back" onClick={() => navigate('/play')}>← Back</button>
        <h2>Items</h2>
        <div className="items-count">{items.length} total</div>
      </div>

      {!hasItems ? (
        <div className="items-empty">No items yet. Buy packs to get TMs!</div>
      ) : (
        <div className="items-scroll">
          {tokenGroups.length > 0 && (
            <>
              <div className="items-section-title">Tokens</div>
              <div className="items-grid">
                {tokenGroups.map(({ pokemonId, pokemonName, count }) => (
                  <div key={`token-${pokemonId}`} className="item-card token-card">
                    <div className="token-icon-wrapper">
                      <PokemonIcon pokemonId={pokemonId} />
                    </div>
                    {count > 1 && <div className="item-count">×{count}</div>}
                    <div className="item-name">{pokemonName}</div>
                    <div className="item-type token-badge">Token</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tmGroups.length > 0 && (
            <>
              <div className="items-section-title">TMs</div>
              <div className="items-grid">
                {tmGroups.map(({ moveName, count }) => {
                  const moveType = getMoveType(moveName);
                  return (
                    <div key={moveName} className={`item-card type-bg-${moveType} tm-usable`} onClick={() => handleUseTM(moveName)}>
                      <img
                        className="item-sprite"
                        src={getTMSprite(moveName)}
                        alt={`TM ${moveName}`}
                      />
                      {count > 1 && <div className="item-count">×{count}</div>}
                      <div className="item-name">{moveName}</div>
                      <div className={`item-type type-${moveType}`}>{moveType}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {boostGroups.length > 0 && (
            <>
              <div className="items-section-title">Boosts</div>
              <div className="items-grid">
                {boostGroups.map(({ stat, name, count }) => (
                  <div key={`boost-${stat}`} className="item-card boost-card boost-usable" onClick={() => handleUseBoost(stat)}>
                    <img
                      className="item-sprite boost-sprite"
                      src={getBoostSprite(stat)}
                      alt={name}
                    />
                    {count > 1 && <div className="item-count">×{count}</div>}
                    <div className="item-name">{name}</div>
                    <div className="item-type boost-badge">{STAT_LABELS[stat]}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {(heldItemGroups.length > 0 || pokemonWithItems.length > 0) && (
            <>
              <div className="items-section-title">Held Items</div>
              {heldItemGroups.length > 0 && (
                <div className="items-grid">
                  {heldItemGroups.map(({ itemId, name, count }) => (
                    <div key={`held-${itemId}`} className="item-card held-item-card held-usable" onClick={() => handleGiveHeldItem(itemId)}>
                      <img
                        className="item-sprite"
                        src={getHeldItemSprite(itemId)}
                        alt={name}
                      />
                      {count > 1 && <div className="item-count">×{count}</div>}
                      <div className="item-name">{name}</div>
                      <div className="item-type held-badge">Give</div>
                    </div>
                  ))}
                </div>
              )}
              {pokemonWithItems.length > 0 && (
                <>
                  <div className="items-subsection-title">Held by Pokémon</div>
                  <div className="items-grid">
                    {pokemonWithItems.map((inst) => (
                      <div key={inst.instanceId} className="item-card held-pokemon-card" onClick={() => onTakeHeldItem(inst)}>
                        <img
                          className="item-sprite"
                          src={inst.pokemon.sprite}
                          alt={inst.pokemon.name}
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <div className="item-name">{inst.pokemon.name}</div>
                        <div className="held-item-badge">
                          <img src={getHeldItemSprite(inst.heldItem!)} alt="" className="held-item-mini" />
                          <span>{getHeldItemName(inst.heldItem!)}</span>
                        </div>
                        <div className="item-type take-badge">Take</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Step 1: Pick a pokemon to teach the TM to */}
      {teachPhase?.step === 'pickPokemon' && (() => {
        const eligible = sortedCollection.filter((inst) => canLearnMove(inst.pokemon.name, teachPhase.moveName));
        return (
        <div className="teach-overlay" onClick={(e) => e.target === e.currentTarget && setTeachPhase(null)}>
          <div className="teach-content">
            <div className="teach-header">
              <span>Teach <strong>{teachPhase.moveName}</strong> to...</span>
              <button className="teach-close" onClick={() => setTeachPhase(null)}>✕</button>
            </div>
            {eligible.length === 0 ? (
              <div className="teach-empty">No Pokémon in your collection can learn this move</div>
            ) : (
              <div className="teach-pokemon-grid">
                {eligible.map((inst) => (
                  <div key={inst.instanceId} className="teach-pokemon-card" onClick={() => handlePickPokemon(inst)}>
                    <img src={inst.pokemon.sprite} alt={inst.pokemon.name} />
                    <div className="teach-pokemon-name">{inst.pokemon.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* Step 2: Pick which move to replace */}
      {teachPhase?.step === 'pickMove' && (
        <div className="teach-overlay" onClick={(e) => e.target === e.currentTarget && setTeachPhase(null)}>
          <div className="teach-content teach-move-content">
            <div className="teach-header">
              <button className="teach-back" onClick={() => setTeachPhase({ step: 'pickPokemon', moveName: teachPhase.moveName })}>←</button>
              <span>Replace a move</span>
              <button className="teach-close" onClick={() => setTeachPhase(null)}>✕</button>
            </div>
            <div className="teach-pokemon-preview">
              <img src={teachPhase.instance.pokemon.sprite} alt={teachPhase.instance.pokemon.name} />
              <span>{teachPhase.instance.pokemon.name}</span>
            </div>
            <div className="teach-new-move">
              <img className="teach-tm-icon" src={getTMSprite(teachPhase.moveName)} alt="TM" />
              <span className={`teach-new-move-name type-${getMoveType(teachPhase.moveName)}`}>{teachPhase.moveName}</span>
            </div>
            <div className="teach-arrow">▼ replaces ▼</div>
            <div className="teach-move-slots">
              {getEffectiveMoves(teachPhase.instance).map((move, i) => {
                const moveType = getMoveType(move);
                return (
                  <button
                    key={i}
                    className={`teach-move-slot type-bg-${moveType}`}
                    onClick={() => handlePickMoveSlot(i as 0 | 1)}
                  >
                    <span className="teach-move-slot-name">{move}</span>
                    <span className={`teach-move-slot-type type-${moveType}`}>{moveType}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Boost: Pick a pokemon to boost */}
      {boostPhase?.step === 'pickPokemon' && (
        <div className="teach-overlay" onClick={(e) => e.target === e.currentTarget && setBoostPhase(null)}>
          <div className="teach-content">
            <div className="teach-header">
              <span>Use <strong>{getBoostName(boostPhase.stat)}</strong> on...</span>
              <button className="teach-close" onClick={() => setBoostPhase(null)}>✕</button>
            </div>
            <div className="boost-hint">Max {STAT_LABELS[boostPhase.stat]} IV → {MAX_IV}</div>
            {sortedCollection.length === 0 ? (
              <div className="teach-empty">No Pokémon in your collection</div>
            ) : (
              <div className="teach-pokemon-grid">
                {sortedCollection.map((inst) => {
                  const isMaxed = inst.ivs[boostPhase.stat] >= MAX_IV;
                  return (
                    <div
                      key={inst.instanceId}
                      className={`teach-pokemon-card ${isMaxed ? 'boost-maxed' : ''}`}
                      onClick={() => !isMaxed && handleBoostPickPokemon(inst)}
                    >
                      <img src={inst.pokemon.sprite} alt={inst.pokemon.name} />
                      <div className="teach-pokemon-name">{inst.pokemon.name}</div>
                      <div className="boost-iv-label">
                        {STAT_LABELS[boostPhase.stat]}: {inst.ivs[boostPhase.stat]}{isMaxed ? ' ✓' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Held Item: Pick a pokemon to give the item to */}
      {heldItemPhase?.step === 'pickPokemon' && (() => {
        const eligible = sortedCollection.filter((inst) => !inst.heldItem);
        return (
        <div className="teach-overlay" onClick={(e) => e.target === e.currentTarget && setHeldItemPhase(null)}>
          <div className="teach-content">
            <div className="teach-header">
              <span>Give <strong>{getHeldItemName(heldItemPhase.itemId)}</strong> to...</span>
              <button className="teach-close" onClick={() => setHeldItemPhase(null)}>✕</button>
            </div>
            <div className="held-item-desc" style={{ fontSize: '11px', color: '#aaa', padding: '0 12px 8px', textAlign: 'center' }}>
              {HELD_ITEMS_BY_ID[heldItemPhase.itemId]?.description}
            </div>
            {eligible.length === 0 ? (
              <div className="teach-empty">All Pokémon are already holding items</div>
            ) : (
              <div className="teach-pokemon-grid">
                {eligible.map((inst) => (
                  <div key={inst.instanceId} className="teach-pokemon-card" onClick={() => handleHeldItemPickPokemon(inst)}>
                    <img src={inst.pokemon.sprite} alt={inst.pokemon.name} />
                    <div className="teach-pokemon-name">{inst.pokemon.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {successAnim && (
        <div className="item-success-overlay">
          <div className="item-success-content">
            <img src={successAnim.pokemonSprite} alt="" className="item-success-sprite" />
            <div className="item-success-icon">{successAnim.icon}</div>
            <div className="item-success-text">{successAnim.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}
