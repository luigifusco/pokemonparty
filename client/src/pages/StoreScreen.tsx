import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BOX_COSTS } from '@shared/essence';
import { openBox, getPoolSize, rollTM } from '@shared/boxes';
import { getTMSprite, getMoveType } from '@shared/move-data';
import { rollBoost, getBoostSprite, getBoostName } from '@shared/boost-data';
import type { StatKey } from '@shared/boost-data';
import type { BoxTier, PokemonInstance } from '@shared/types';
import './StoreScreen.css';

const TIERS: { tier: BoxTier; icon: string; desc: string }[] = [
  { tier: 'common', icon: '📦', desc: 'Weak evolution lines' },
  { tier: 'uncommon', icon: '🎁', desc: 'Moderate evolution lines' },
  { tier: 'rare', icon: '💎', desc: 'Strong evolution lines' },
  { tier: 'epic', icon: '🌟', desc: 'Pseudo-legendary lines' },
  { tier: 'legendary', icon: '⚡', desc: 'Legendary & mythical' },
];

interface PackCard {
  type: 'pokemon' | 'tm' | 'boost';
  name: string;
  sprite: string;
  tier?: string;
  moveType?: string;
  nature?: string;
  ability?: string;
  moves?: [string, string];
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

  const handleBuy = async (tier: BoxTier) => {
    const cost = BOX_COSTS[tier];
    if (essence < cost) return;

    const result = openBox(tier);
    const tm = rollTM();
    const boost = rollBoost();
    onSpendEssence(cost);

    // Create pokemon on server first to get real nature/ability
    const instances = await onAddPokemon(result.map((p) => p.id));

    onAddItems([
      { itemType: 'tm', itemData: tm },
      { itemType: 'boost', itemData: boost },
    ]);

    const packCards: PackCard[] = [
      ...instances.map((inst) => ({
        type: 'pokemon' as const,
        name: inst.pokemon.name,
        sprite: inst.pokemon.sprite,
        tier: inst.pokemon.tier,
        nature: inst.nature,
        ability: inst.ability,
        moves: (inst.learnedMoves ?? inst.pokemon.moves) as [string, string],
      })),
      { type: 'tm', name: tm, sprite: getTMSprite(tm), moveType: getMoveType(tm) },
      { type: 'boost', name: getBoostName(boost), sprite: getBoostSprite(boost) },
    ];
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
        {TIERS.map(({ tier, icon, desc }) => {
          const cost = BOX_COSTS[tier];
          const canAfford = essence >= cost;
          const poolSize = getPoolSize(tier);
          return (
            <div
              key={tier}
              className={`store-box tier-${tier} ${canAfford ? '' : 'disabled'}`}
              onClick={() => canAfford && handleBuy(tier)}
            >
              <div className="store-box-icon">{icon}</div>
              <div className="store-box-info">
                <div className="store-box-name">{tier} Box</div>
                <div className="store-box-desc">{desc} — {poolSize} Pokémon in pool — 3 per pack</div>
              </div>
              <div className="store-box-cost">✦ {cost}</div>
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

            const borderClass =
              card.type === 'pokemon' ? `tier-border-${card.tier}` :
              card.type === 'tm' ? `type-border-${card.moveType}` : 'boost-border';
            const badgeClass =
              card.type === 'pokemon' ? `tier-${card.tier}` :
              card.type === 'tm' ? `type-${card.moveType}` : 'tier-boost';

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
                  <div className={`pack-reveal-badge ${badgeClass}`}>
                    {card.type === 'pokemon' ? card.tier :
                     card.type === 'tm' ? 'TM' : 'Boost'}
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
