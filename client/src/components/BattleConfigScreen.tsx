import { useState } from 'react';
import type { BattleConfig } from '@shared/battle-types';
import { DEFAULT_BATTLE_CONFIG } from '@shared/battle-types';
import './BattleConfigScreen.css';

interface BattleConfigScreenProps {
  onConfirm: (config: BattleConfig & { useOwnPokemon?: boolean }) => void;
  onBack: () => void;
  showDraftOption?: boolean;
  showOwnPokemonOption?: boolean;
  ownPokemonCount?: number;
}

const VALID_TOTALS: Record<number, number[]> = {
  2: [2, 4, 6],
  3: [3, 6],
};

export default function BattleConfigScreen({ onConfirm, onBack, showDraftOption = true, showOwnPokemonOption = false, ownPokemonCount = 0 }: BattleConfigScreenProps) {
  const [fieldSize, setFieldSize] = useState<2 | 3>(DEFAULT_BATTLE_CONFIG.fieldSize);
  const [totalPokemon, setTotalPokemon] = useState<number>(DEFAULT_BATTLE_CONFIG.totalPokemon);
  const [selectionMode, setSelectionMode] = useState<'blind' | 'draft'>(DEFAULT_BATTLE_CONFIG.selectionMode);
  const [useOwnPokemon, setUseOwnPokemon] = useState(false);

  const validTotals = VALID_TOTALS[fieldSize];

  const handleFieldSize = (fs: 2 | 3) => {
    setFieldSize(fs);
    // Reset total if current value isn't valid for new field size
    if (!VALID_TOTALS[fs].includes(totalPokemon)) {
      setTotalPokemon(fs);
    }
  };

  return (
    <div className="bconfig-screen">
      <div className="bconfig-header">
        <button className="bconfig-back" onClick={onBack}>← Back</button>
        <h2>⚙️ Battle Settings</h2>
      </div>
      <div className="bconfig-content">
        <div className="bconfig-group">
          <div className="bconfig-label">Pokémon on field (per side)</div>
          <div className="bconfig-options">
            {([2, 3] as const).map((n) => (
              <button
                key={n}
                className={`bconfig-option ${fieldSize === n ? 'active' : ''}`}
                onClick={() => handleFieldSize(n)}
              >
                {n}v{n}
              </button>
            ))}
          </div>
        </div>

        <div className="bconfig-group">
          <div className="bconfig-label">Total Pokémon per player</div>
          <div className="bconfig-options">
            {validTotals.map((n) => (
              <button
                key={n}
                className={`bconfig-option ${totalPokemon === n ? 'active' : ''}`}
                onClick={() => setTotalPokemon(n)}
              >
                {n}
              </button>
            ))}
          </div>
          {totalPokemon > fieldSize && (
            <div className="bconfig-hint">
              {totalPokemon - fieldSize} reserve(s) — fainted Pokémon are replaced
            </div>
          )}
        </div>

        {showDraftOption && (
          <div className="bconfig-group">
            <div className="bconfig-label">Selection mode</div>
            <div className="bconfig-options">
              <button
                className={`bconfig-option ${selectionMode === 'blind' ? 'active' : ''}`}
                onClick={() => setSelectionMode('blind')}
              >
                ⚔️ Blind
              </button>
              <button
                className={`bconfig-option ${selectionMode === 'draft' ? 'active' : ''}`}
                onClick={() => setSelectionMode('draft')}
              >
                ⚡ Draft
              </button>
            </div>
          </div>
        )}

        {showOwnPokemonOption && (
          <div className="bconfig-group">
            <div className="bconfig-label">Pokémon source</div>
            <div className="bconfig-options">
              <button
                className={`bconfig-option ${!useOwnPokemon ? 'active' : ''}`}
                onClick={() => setUseOwnPokemon(false)}
              >
                📋 All Pokémon
              </button>
              <button
                className={`bconfig-option ${useOwnPokemon ? 'active' : ''} ${ownPokemonCount === 0 ? 'disabled' : ''}`}
                onClick={() => ownPokemonCount > 0 && setUseOwnPokemon(true)}
              >
                🎒 My Pokémon ({ownPokemonCount})
              </button>
            </div>
          </div>
        )}

        <button
          className="bconfig-start"
          onClick={() => onConfirm({ fieldSize, totalPokemon, selectionMode, ...(useOwnPokemon ? { useOwnPokemon: true } : {}) })}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
