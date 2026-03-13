import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_SHOP_TMS, getTMPrice } from '@shared/shop-data';
import { getMoveType, getTMSprite, STAT_MOVES, getMoveAccuracy } from '@shared/move-data';
import { getMoveInfo } from '@shared/move-info';
import { HELD_ITEMS } from '@shared/held-item-data';
import type { HeldItemDef } from '@shared/held-item-data';
import type { PokemonType } from '@shared/types';
import './ShopScreen.css';

const TYPE_COLORS: Partial<Record<PokemonType, string>> = {
  normal: '#a8a878', fire: '#f08030', water: '#6890f0', electric: '#f8d030',
  grass: '#78c850', ice: '#98d8d8', fighting: '#c03028', poison: '#a040a0',
  ground: '#e0c068', flying: '#a890f0', psychic: '#f85888', bug: '#a8b820',
  rock: '#b8a038', ghost: '#705898', dragon: '#7038f8', dark: '#705848',
  steel: '#b8b8d0', fairy: '#ee99ac',
};

interface ShopScreenProps {
  essence: number;
  onSpendEssence: (amount: number) => void;
  onAddItems: (items: { itemType: string; itemData: string }[]) => void;
}

type SortMode = 'name' | 'price-asc' | 'price-desc' | 'type';
type FilterType = 'all' | PokemonType | 'stat';

export default function ShopScreen({ essence, onSpendEssence, onAddItems }: ShopScreenProps) {
  const navigate = useNavigate();
  const [bought, setBought] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedHeldItem, setSelectedHeldItem] = useState<HeldItemDef | null>(null);
  const [tab, setTab] = useState<'tms' | 'held'>('tms');
  const [sort, setSort] = useState<SortMode>('type');
  const [filter, setFilter] = useState<FilterType>('all');

  const allTypes = useMemo(() => {
    const types = new Set<PokemonType>();
    for (const tm of ALL_SHOP_TMS) types.add(getMoveType(tm));
    return Array.from(types).sort();
  }, []);

  const sortedTMs = useMemo(() => {
    let list = [...ALL_SHOP_TMS];

    if (filter === 'stat') {
      list = list.filter((m) => STAT_MOVES[m]);
    } else if (filter !== 'all') {
      list = list.filter((m) => getMoveType(m) === filter);
    }

    if (sort === 'name') list.sort();
    else if (sort === 'price-asc') list.sort((a, b) => getTMPrice(a) - getTMPrice(b));
    else if (sort === 'price-desc') list.sort((a, b) => getTMPrice(b) - getTMPrice(a));
    else if (sort === 'type') list.sort((a, b) => getMoveType(a).localeCompare(getMoveType(b)) || a.localeCompare(b));

    return list;
  }, [sort, filter]);

  const handleBuy = (moveName: string) => {
    const price = getTMPrice(moveName);
    if (essence < price) return;
    onSpendEssence(price);
    onAddItems([{ itemType: 'tm', itemData: moveName }]);
    setSelected(null);
    setBought(moveName);
    setTimeout(() => setBought(null), 1500);
  };

  const handleBuyHeldItem = (item: HeldItemDef) => {
    if (essence < item.price) return;
    onSpendEssence(item.price);
    onAddItems([{ itemType: 'held_item', itemData: item.id }]);
    setSelectedHeldItem(null);
    setBought(item.name);
    setTimeout(() => setBought(null), 1500);
  };

  return (
    <div className="shop-screen">
      <div className="shop-header">
        <button className="shop-back" onClick={() => navigate('/play')}>← Back</button>
        <h2>🛒 Shop</h2>
        <div className="shop-essence">✦ {essence}</div>
      </div>

      <div className="shop-tabs">
        <button className={`shop-tab ${tab === 'tms' ? 'active' : ''}`} onClick={() => setTab('tms')}>TMs</button>
        <button className={`shop-tab ${tab === 'held' ? 'active' : ''}`} onClick={() => setTab('held')}>Held Items</button>
      </div>

      {tab === 'tms' && (
        <>
      <div className="shop-controls">
        <div className="shop-sort">
          <span>Sort:</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
            <option value="type">Type</option>
            <option value="name">Name</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
          </select>
        </div>
        <div className="shop-filter">
          <span>Filter:</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value as FilterType)}>
            <option value="all">All</option>
            <option value="stat">Stat Moves</option>
            {allTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="shop-grid">
        {sortedTMs.map((moveName) => {
          const price = getTMPrice(moveName);
          const type = getMoveType(moveName);
          const canAfford = essence >= price;
          const isStat = !!STAT_MOVES[moveName];
          const accuracy = getMoveAccuracy(moveName);
          const accLabel = accuracy === Infinity ? '∞' : `${accuracy}%`;

          return (
            <div
              key={moveName}
              className={`shop-tm-card ${bought === moveName ? 'just-bought' : ''}`}
              onClick={() => setSelected(moveName)}
            >
              <img src={getTMSprite(moveName)} alt={moveName} className="shop-tm-img" />
              <div className="shop-tm-info">
                <div className="shop-tm-name">{moveName}</div>
                <div className="shop-tm-meta">
                  <span className="shop-tm-type" style={{ background: TYPE_COLORS[type] ?? '#888' }}>{type}</span>
                  {isStat && <span className="shop-tm-badge stat">STAT</span>}
                  <span className="shop-tm-acc">Acc: {accLabel}</span>
                </div>
              </div>
              <div className="shop-tm-price">✦ {price}</div>
            </div>
          );
        })}
      </div>

      {selected && (() => {
        const moveName = selected;
        const price = getTMPrice(moveName);
        const type = getMoveType(moveName);
        const canAfford = essence >= price;
        const accuracy = getMoveAccuracy(moveName);
        const accLabel = accuracy === Infinity ? '∞' : `${accuracy}%`;
        const info = getMoveInfo(moveName);
        const isStat = !!STAT_MOVES[moveName];
        const statEffect = STAT_MOVES[moveName];

        return (
          <div className="shop-detail-overlay" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
            <div className="shop-detail-card">
              <img src={getTMSprite(moveName)} alt={moveName} className="shop-detail-img" />
              <h3 className="shop-detail-name">{moveName}</h3>
              <div className="shop-detail-badges">
                <span className="shop-tm-type" style={{ background: TYPE_COLORS[type] ?? '#888' }}>{type}</span>
                <span className="shop-detail-cat">{info.category}</span>
                {isStat && <span className="shop-tm-badge stat">STAT</span>}
              </div>
              <div className="shop-detail-stats">
                {info.bp > 0 && <div className="shop-detail-stat"><span>Power</span><strong>{info.bp}</strong></div>}
                <div className="shop-detail-stat"><span>Accuracy</span><strong>{accLabel}</strong></div>
              </div>
              {statEffect && (
                <div className="shop-detail-boosts">
                  {Object.entries(statEffect.boosts).map(([stat, val]) => (
                    <span key={stat} className={`boost-tag ${val > 0 ? 'boost-up' : 'boost-down'}`}>
                      {val > 0 ? '▲' : '▼'}{stat.toUpperCase()} {val > 0 ? '+' : ''}{val}
                    </span>
                  ))}
                  <span className="shop-detail-target">({statEffect.target === 'self' ? 'Self' : 'Opponent'})</span>
                </div>
              )}
              <p className="shop-detail-desc">{info.description}</p>
              <div className="shop-detail-price">✦ {price}</div>
              <div className="shop-detail-actions">
                <button className="shop-detail-btn cancel" onClick={() => setSelected(null)}>Back</button>
                <button
                  className={`shop-detail-btn buy ${canAfford ? '' : 'disabled'}`}
                  onClick={() => canAfford && handleBuy(moveName)}
                  disabled={!canAfford}
                >
                  {canAfford ? 'Buy' : 'Not enough ✦'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
        </>
      )}

      {tab === 'held' && (
        <div className="shop-grid">
          {HELD_ITEMS.map((item) => {
            const canAfford = essence >= item.price;
            return (
              <div
                key={item.id}
                className={`shop-tm-card`}
                onClick={() => setSelectedHeldItem(item)}
              >
                <img src={item.sprite} alt={item.name} className="shop-tm-img" style={{ imageRendering: 'pixelated' }} />
                <div className="shop-tm-info">
                  <div className="shop-tm-name">{item.name}</div>
                  <div className="shop-tm-meta">
                    <span className="shop-tm-badge held">HELD</span>
                  </div>
                </div>
                <div className="shop-tm-price">✦ {item.price}</div>
              </div>
            );
          })}
        </div>
      )}

      {selectedHeldItem && (() => {
        const item = selectedHeldItem;
        const canAfford = essence >= item.price;
        return (
          <div className="shop-detail-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedHeldItem(null)}>
            <div className="shop-detail-card">
              <img src={item.sprite} alt={item.name} className="shop-detail-img" style={{ imageRendering: 'pixelated' }} />
              <h3 className="shop-detail-name">{item.name}</h3>
              <div className="shop-detail-badges">
                <span className="shop-tm-badge held">HELD ITEM</span>
              </div>
              <p className="shop-detail-desc">{item.description}</p>
              <div className="shop-detail-price">✦ {item.price}</div>
              <div className="shop-detail-actions">
                <button className="shop-detail-btn cancel" onClick={() => setSelectedHeldItem(null)}>Back</button>
                <button
                  className={`shop-detail-btn buy ${canAfford ? '' : 'disabled'}`}
                  onClick={() => canAfford && handleBuyHeldItem(item)}
                  disabled={!canAfford}
                >
                  {canAfford ? 'Buy' : 'Not enough ✦'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {bought && (
        <div className="shop-toast">Purchased: {bought}!</div>
      )}
    </div>
  );
}
