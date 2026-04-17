import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { POKEMON } from '@shared/pokemon-data';
import './PokedexScreen.css';
const TIERS = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary'];
export default function PokedexScreen({ discovered }) {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all');
    const filtered = filter === 'all'
        ? POKEMON
        : POKEMON.filter((p) => p.tier === filter);
    const sorted = [...filtered].sort((a, b) => a.id - b.id);
    const discoveredCount = POKEMON.filter((p) => discovered.has(p.id)).length;
    return (_jsxs("div", { className: "pokedex-screen", children: [_jsxs("div", { className: "pokedex-header", children: [_jsx("button", { className: "pokedex-back", onClick: () => navigate('/play'), children: "\u2190 Back" }), _jsxs("h2", { children: ["Pok\u00E9dex (", discoveredCount, "/", POKEMON.length, ")"] })] }), _jsx("div", { className: "pokedex-filters", children: TIERS.map((tier) => (_jsx("button", { className: `pokedex-filter-btn ${filter === tier ? 'active' : ''}`, onClick: () => setFilter(tier), children: tier === 'all' ? 'All' : tier.charAt(0).toUpperCase() + tier.slice(1) }, tier))) }), _jsx("div", { className: "pokedex-grid", children: sorted.map((p) => {
                    const isDiscovered = discovered.has(p.id);
                    return (_jsxs("div", { className: `pkmn-card ${isDiscovered ? '' : 'undiscovered'}`, children: [_jsx("img", { src: p.sprite, alt: isDiscovered ? p.name : '???', className: isDiscovered ? '' : 'silhouette' }), _jsx("div", { className: "pkmn-card-name", children: isDiscovered ? p.name : '???' }), _jsx("div", { className: `pkmn-card-tier tier-${p.tier}`, children: isDiscovered ? p.tier : '???' })] }, p.id));
                }) })] }));
}
