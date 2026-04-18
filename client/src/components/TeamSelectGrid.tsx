import { useState } from 'react';
import PokemonIcon from './PokemonIcon';
import { getEffectiveMoves } from '@shared/types';
import type { PokemonInstance } from '@shared/types';
import { getHeldItemSprite, getHeldItemName } from '@shared/held-item-data';
import {
  PROFILE_NAMES,
  PROFILE_INFO,
  resolveCharacterName,
  type ProfileName,
} from '@shared/character-profiles';

interface TeamSelectGridProps {
  instances: PokemonInstance[];
  selected: number[];          // indices into `instances`
  onToggle: (idx: number, character?: string | null) => void;
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
  /** When true, clicking an unselected card opens a character-picker before adding it. */
  enableCharacterPick?: boolean;
  /** Per-selected-index character override (aligned with `selected`). Shown in the chosen bar. */
  selectedCharacters?: (string | null | undefined)[];
}

export default function TeamSelectGrid({
  instances,
  selected,
  onToggle,
  teamSize,
  disabled = false,
  disabledIndices,
  onSubmit,
  submitLabel = 'Lock In!',
  headerLeft,
  headerCenter,
  headerRight,
  aboveGrid,
  recentPokemonIds,
  enableCharacterPick = false,
  selectedCharacters,
}: TeamSelectGridProps) {
  const [pendingPick, setPendingPick] = useState<number | null>(null);

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

  const handleCardClick = (idx: number) => {
    if (disabled) return;
    if (disabledIndices?.has(idx)) return;
    const isSelected = selected.includes(idx);
    if (isSelected) {
      onToggle(idx);
      return;
    }
    if (enableCharacterPick) {
      setPendingPick(idx);
    } else {
      onToggle(idx);
    }
  };

  const confirmPick = (character: string | null) => {
    if (pendingPick == null) return;
    onToggle(pendingPick, character);
    setPendingPick(null);
  };

  const pendingInst = pendingPick != null ? instances[pendingPick] : null;
  const pendingDefault: ProfileName | null = pendingInst
    ? resolveCharacterName(pendingInst.character, pendingInst.pokemon.name)
    : null;

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
            {selected.map((idx, i) => {
              const inst = instances[idx];
              const p = inst.pokemon;
              const charOverride = selectedCharacters?.[i] ?? null;
              const effectiveChar = (charOverride ?? inst.character) as ProfileName | null | undefined;
              const resolved = resolveCharacterName(effectiveChar, p.name);
              const info = PROFILE_INFO[resolved];
              return (
                <div key={`sel-${idx}`} className="team-select-chosen-card" onClick={() => onToggle(idx)}>
                  <img src={p.sprite} alt={p.name} />
                  <PokemonIcon pokemonId={p.id} className="team-select-sprite-icon" />
                  <span>{p.name}</span>
                  <span
                    className="team-select-chosen-character"
                    title={`${info.label}: ${info.blurb}`}
                    style={{ color: info.color }}
                  >
                    {info.icon} {info.label}
                  </span>
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
                onClick={() => handleCardClick(idx)}
              >
                {isFavorite && <span className="favorite-badge" title="Favorite">★</span>}
                {isRecent && !isFavorite && <span className="recent-badge">★</span>}
                {inst.heldItem && (
                  <span
                    className="team-select-held-badge"
                    title={getHeldItemName(inst.heldItem)}
                    aria-label={getHeldItemName(inst.heldItem)}
                  >
                    <img src={getHeldItemSprite(inst.heldItem)} alt="" />
                  </span>
                )}
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
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {pendingInst && pendingDefault && (
        <div className="ds-overlay" onClick={() => setPendingPick(null)}>
          <div className="ds-modal character-pick-modal" onClick={(e) => e.stopPropagation()}>
            <div className="character-pick-header">
              <PokemonIcon pokemonId={pendingInst.pokemon.id} size={32} />
              <div>
                <div className="character-pick-title">Choose battle style</div>
                <div className="character-pick-subtitle">{pendingInst.pokemon.name}</div>
              </div>
              <button className="character-pick-close" onClick={() => setPendingPick(null)}>✕</button>
            </div>
            <div className="character-pick-list">
              <button
                className="character-pick-option default"
                onClick={() => confirmPick(null)}
              >
                <span className="character-pick-icon">{PROFILE_INFO[pendingDefault].icon}</span>
                <div className="character-pick-text">
                  <div className="character-pick-name">
                    Default <span className="character-pick-default-tag">({PROFILE_INFO[pendingDefault].label})</span>
                  </div>
                  <div className="character-pick-blurb">{PROFILE_INFO[pendingDefault].blurb}</div>
                </div>
              </button>
              {PROFILE_NAMES.map((name) => {
                const info = PROFILE_INFO[name];
                return (
                  <button
                    key={name}
                    className="character-pick-option"
                    style={{ borderColor: info.color }}
                    onClick={() => confirmPick(name)}
                  >
                    <span className="character-pick-icon" style={{ color: info.color }}>{info.icon}</span>
                    <div className="character-pick-text">
                      <div className="character-pick-name" style={{ color: info.color }}>{info.label}</div>
                      <div className="character-pick-blurb">{info.blurb}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
