import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import './PokemonCard.css';
export default function PokemonCard({ pokemon, count, onClick, children }) {
    return (_jsxs("div", { className: "pkmn-card", onClick: onClick, style: onClick ? { cursor: 'pointer' } : undefined, children: [count !== undefined && count > 1 && _jsxs("div", { className: "pkmn-card-count", children: ["\u00D7", count] }), _jsx("img", { src: pokemon.sprite, alt: pokemon.name }), _jsx("div", { className: "pkmn-card-name", children: pokemon.name }), _jsx("div", { className: `pkmn-card-tier tier-${pokemon.tier}`, children: pokemon.tier }), children] }));
}
