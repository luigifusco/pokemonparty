import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import PokemonIcon from './PokemonIcon';
import { getEffectiveMoves } from '@shared/types';
import { getHeldItemSprite, getHeldItemName } from '@shared/held-item-data';
export default function TeamSelectGrid({ instances, selected, onToggle, teamSize, disabled = false, disabledIndices, onSubmit, submitLabel = '⚔️ Lock In!', headerLeft, headerCenter, headerRight, aboveGrid, }) {
    const sortedIndices = instances.map((_, i) => i).sort((a, b) => instances[a].pokemon.id - instances[b].pokemon.id);
    return (_jsxs("div", { className: "battle-mp-screen", children: [_jsxs("div", { className: "battle-mp-team-header", children: [headerLeft, headerCenter, headerRight] }), aboveGrid, !disabled && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "team-select-chosen", style: { padding: '4px 8px' }, children: [selected.map((idx) => {
                                const p = instances[idx].pokemon;
                                return (_jsxs("div", { className: "team-select-chosen-card", onClick: () => onToggle(idx), children: [_jsx("img", { src: p.sprite, alt: p.name }), _jsx(PokemonIcon, { pokemonId: p.id, className: "team-select-sprite-icon" }), _jsx("span", { children: p.name })] }, `sel-${idx}`));
                            }), Array.from({ length: teamSize - selected.length }).map((_, i) => (_jsx("div", { className: "team-select-chosen-card empty", children: "?" }, `empty-${i}`)))] }), onSubmit && (_jsx("div", { style: { textAlign: 'center', padding: '4px' }, children: _jsx("button", { className: "team-select-go", onClick: onSubmit, children: submitLabel }) }))] })), _jsx("div", { className: "team-select-scroll", children: _jsx("div", { className: "team-select-grid", children: sortedIndices.map((idx) => {
                        const inst = instances[idx];
                        const p = inst.pokemon;
                        const moves = getEffectiveMoves(inst);
                        const isSelected = selected.includes(idx);
                        const isDisabled = disabledIndices?.has(idx) ?? false;
                        return (_jsxs("div", { className: `team-select-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'drafted' : ''}`, onClick: () => !disabled && !isDisabled && onToggle(idx), children: [_jsx("img", { src: p.sprite, alt: p.name }), _jsx(PokemonIcon, { pokemonId: p.id, className: "team-select-sprite-icon" }), _jsx("div", { className: "team-select-card-name", children: p.name }), _jsxs("div", { className: "team-select-card-info", children: [_jsx("div", { className: "team-select-card-nature", children: inst.nature }), inst.ability && _jsx("div", { className: "team-select-card-ability", children: inst.ability }), _jsx("div", { className: "team-select-card-moves", children: moves.map((m, i) => (_jsx("span", { className: "team-select-card-move", children: m }, i))) }), inst.heldItem && (_jsxs("div", { className: "team-select-card-held", children: [_jsx("img", { src: getHeldItemSprite(inst.heldItem), alt: "", className: "team-select-held-icon" }), _jsx("span", { children: getHeldItemName(inst.heldItem) })] }))] })] }, idx));
                    }) }) })] }));
}
