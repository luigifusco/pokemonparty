import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PACKS, PACK_TIERS, packTierCost } from '@shared/pack-data';
import { openPack, getPackPoolSize } from '@shared/boxes';
import { getTMSprite, getMoveType } from '@shared/move-data';
import { getHeldItemSprite, getHeldItemName } from '@shared/held-item-data';
import type { PokemonInstance, PackTierId, BoxTier } from '@shared/types';
import RarityStars from '../components/RarityStars';
import './StoreScreen.css';

interface PackCard {
  type: 'pokemon' | 'tm' | 'item';
  name: string;
  sprite: string;
  tier?: string;
  nature?: string;
  ability?: string;
  moves?: [string, string];
  label?: string;
}

interface StoreScreenProps {
  essence: number;
  onSpendEssence: (amount: number) => void;
  onAddPokemon: (pokemonIds: number[]) => Promise<PokemonInstance[]>;
  onAddItems: (items: { itemType: string; itemData: string }[]) => void;
}

const TIER_RARITY: Record<PackTierId, 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'> = {
  basic: 'common',
  great: 'uncommon',
  ultra: 'epic',
  master: 'legendary',
};

const TIER_STORAGE_KEY = 'store:preferred-tier';

export default function StoreScreen({ essence, onSpendEssence, onAddPokemon, onAddItems }: StoreScreenProps) {
  const navigate = useNavigate();
  const [cards, setCards] = useState<PackCard[] | null>(null);
  const [phase, setPhase] = useState<'idle' | 'opening' | 'reveal'>('idle');
  const [revealIndex, setRevealIndex] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const dragStartX = useRef(0);
  const dragging = useRef(false);
  const [selectedTier, setSelectedTier] = useState<PackTierId>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(TIER_STORAGE_KEY) : null;
    if (saved && PACK_TIERS.some((t) => t.id === saved)) return saved as PackTierId;
    return 'basic';
  });

  const chooseTier = (t: PackTierId) => {
    setSelectedTier(t);
    try { window.localStorage.setItem(TIER_STORAGE_KEY, t); } catch {}
  };

  const handleBuy = async (packId: string) => {
    const cost = packTierCost(packId, selectedTier);
    if (cost <= 0 || essence < cost) return;

    const result = openPack(packId, selectedTier);
    if (result.pokemon.length === 0) return;
    onSpendEssence(cost);

    const instances = await onAddPokemon(result.pokemon.map((p) => p.id));

    const bonusItems: { itemType: string; itemData: string }[] = [];
    for (const tm of result.bonusTMs) bonusItems.push({ itemType: 'tm', itemData: tm });
    for (const held of result.bonusItems) bonusItems.push({ itemType: 'held_item', itemData: held });
    if (bonusItems.length > 0) onAddItems(bonusItems);

    const packCards: PackCard[] = instances.map((inst) => ({
      type: 'pokemon' as const,
      name: inst.pokemon.name,
      sprite: inst.pokemon.sprite,
      tier: inst.pokemon.tier,
      nature: inst.nature,
      ability: inst.ability,
      moves: (inst.learnedMoves ?? inst.pokemon.moves) as [string, string],
    }));

    for (const tm of result.bonusTMs) {
      packCards.push({
        type: 'tm',
        name: tm,
        sprite: getTMSprite(tm),
        tier: 'uncommon',
        label: 'TM ' + getMoveType(tm),
      });
    }
    for (const held of result.bonusItems) {
      packCards.push({
        type: 'item',
        name: getHeldItemName(held),
        sprite: getHeldItemSprite(held),
        tier: 'rare',
        label: 'Held Item',
      });
    }

    setCards(packCards);
    setRevealIndex(0);
    setSwiping(false);
    setSwipeX(0);
    setPhase('opening');
    setTimeout(() => setPhase('reveal'), 1800);
  };

  const swipeThreshold = 80;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (phase !== 'reveal' || swiping) return;
    dragStartX.current = e.clientX;
    dragging.current = true;
    setSwipeX(0);
  }, [phase, swiping]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStartX.current;
    setSwipeX(dx);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (Math.abs(swipeX) > swipeThreshold && cards) {
      setSwiping(true);
      const dir = swipeX > 0 ? 1 : -1;
      setSwipeX(dir * window.innerWidth);
      setTimeout(() => {
        const next = revealIndex + 1;
        if (next >= cards.length) {
          setPhase('idle');
          setCards(null);
        } else {
          setRevealIndex(next);
        }
        setSwiping(false);
        setSwipeX(0);
      }, 250);
    } else {
      setSwipeX(0);
    }
  }, [swipeX, cards, revealIndex]);

  const handleTap = useCallback(() => {
    if (phase !== 'reveal' || swiping || !cards) return;
    if (Math.abs(swipeX) > 5) return;
    setSwiping(true);
    setSwipeX(-window.innerWidth);
    setTimeout(() => {
      const next = revealIndex + 1;
      if (next >= cards.length) {
        setPhase('idle');
        setCards(null);
      } else {
        setRevealIndex(next);
      }
      setSwiping(false);
      setSwipeX(0);
    }, 250);
  }, [phase, swiping, cards, revealIndex, swipeX]);

  const tierDef = PACK_TIERS.find((t) => t.id === selectedTier)!;

  return (
    <div className="store-screen">
      <div className="ds-topbar">
        <button className="ds-btn ds-btn-ghost ds-btn-sm" onClick={() => navigate('/play')}>← Back</button>
        <div className="ds-topbar-title">Expansion Shop</div>
        <div className="ds-stat ds-stat-essence"><span className="ds-stat-icon">✦</span>{essence}</div>
      </div>

      <div className="store-tier-row" role="tablist" aria-label="Pack tier">
        {PACK_TIERS.map((t) => {
          const active = t.id === selectedTier;
          const visualRarity = TIER_RARITY[t.id];
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              className={`store-tier-btn ds-rarity-${visualRarity} ${active ? 'active' : ''}`}
              onClick={() => chooseTier(t.id)}
            >
              <span className="store-tier-name">{t.name}</span>
              <span className="store-tier-meta">{t.cards} cards · ×{t.costMultiplier}</span>
            </button>
          );
        })}
      </div>

      <div className="store-tier-info">
        <span>
          {tierDef.guaranteedHighTier ? '★ Guaranteed Epic+ pull · ' : ''}
          {tierDef.bonusTmCount} TM{tierDef.bonusTmCount !== 1 ? 's' : ''}
          {' · '}
          {tierDef.bonusItemCount} held item{tierDef.bonusItemCount !== 1 ? 's' : ''}
        </span>
        <span className="store-tier-weights">
          {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as const)
            .filter((t) => tierDef.weights[t] > 0)
            .map((t) => `${t[0].toUpperCase()}${t.slice(1)} ${tierDef.weights[t]}%`)
            .join(' · ')}
        </span>
      </div>

      <div className="store-boxes">
        {PACKS.map((pack) => {
          const cost = packTierCost(pack.id, selectedTier);
          const canAfford = essence >= cost;
          const poolSize = getPackPoolSize(pack.id);
          const rarity = TIER_RARITY[selectedTier];
          return (
            <div
              key={pack.id}
              className={`store-box ds-rarity-${rarity} ${canAfford ? '' : 'disabled'}`}
              onClick={() => canAfford && handleBuy(pack.id)}
              title={canAfford ? '' : `Need ${cost - essence} more essence`}
            >
              <div className="store-box-icon">{pack.icon}</div>
              <div className="store-box-info">
                <div className="store-box-name">{pack.name}</div>
                <div className="store-box-desc">
                  {pack.description} — {poolSize} Pokémon in pool — {tierDef.cards} per pack
                </div>
              </div>
              <div className="store-box-cost">✦ {cost}</div>
            </div>
          );
        })}
      </div>

      {phase === 'opening' && (
        <div className="pack-overlay">
          <div className="pack-opening-anim">
            <div className="pack-box-icon">🎁</div>
            <div className="pack-burst" />
          </div>
        </div>
      )}

      {phase === 'reveal' && cards && (
        <div
          className="pack-overlay pack-reveal"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleTap}
          style={{ touchAction: 'none' }}
        >
          <div className="pack-counter">{revealIndex + 1} / {cards.length}</div>

          {cards.slice(revealIndex).reverse().map((card, ri) => {
            const stackIndex = cards.length - revealIndex - 1 - ri;
            const isTop = stackIndex === 0;
            const depth = stackIndex;

            const borderClass = `tier-border-${card.tier}`;
            const badgeClass = `tier-${card.tier}`;

            const isDragging = isTop && swipeX !== 0 && !swiping;

            return (
              <div
                key={`card-${revealIndex + stackIndex}`}
                className={`pack-reveal-card ${isTop && swiping ? 'swiping' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{
                  transform: isTop
                    ? `translateX(${swipeX}px) rotate(${swipeX * 0.05}deg)`
                    : `scale(${1 - depth * 0.04}) translateY(${depth * 8}px)`,
                  zIndex: 20 - stackIndex,
                  pointerEvents: isTop ? 'auto' : 'none',
                }}
              >
                <div className={`pack-card-inner ${borderClass}`}>
                  <img
                    src={card.sprite}
                    alt={card.name}
                    className={card.type === 'pokemon' ? 'pack-reveal-sprite' : 'pack-reveal-sprite-item'}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                  <div className="pack-reveal-name">{card.name}</div>
                  {card.type === 'pokemon' && card.moves && (
                    <div className="pack-reveal-info">
                      <span className="pack-reveal-nature">{card.nature}</span>
                      {card.ability && <span className="pack-reveal-ability">{card.ability}</span>}
                      <span className="pack-reveal-moves">{card.moves[0]} / {card.moves[1]}</span>
                    </div>
                  )}
                  {card.label && (
                    <div className="pack-reveal-info">
                      <span className="pack-reveal-nature">{card.label}</span>
                    </div>
                  )}
                  <div className={`pack-reveal-badge ${badgeClass}`}>
                    {card.type === 'pokemon'
                      ? <RarityStars tier={card.tier as BoxTier} size="sm" />
                      : card.type === 'tm' ? 'TM' : 'Item'}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="pack-swipe-hint">
            {cards.length - revealIndex > 1 ? 'Swipe or tap to reveal next' : 'Swipe or tap to finish'}
          </div>
        </div>
      )}
    </div>
  );
}
