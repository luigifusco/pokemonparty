import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BOX_COSTS } from '@shared/essence';
import { openBox, getPoolSize } from '@shared/boxes';
import type { BoxTier, Pokemon } from '@shared/types';
import './StoreScreen.css';

const TIERS: { tier: BoxTier; icon: string; desc: string }[] = [
  { tier: 'common', icon: '📦', desc: 'Weak evolution lines' },
  { tier: 'uncommon', icon: '🎁', desc: 'Moderate evolution lines' },
  { tier: 'rare', icon: '💎', desc: 'Strong evolution lines' },
  { tier: 'legendary', icon: '🌟', desc: 'Legendary & pseudo-legendary' },
];

interface StoreScreenProps {
  essence: number;
  onSpendEssence: (amount: number) => void;
  onAddPokemon: (pokemon: Pokemon[]) => void;
}

export default function StoreScreen({ essence, onSpendEssence, onAddPokemon }: StoreScreenProps) {
  const navigate = useNavigate();
  const [opened, setOpened] = useState<Pokemon[] | null>(null);

  const handleBuy = (tier: BoxTier) => {
    const cost = BOX_COSTS[tier];
    if (essence < cost) return;

    const result = openBox(tier);
    onSpendEssence(cost);
    onAddPokemon(result);
    setOpened(result);
  };

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

      {opened && (
        <div className="pack-overlay" onClick={(e) => e.target === e.currentTarget && setOpened(null)}>
          <div className="pack-title">You got:</div>
          <div className="pack-results">
            {opened.map((p, i) => (
              <div key={i} className="pack-card">
                <img src={p.sprite} alt={p.name} />
                <div className="pack-card-name">{p.name}</div>
                <div className={`pack-card-tier tier-${p.tier}`}>{p.tier}</div>
              </div>
            ))}
          </div>
          <button className="pack-close" onClick={() => setOpened(null)}>OK</button>
        </div>
      )}
    </div>
  );
}
