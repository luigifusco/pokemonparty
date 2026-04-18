import type { BoxTier } from '@shared/types';
import './RarityStars.css';

const TIER_STARS: Record<BoxTier, number> = {
  common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5,
};

interface RarityStarsProps {
  tier: BoxTier;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function RarityStars({ tier, size = 'sm', className }: RarityStarsProps) {
  const stars = TIER_STARS[tier] ?? 1;
  return (
    <span
      className={`rarity-stars rarity-stars-${size} rarity-stars-${tier} ${className ?? ''}`}
      aria-label={tier}
      title={tier}
    >
      {'★'.repeat(stars)}
    </span>
  );
}
