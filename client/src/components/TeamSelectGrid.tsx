import PokemonIcon from './PokemonIcon';
import { getEffectiveMoves } from '@shared/types';
import type { PokemonInstance } from '@shared/types';
import { getHeldItemSprite, getHeldItemName } from '@shared/held-item-data';

interface TeamSelectGridProps {
  instances: PokemonInstance[];
  selected: number[];          // indices into `instances`
  onToggle: (idx: number) => void;
  teamSize: number;
  disabled?: boolean;
  disabledIndices?: Set<number>;
  onSubmit?: () => void;
  submitLabel?: string;
  headerLeft?: React.ReactNode;
  headerCenter?: React.ReactNode;
  headerRight?: React.ReactNode;
  aboveGrid?: React.ReactNode;
  recentPokemonIds?: number[];
}

export default function TeamSelectGrid({
  instances,
  selected,
  onToggle,
  teamSize,
  disabled = false,
  disabledIndices,
  onSubmit,
  submitLabel = '⚔️ Lock In!',
  headerLeft,
  headerCenter,
  headerRight,
  aboveGrid,
  recentPokemonIds,
}: TeamSelectGridProps) {
  const recentSet = new Set(recentPokemonIds ?? []);
  const sortedIndices = instances.map((_, i) => i).sort((a, b) => {
    const aFav = instances[a].favorite ? 0 : 1;
    const bFav = instances[b].favorite ? 0 : 1;
    if (aFav !== bFav) return aFav - bFav;
    const aRecent = recentSet.has(instances[a].pokemon.id) ? 0 : 1;
    const bRecent = recentSet.has(instances[b].pokemon.id) ? 0 : 1;
    if (aRecent !== bRecent) return aRecent - bRecent;
    return instances[a].pokemon.id - instances[b].pokemon.id;
  });

  return (
    <div className="battle-mp-screen">
      <div className="battle-mp-team-header">
        {headerLeft}
        {headerCenter}
        {headerRight}
      </div>

      {aboveGrid}

      {!disabled && (
        <>
          <div className="team-select-chosen">
            {selected.map((idx) => {
              const p = instances[idx].pokemon;
              return (
                <div key={`sel-${idx}`} className="team-select-chosen-card" onClick={() => onToggle(idx)}>
                  <img src={p.sprite} alt={p.name} />
                  <PokemonIcon pokemonId={p.id} className="team-select-sprite-icon" />
                  <span>{p.name}</span>
                </div>
              );
            })}
            {Array.from({ length: teamSize - selected.length }).map((_, i) => (
              <div key={`empty-${i}`} className="team-select-chosen-card empty">?</div>
            ))}
          </div>
          {onSubmit && (
            <div style={{ textAlign: 'center', padding: '8px 12px 4px' }}>
              <button className="team-select-go" onClick={onSubmit}>{submitLabel}</button>
            </div>
          )}
        </>
      )}

      <div className="team-select-scroll">
        <div className="team-select-grid">
          {sortedIndices.map((idx) => {
            const inst = instances[idx];
            const p = inst.pokemon;
            const moves = getEffectiveMoves(inst);
            const isSelected = selected.includes(idx);
            const isDisabled = disabledIndices?.has(idx) ?? false;
            const isRecent = recentSet.has(p.id);
            const isFavorite = !!inst.favorite;
            return (
              <div
                key={idx}
                className={`team-select-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'drafted' : ''} ${isRecent ? 'recent' : ''} ${isFavorite ? 'favorite' : ''}`}
                onClick={() => !disabled && !isDisabled && onToggle(idx)}
              >
                {isFavorite && <span className="favorite-badge" title="Favorite">★</span>}
                {isRecent && !isFavorite && <span className="recent-badge">★</span>}
                <img src={p.sprite} alt={p.name} />
                <PokemonIcon pokemonId={p.id} className="team-select-sprite-icon" />
                <div className="team-select-card-name">{p.name}</div>
                <div className="team-select-card-info">
                  <div className="team-select-card-nature">{inst.nature}</div>
                  {inst.ability && <div className="team-select-card-ability">{inst.ability}</div>}
                  <div className="team-select-card-moves">
                    {moves.map((m, i) => (
                      <span key={i} className="team-select-card-move">{m}</span>
                    ))}
                  </div>
                  {inst.heldItem && (
                    <div className="team-select-card-held">
                      <img src={getHeldItemSprite(inst.heldItem)} alt="" className="team-select-held-icon" />
                      <span>{getHeldItemName(inst.heldItem)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
