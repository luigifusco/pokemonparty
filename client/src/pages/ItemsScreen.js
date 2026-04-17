import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTMSprite, getMoveType } from '@shared/move-data';
import { getBoostSprite, getBoostName, BOOST_ITEMS, MAX_IV } from '@shared/boost-data';
import { HELD_ITEMS_BY_ID, getHeldItemSprite, getHeldItemName } from '@shared/held-item-data';
import { STAT_LABELS } from '@shared/natures';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { getEffectiveMoves } from '@shared/types';
import { canLearnMove } from '@shared/tm-learnsets';
import PokemonIcon from '../components/PokemonIcon';
import './ItemsScreen.css';
export default function ItemsScreen({ items, collection, onTeachTM, onUseBoost, onGiveHeldItem, onTakeHeldItem }) {
    const navigate = useNavigate();
    const [teachPhase, setTeachPhase] = useState(null);
    const [heldItemPhase, setHeldItemPhase] = useState(null);
    const [boostPhase, setBoostPhase] = useState(null);
    // Group TMs by move name
    const tmGroups = [];
    const tmCounts = new Map();
    for (const item of items) {
        if (item.itemType === 'tm') {
            tmCounts.set(item.itemData, (tmCounts.get(item.itemData) ?? 0) + 1);
        }
    }
    for (const [moveName, count] of [...tmCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        tmGroups.push({ moveName, count });
    }
    // Group Tokens by pokemon ID
    const tokenGroups = [];
    const tokenCounts = new Map();
    for (const item of items) {
        if (item.itemType === 'token') {
            const pid = Number(item.itemData);
            tokenCounts.set(pid, (tokenCounts.get(pid) ?? 0) + 1);
        }
    }
    for (const [pokemonId, count] of [...tokenCounts.entries()].sort((a, b) => a[0] - b[0])) {
        const pokemon = POKEMON_BY_ID[pokemonId];
        tokenGroups.push({ pokemonId, pokemonName: pokemon?.name ?? `#${pokemonId}`, count });
    }
    // Group Boosts by stat
    const boostGroups = [];
    const boostCounts = new Map();
    for (const item of items) {
        if (item.itemType === 'boost') {
            const stat = item.itemData;
            boostCounts.set(stat, (boostCounts.get(stat) ?? 0) + 1);
        }
    }
    for (const boost of BOOST_ITEMS) {
        const count = boostCounts.get(boost.stat);
        if (count) {
            boostGroups.push({ stat: boost.stat, name: boost.name, count });
        }
    }
    // Group Held Items by item ID
    const heldItemGroups = [];
    const heldItemCounts = new Map();
    for (const item of items) {
        if (item.itemType === 'held_item') {
            heldItemCounts.set(item.itemData, (heldItemCounts.get(item.itemData) ?? 0) + 1);
        }
    }
    for (const [itemId, count] of [...heldItemCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        heldItemGroups.push({ itemId, name: getHeldItemName(itemId), count });
    }
    // Pokemon holding items (for take-item display)
    const pokemonWithItems = collection.filter((inst) => inst.heldItem);
    const hasItems = tmGroups.length > 0 || tokenGroups.length > 0 || boostGroups.length > 0 || heldItemGroups.length > 0 || pokemonWithItems.length > 0;
    const handleUseTM = (moveName) => {
        setTeachPhase({ step: 'pickPokemon', moveName });
    };
    const handleUseBoost = (stat) => {
        setBoostPhase({ step: 'pickPokemon', stat });
    };
    const handleGiveHeldItem = (itemId) => {
        setHeldItemPhase({ step: 'pickPokemon', itemId });
    };
    const handleHeldItemPickPokemon = (inst) => {
        if (!heldItemPhase)
            return;
        onGiveHeldItem(inst, heldItemPhase.itemId);
        setHeldItemPhase(null);
    };
    const handleBoostPickPokemon = (inst) => {
        if (!boostPhase)
            return;
        if (inst.ivs[boostPhase.stat] >= MAX_IV)
            return; // already maxed
        onUseBoost(inst, boostPhase.stat);
        setBoostPhase(null);
    };
    const handlePickPokemon = (inst) => {
        if (!teachPhase || teachPhase.step !== 'pickPokemon')
            return;
        setTeachPhase({ step: 'pickMove', moveName: teachPhase.moveName, instance: inst });
    };
    const handlePickMoveSlot = (slot) => {
        if (!teachPhase || teachPhase.step !== 'pickMove')
            return;
        onTeachTM(teachPhase.instance, teachPhase.moveName, slot);
        setTeachPhase(null);
    };
    // Sorted collection for pokemon picker
    const sortedCollection = [...collection].sort((a, b) => a.pokemon.id - b.pokemon.id);
    return (_jsxs("div", { className: "items-screen", children: [_jsxs("div", { className: "items-header", children: [_jsx("button", { className: "items-back", onClick: () => navigate('/play'), children: "\u2190 Back" }), _jsx("h2", { children: "Items" }), _jsxs("div", { className: "items-count", children: [items.length, " total"] })] }), !hasItems ? (_jsx("div", { className: "items-empty", children: "No items yet. Buy packs to get TMs!" })) : (_jsxs("div", { className: "items-scroll", children: [tokenGroups.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "items-section-title", children: "Tokens" }), _jsx("div", { className: "items-grid", children: tokenGroups.map(({ pokemonId, pokemonName, count }) => (_jsxs("div", { className: "item-card token-card", children: [_jsx("div", { className: "token-icon-wrapper", children: _jsx(PokemonIcon, { pokemonId: pokemonId }) }), count > 1 && _jsxs("div", { className: "item-count", children: ["\u00D7", count] }), _jsx("div", { className: "item-name", children: pokemonName }), _jsx("div", { className: "item-type token-badge", children: "Token" })] }, `token-${pokemonId}`))) })] })), tmGroups.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "items-section-title", children: "TMs" }), _jsx("div", { className: "items-grid", children: tmGroups.map(({ moveName, count }) => {
                                    const moveType = getMoveType(moveName);
                                    return (_jsxs("div", { className: `item-card type-bg-${moveType} tm-usable`, onClick: () => handleUseTM(moveName), children: [_jsx("img", { className: "item-sprite", src: getTMSprite(moveName), alt: `TM ${moveName}` }), count > 1 && _jsxs("div", { className: "item-count", children: ["\u00D7", count] }), _jsx("div", { className: "item-name", children: moveName }), _jsx("div", { className: `item-type type-${moveType}`, children: moveType })] }, moveName));
                                }) })] })), boostGroups.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "items-section-title", children: "Boosts" }), _jsx("div", { className: "items-grid", children: boostGroups.map(({ stat, name, count }) => (_jsxs("div", { className: "item-card boost-card boost-usable", onClick: () => handleUseBoost(stat), children: [_jsx("img", { className: "item-sprite boost-sprite", src: getBoostSprite(stat), alt: name }), count > 1 && _jsxs("div", { className: "item-count", children: ["\u00D7", count] }), _jsx("div", { className: "item-name", children: name }), _jsx("div", { className: "item-type boost-badge", children: STAT_LABELS[stat] })] }, `boost-${stat}`))) })] })), (heldItemGroups.length > 0 || pokemonWithItems.length > 0) && (_jsxs(_Fragment, { children: [_jsx("div", { className: "items-section-title", children: "Held Items" }), heldItemGroups.length > 0 && (_jsx("div", { className: "items-grid", children: heldItemGroups.map(({ itemId, name, count }) => (_jsxs("div", { className: "item-card held-item-card held-usable", onClick: () => handleGiveHeldItem(itemId), children: [_jsx("img", { className: "item-sprite", src: getHeldItemSprite(itemId), alt: name }), count > 1 && _jsxs("div", { className: "item-count", children: ["\u00D7", count] }), _jsx("div", { className: "item-name", children: name }), _jsx("div", { className: "item-type held-badge", children: "Give" })] }, `held-${itemId}`))) })), pokemonWithItems.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "items-subsection-title", children: "Held by Pok\u00E9mon" }), _jsx("div", { className: "items-grid", children: pokemonWithItems.map((inst) => (_jsxs("div", { className: "item-card held-pokemon-card", onClick: () => onTakeHeldItem(inst), children: [_jsx("img", { className: "item-sprite", src: inst.pokemon.sprite, alt: inst.pokemon.name, style: { imageRendering: 'pixelated' } }), _jsx("div", { className: "item-name", children: inst.pokemon.name }), _jsxs("div", { className: "held-item-badge", children: [_jsx("img", { src: getHeldItemSprite(inst.heldItem), alt: "", className: "held-item-mini" }), _jsx("span", { children: getHeldItemName(inst.heldItem) })] }), _jsx("div", { className: "item-type take-badge", children: "Take" })] }, inst.instanceId))) })] }))] }))] })), teachPhase?.step === 'pickPokemon' && (() => {
                const eligible = sortedCollection.filter((inst) => canLearnMove(inst.pokemon.name, teachPhase.moveName));
                return (_jsx("div", { className: "teach-overlay", onClick: (e) => e.target === e.currentTarget && setTeachPhase(null), children: _jsxs("div", { className: "teach-content", children: [_jsxs("div", { className: "teach-header", children: [_jsxs("span", { children: ["Teach ", _jsx("strong", { children: teachPhase.moveName }), " to..."] }), _jsx("button", { className: "teach-close", onClick: () => setTeachPhase(null), children: "\u2715" })] }), eligible.length === 0 ? (_jsx("div", { className: "teach-empty", children: "No Pok\u00E9mon in your collection can learn this move" })) : (_jsx("div", { className: "teach-pokemon-grid", children: eligible.map((inst) => (_jsxs("div", { className: "teach-pokemon-card", onClick: () => handlePickPokemon(inst), children: [_jsx("img", { src: inst.pokemon.sprite, alt: inst.pokemon.name }), _jsx("div", { className: "teach-pokemon-name", children: inst.pokemon.name })] }, inst.instanceId))) }))] }) }));
            })(), teachPhase?.step === 'pickMove' && (_jsx("div", { className: "teach-overlay", onClick: (e) => e.target === e.currentTarget && setTeachPhase(null), children: _jsxs("div", { className: "teach-content teach-move-content", children: [_jsxs("div", { className: "teach-header", children: [_jsx("button", { className: "teach-back", onClick: () => setTeachPhase({ step: 'pickPokemon', moveName: teachPhase.moveName }), children: "\u2190" }), _jsx("span", { children: "Replace a move" }), _jsx("button", { className: "teach-close", onClick: () => setTeachPhase(null), children: "\u2715" })] }), _jsxs("div", { className: "teach-pokemon-preview", children: [_jsx("img", { src: teachPhase.instance.pokemon.sprite, alt: teachPhase.instance.pokemon.name }), _jsx("span", { children: teachPhase.instance.pokemon.name })] }), _jsxs("div", { className: "teach-new-move", children: [_jsx("img", { className: "teach-tm-icon", src: getTMSprite(teachPhase.moveName), alt: "TM" }), _jsx("span", { className: `teach-new-move-name type-${getMoveType(teachPhase.moveName)}`, children: teachPhase.moveName })] }), _jsx("div", { className: "teach-arrow", children: "\u25BC replaces \u25BC" }), _jsx("div", { className: "teach-move-slots", children: getEffectiveMoves(teachPhase.instance).map((move, i) => {
                                const moveType = getMoveType(move);
                                return (_jsxs("button", { className: `teach-move-slot type-bg-${moveType}`, onClick: () => handlePickMoveSlot(i), children: [_jsx("span", { className: "teach-move-slot-name", children: move }), _jsx("span", { className: `teach-move-slot-type type-${moveType}`, children: moveType })] }, i));
                            }) })] }) })), boostPhase?.step === 'pickPokemon' && (_jsx("div", { className: "teach-overlay", onClick: (e) => e.target === e.currentTarget && setBoostPhase(null), children: _jsxs("div", { className: "teach-content", children: [_jsxs("div", { className: "teach-header", children: [_jsxs("span", { children: ["Use ", _jsx("strong", { children: getBoostName(boostPhase.stat) }), " on..."] }), _jsx("button", { className: "teach-close", onClick: () => setBoostPhase(null), children: "\u2715" })] }), _jsxs("div", { className: "boost-hint", children: ["Max ", STAT_LABELS[boostPhase.stat], " IV \u2192 ", MAX_IV] }), sortedCollection.length === 0 ? (_jsx("div", { className: "teach-empty", children: "No Pok\u00E9mon in your collection" })) : (_jsx("div", { className: "teach-pokemon-grid", children: sortedCollection.map((inst) => {
                                const isMaxed = inst.ivs[boostPhase.stat] >= MAX_IV;
                                return (_jsxs("div", { className: `teach-pokemon-card ${isMaxed ? 'boost-maxed' : ''}`, onClick: () => !isMaxed && handleBoostPickPokemon(inst), children: [_jsx("img", { src: inst.pokemon.sprite, alt: inst.pokemon.name }), _jsx("div", { className: "teach-pokemon-name", children: inst.pokemon.name }), _jsxs("div", { className: "boost-iv-label", children: [STAT_LABELS[boostPhase.stat], ": ", inst.ivs[boostPhase.stat], isMaxed ? ' ✓' : ''] })] }, inst.instanceId));
                            }) }))] }) })), heldItemPhase?.step === 'pickPokemon' && (() => {
                const eligible = sortedCollection.filter((inst) => !inst.heldItem);
                return (_jsx("div", { className: "teach-overlay", onClick: (e) => e.target === e.currentTarget && setHeldItemPhase(null), children: _jsxs("div", { className: "teach-content", children: [_jsxs("div", { className: "teach-header", children: [_jsxs("span", { children: ["Give ", _jsx("strong", { children: getHeldItemName(heldItemPhase.itemId) }), " to..."] }), _jsx("button", { className: "teach-close", onClick: () => setHeldItemPhase(null), children: "\u2715" })] }), _jsx("div", { className: "held-item-desc", style: { fontSize: '11px', color: '#aaa', padding: '0 12px 8px', textAlign: 'center' }, children: HELD_ITEMS_BY_ID[heldItemPhase.itemId]?.description }), eligible.length === 0 ? (_jsx("div", { className: "teach-empty", children: "All Pok\u00E9mon are already holding items" })) : (_jsx("div", { className: "teach-pokemon-grid", children: eligible.map((inst) => (_jsxs("div", { className: "teach-pokemon-card", onClick: () => handleHeldItemPickPokemon(inst), children: [_jsx("img", { src: inst.pokemon.sprite, alt: inst.pokemon.name }), _jsx("div", { className: "teach-pokemon-name", children: inst.pokemon.name })] }, inst.instanceId))) }))] }) }));
            })()] }));
}
