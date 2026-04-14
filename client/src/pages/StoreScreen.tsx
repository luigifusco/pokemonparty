import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PACKS } from '@shared/pack-data';
import { openPack, getPackPoolSize, DEFAULT_RARITY_WEIGHTS } from '@shared/boxes';
import { getTMSprite, getMoveType } from '@shared/move-data';
import { getHeldItemSprite, getHeldItemName } from '@shared/held-item-data';
import type { BoxTier, PokemonInstance } from '@shared/types';
import { BASE_PATH } from '../config';
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

export default function StoreScreen({ essence, onSpendEssence, onAddPokemon, onAddItems }: StoreScreenProps) {
  const navigate = useNavigate();
  const [cards, setCards] = useState<PackCard[] | null>(null);
  const [phase, setPhase] = useState<'idle' | 'opening' | 'reveal'>('idle');
  const [revealIndex, setRevealIndex] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const dragStartX = useRef(0);
  const dragging = useRef(false);
  const [rarityWeights, setRarityWeights] = useState<Record<BoxTier, number>>(DEFAULT_RARITY_WEIGHTS);

  useEffect(() => {
    fetch(`${BASE_PATH}/api/settings/rarity-weights`)
      .then((r) => r.json())
      .then(setRarityWeights)
      .catch(() => {});
  }, []);

  const handleBuy = async (packId: string, cost: number) => {
    if (essence < cost) return;

    const result = openPack(packId, rarityWeights);
    onSpendEssence(cost);

    const instances = await onAddPokemon(result.pokemon.map((p) => p.id));

    // Persist bonus TM and item
    const bonusItems: { itemType: string; itemData: string }[] = [];
    if (result.bonusTM) bonusItems.push({ itemType: 'tm', itemData: result.bonusTM });
    if (result.bonusItem) bonusItems.push({ itemType: 'held_item', itemData: result.bonusItem });
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

    // Add bonus TM card
    if (result.bonusTM) {
      packCards.push({
        type: 'tm',
        name: result.bonusTM,
        sprite: getTMSprite(result.bonusTM),
        tier: 'uncommon',
        label: 'TM ' + getMoveType(result.bonusTM),
      });
    }

    // Add bonus held item card
    if (result.bonusItem) {
      packCards.push({
        type: 'item',
        name: getHeldItemName(result.bonusItem),
        sprite: getHeldItemSprite(result.bonusItem),
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
    if (Math.abs(swipeX) > 5) return; // was dragging
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

  const currentCard = cards?.[revealIndex];
  const remaining = cards ? cards.length - revealIndex : 0;

  return (
    <div className="store-screen">
      <div className="store-header">
        <button className="store-back" onClick={() => navigate('/play')}>← Back</button>
        <h2>Expansion Shop</h2>
        <div className="store-essence">✦ {essence}</div>
      </div>
      <div className="store-boxes">
        {PACKS.map((pack) => {
          const canAfford = essence >= pack.cost;
          const poolSize = getPackPoolSize(pack.id);
          return (
            <div
              key={pack.id}
              className={`store-box ${canAfford ? '' : 'disabled'}`}
              onClick={() => canAfford && handleBuy(pack.id, pack.cost)}
            >
              <div className="store-box-icon">{pack.icon}</div>
              <div className="store-box-info">
                <div className="store-box-name">{pack.name}</div>
                <div className="store-box-desc">{pack.description} — {poolSize} Pokémon in pool — 5 per pack</div>
              </div>
              <div className="store-box-cost">✦ {pack.cost}</div>
            </div>
          );
        })}
      </div>

      {/* Opening animation */}
      {phase === 'opening' && (
        <div className="pack-overlay">
          <div className="pack-opening-anim">
            <div className="pack-box-icon">🎁</div>
            <div className="pack-burst" />
          </div>
        </div>
      )}

      {/* Card reveal phase */}
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

          {/* Render all remaining cards in a stack, bottom to top */}
          {cards.slice(revealIndex).reverse().map((card, ri) => {
            const stackIndex = cards.length - revealIndex - 1 - ri; // 0 = top card
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
                    {card.type === 'pokemon' ? card.tier : card.type === 'tm' ? 'TM' : 'Item'}
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
