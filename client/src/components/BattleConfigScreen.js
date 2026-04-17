import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { DEFAULT_BATTLE_CONFIG } from '@shared/battle-types';
import './BattleConfigScreen.css';
const VALID_TOTALS = {
    1: [1, 2, 3, 4, 5, 6],
    2: [2, 4, 6],
    3: [3, 6],
};
export default function BattleConfigScreen({ onConfirm, onBack, showDraftOption = true, showOwnPokemonOption = false, ownPokemonCount = 0 }) {
    const [fieldSize, setFieldSize] = useState(DEFAULT_BATTLE_CONFIG.fieldSize);
    const [totalPokemon, setTotalPokemon] = useState(DEFAULT_BATTLE_CONFIG.totalPokemon);
    const [selectionMode, setSelectionMode] = useState(DEFAULT_BATTLE_CONFIG.selectionMode);
    const [useOwnPokemon, setUseOwnPokemon] = useState(false);
    const validTotals = VALID_TOTALS[fieldSize];
    const handleFieldSize = (fs) => {
        setFieldSize(fs);
        // Reset total if current value isn't valid for new field size
        if (!VALID_TOTALS[fs].includes(totalPokemon)) {
            setTotalPokemon(fs);
        }
    };
    return (_jsxs("div", { className: "bconfig-screen", children: [_jsxs("div", { className: "bconfig-header", children: [_jsx("button", { className: "bconfig-back", onClick: onBack, children: "\u2190 Back" }), _jsx("h2", { children: "\u2699\uFE0F Battle Settings" })] }), _jsxs("div", { className: "bconfig-content", children: [_jsxs("div", { className: "bconfig-group", children: [_jsx("div", { className: "bconfig-label", children: "Pok\u00E9mon on field (per side)" }), _jsx("div", { className: "bconfig-options", children: [1, 2, 3].map((n) => (_jsxs("button", { className: `bconfig-option ${fieldSize === n ? 'active' : ''}`, onClick: () => handleFieldSize(n), children: [n, "v", n] }, n))) })] }), _jsxs("div", { className: "bconfig-group", children: [_jsx("div", { className: "bconfig-label", children: "Total Pok\u00E9mon per player" }), _jsx("div", { className: "bconfig-options", children: validTotals.map((n) => (_jsx("button", { className: `bconfig-option ${totalPokemon === n ? 'active' : ''}`, onClick: () => setTotalPokemon(n), children: n }, n))) }), totalPokemon > fieldSize && (_jsxs("div", { className: "bconfig-hint", children: [totalPokemon - fieldSize, " reserve(s) \u2014 fainted Pok\u00E9mon are replaced"] }))] }), showDraftOption && (_jsxs("div", { className: "bconfig-group", children: [_jsx("div", { className: "bconfig-label", children: "Selection mode" }), _jsxs("div", { className: "bconfig-options", children: [_jsx("button", { className: `bconfig-option ${selectionMode === 'blind' ? 'active' : ''}`, onClick: () => setSelectionMode('blind'), children: "\u2694\uFE0F Blind" }), _jsx("button", { className: `bconfig-option ${selectionMode === 'draft' ? 'active' : ''}`, onClick: () => setSelectionMode('draft'), children: "\u26A1 Draft" })] })] })), showOwnPokemonOption && (_jsxs("div", { className: "bconfig-group", children: [_jsx("div", { className: "bconfig-label", children: "Pok\u00E9mon source" }), _jsxs("div", { className: "bconfig-options", children: [_jsx("button", { className: `bconfig-option ${!useOwnPokemon ? 'active' : ''}`, onClick: () => setUseOwnPokemon(false), children: "\uD83D\uDCCB All Pok\u00E9mon" }), _jsxs("button", { className: `bconfig-option ${useOwnPokemon ? 'active' : ''} ${ownPokemonCount === 0 ? 'disabled' : ''}`, onClick: () => ownPokemonCount > 0 && setUseOwnPokemon(true), children: ["\uD83C\uDF92 My Pok\u00E9mon (", ownPokemonCount, ")"] })] })] })), _jsx("button", { className: "bconfig-start", onClick: () => onConfirm({ fieldSize, totalPokemon, selectionMode, ...(useOwnPokemon ? { useOwnPokemon: true } : {}) }), children: "Continue \u2192" })] })] }));
}
