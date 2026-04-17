import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { getHeldItemSprite, getHeldItemName } from '@shared/held-item-data';
import PokemonCard from '../components/PokemonCard';
import './CollectionScreen.css';
const TIERS = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary'];
function getEvoTargets(pokemon) {
    if (!pokemon.evolutionTo)
        return [];
    return pokemon.evolutionTo
        .map((id) => POKEMON_BY_ID[id])
        .filter(Boolean);
}
export default function CollectionScreen({ collection, items, onEvolve, onShard }) {
    const navigate = useNavigate();
    const [evolving, setEvolving] = useState(null);
    const [evoPicker, setEvoPicker] = useState(null);
    const [sharding, setSharding] = useState(null);
    const [filter, setFilter] = useState('all');
    // Count tokens per pokemon id
    const tokenCounts = new Map();
    for (const item of items) {
        if (item.itemType === 'token') {
            const pid = Number(item.itemData);
            tokenCounts.set(pid, (tokenCounts.get(pid) ?? 0) + 1);
        }
    }
    const filtered = collection
        .filter((inst) => filter === 'all' || inst.pokemon.tier === filter)
        .sort((a, b) => a.pokemon.id - b.pokemon.id);
    const startEvolve = (inst) => {
        const targets = getEvoTargets(inst.pokemon);
        if (targets.length === 0)
            return;
        if (targets.length === 1) {
            doEvolve(inst, targets[0]);
        }
        else {
            setEvoPicker({ inst, targets });
        }
    };
    const doEvolve = (inst, target) => {
        setEvoPicker(null);
        setEvolving({ from: inst, to: target });
        setTimeout(() => {
            onEvolve(inst, target.id);
            setTimeout(() => setEvolving(null), 1200);
        }, 1500);
    };
    const handleShard = (inst) => {
        setSharding(inst);
    };
    const confirmShard = () => {
        if (!sharding)
            return;
        onShard(sharding);
        setSharding(null);
    };
    // Find the index in the original collection for navigation
    const getCollectionIndex = (inst) => collection.findIndex((c) => c.instanceId === inst.instanceId);
    return (_jsxs("div", { className: "collection-screen", children: [_jsxs("div", { className: "collection-header", children: [_jsx("button", { className: "collection-back", onClick: () => navigate('/play'), children: "\u2190 Back" }), _jsxs("h2", { children: ["My Pok\u00E9mon (", collection.length, ")"] })] }), _jsx("div", { className: "collection-filters", children: TIERS.map((tier) => (_jsx("button", { className: `collection-filter-btn ${filter === tier ? 'active' : ''}`, onClick: () => setFilter(tier), children: tier === 'all' ? 'All' : tier.charAt(0).toUpperCase() + tier.slice(1) }, tier))) }), filtered.length === 0 ? (_jsx("div", { className: "collection-empty", children: "No Pok\u00E9mon yet \u2014 visit the shop!" })) : (_jsx("div", { className: "collection-grid", children: filtered.map((inst) => {
                    const tokens = tokenCounts.get(inst.pokemon.id) ?? 0;
                    const targets = getEvoTargets(inst.pokemon);
                    const canEvolve = tokens >= 3 && targets.length > 0;
                    return (_jsxs(PokemonCard, { pokemon: inst.pokemon, onClick: () => navigate(`/pokemon/${getCollectionIndex(inst)}`), children: [inst.heldItem && (_jsxs("div", { className: "collection-held-item", children: [_jsx("img", { src: getHeldItemSprite(inst.heldItem), alt: "", className: "collection-held-icon" }), _jsx("span", { children: getHeldItemName(inst.heldItem) })] })), canEvolve && (_jsxs("button", { className: "collection-evolve-btn", onClick: (e) => { e.stopPropagation(); startEvolve(inst); }, children: ["\u2728 Evolve (", tokens, "/3)"] })), _jsx("button", { className: "collection-shard-btn", onClick: (e) => { e.stopPropagation(); handleShard(inst); }, children: "\uD83D\uDD2E Shard" })] }, inst.instanceId));
                }) })), evoPicker && (_jsx("div", { className: "evolve-overlay", onClick: (e) => e.target === e.currentTarget && setEvoPicker(null), children: _jsxs("div", { className: "evo-picker", children: [_jsxs("div", { className: "evo-picker-title", children: ["Evolve ", evoPicker.inst.pokemon.name, " into..."] }), _jsx("div", { className: "evo-picker-options", children: evoPicker.targets.map((target) => (_jsxs("button", { className: "evo-picker-option", onClick: () => doEvolve(evoPicker.inst, target), children: [_jsx("img", { src: target.sprite, alt: target.name }), _jsx("span", { children: target.name })] }, target.id))) }), _jsx("button", { className: "evo-picker-cancel", onClick: () => setEvoPicker(null), children: "Cancel" })] }) })), evolving && (_jsxs("div", { className: "evolve-overlay", children: [_jsxs("div", { className: "evolve-animation", children: [_jsxs("div", { className: "evolve-from", children: [_jsx("img", { src: evolving.from.pokemon.sprite, alt: evolving.from.pokemon.name }), _jsx("div", { children: evolving.from.pokemon.name })] }), _jsx("div", { className: "evolve-arrow", children: "\u2192" }), _jsxs("div", { className: "evolve-to", children: [_jsx("img", { src: evolving.to.sprite, alt: evolving.to.name }), _jsx("div", { children: evolving.to.name })] })] }), _jsx("div", { className: "evolve-text", children: "Evolving!" })] })), sharding && (_jsx("div", { className: "shard-overlay", onClick: (e) => e.target === e.currentTarget && setSharding(null), children: _jsxs("div", { className: "shard-content", children: [_jsx("img", { className: "shard-sprite", src: sharding.pokemon.sprite, alt: sharding.pokemon.name }), _jsxs("div", { className: "shard-title", children: ["Shard ", sharding.pokemon.name, "?"] }), _jsxs("div", { className: "shard-desc", children: ["This will destroy the Pok\u00E9mon and give you a ", _jsxs("strong", { children: [sharding.pokemon.name, " Token"] }), "."] }), _jsxs("div", { className: "shard-buttons", children: [_jsx("button", { className: "shard-confirm", onClick: confirmShard, children: "\uD83D\uDD2E Shard" }), _jsx("button", { className: "shard-cancel", onClick: () => setSharding(null), children: "Cancel" })] })] }) }))] }));
}
