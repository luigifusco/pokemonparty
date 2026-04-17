import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { getEffectiveMoves } from '@shared/types';
import { NATURE_BY_NAME, calcStat, STAT_LABELS } from '@shared/natures';
import { getHeldItemSprite, getHeldItemName, HELD_ITEMS_BY_ID } from '@shared/held-item-data';
import './PokemonDetailScreen.css';
const STAT_KEYS = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'];
const TYPE_COLORS = {
    normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
    grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
    ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
    rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
    steel: '#B8B8D0', fairy: '#EE99AC',
};
export default function PokemonDetailScreen({ collection }) {
    const { idx } = useParams();
    const navigate = useNavigate();
    const index = parseInt(idx ?? '', 10);
    const inst = collection[index];
    if (!inst) {
        return (_jsx("div", { className: "pokemon-detail-screen", children: _jsxs("div", { className: "detail-header", children: [_jsx("button", { className: "detail-back", onClick: () => navigate('/collection'), children: "\u2190 Back" }), _jsx("h2", { children: "Not found" })] }) }));
    }
    const { pokemon, ivs, nature } = inst;
    const natureData = NATURE_BY_NAME[nature];
    return (_jsxs("div", { className: "pokemon-detail-screen", children: [_jsxs("div", { className: "detail-header", children: [_jsx("button", { className: "detail-back", onClick: () => navigate('/collection'), children: "\u2190 Back" }), _jsxs("h2", { children: ["#", pokemon.id] })] }), _jsxs("div", { className: "detail-scroll", children: [_jsxs("div", { className: "detail-sprite-section", children: [index > 0 && (_jsx("button", { className: "detail-nav detail-nav-prev", onClick: () => navigate(`/pokemon/${index - 1}`, { replace: true }), children: "\u2039" })), index < collection.length - 1 && (_jsx("button", { className: "detail-nav detail-nav-next", onClick: () => navigate(`/pokemon/${index + 1}`, { replace: true }), children: "\u203A" })), _jsxs("div", { className: "detail-top-row", children: [_jsx("div", { className: "detail-name", children: pokemon.name }), _jsx("div", { className: `detail-tier tier-${pokemon.tier}`, children: pokemon.tier })] }), _jsx("img", { className: "detail-sprite", src: pokemon.sprite, alt: pokemon.name }), _jsxs("div", { className: "detail-bottom-row", children: [_jsx("div", { className: "detail-meta-row", children: pokemon.types.map((t) => (_jsx("span", { className: "detail-type-badge", style: { background: TYPE_COLORS[t] ?? '#888' }, children: t }, t))) }), _jsxs("div", { className: "detail-nature", children: [_jsx("span", { className: "detail-nature-name", children: nature }), natureData.plus && natureData.minus && (_jsxs("span", { className: "detail-nature-effect", children: ["+", STAT_LABELS[natureData.plus], " / \u2212", STAT_LABELS[natureData.minus]] })), !natureData.plus && _jsx("span", { className: "detail-nature-effect", children: "Neutral" })] })] })] }), _jsx("div", { className: "detail-section-title", children: "Stats" }), _jsx("div", { className: "detail-stats", children: STAT_KEYS.map((key) => {
                            const base = pokemon.stats[key];
                            const iv = ivs[key];
                            const computed = calcStat(key, base, iv, natureData);
                            const isPlus = natureData.plus === key;
                            const isMinus = natureData.minus === key;
                            const maxStat = key === 'hp' ? 250 : 200;
                            return (_jsxs("div", { className: "detail-stat-row", children: [_jsx("span", { className: `detail-stat-label ${isPlus ? 'plus' : ''} ${isMinus ? 'minus' : ''}`, children: STAT_LABELS[key] }), _jsx("span", { className: "detail-stat-value", children: computed }), _jsx("div", { className: "detail-stat-bar-bg", children: _jsx("div", { className: `detail-stat-bar ${isPlus ? 'plus' : ''} ${isMinus ? 'minus' : ''}`, style: { width: `${Math.min(100, (computed / maxStat) * 100)}%` } }) }), _jsx("span", { className: `detail-stat-iv ${iv >= 28 ? 'great' : iv <= 5 ? 'low' : ''}`, children: iv })] }, key));
                        }) }), _jsx("div", { className: "detail-section-title", children: "Moves" }), _jsx("div", { className: "detail-moves", children: getEffectiveMoves(inst).map((moveName, i) => (_jsx("div", { className: "detail-move-card", children: _jsx("span", { className: "detail-move-name", children: moveName }) }, i))) }), _jsx("div", { className: "detail-section-title", children: "Ability" }), _jsx("div", { className: "detail-ability", children: _jsx("div", { className: "detail-ability-name", children: inst.ability }) }), _jsx("div", { className: "detail-section-title", children: "Held Item" }), _jsx("div", { className: "detail-held-item", children: inst.heldItem ? (_jsxs("div", { className: "detail-held-item-info", children: [_jsx("img", { src: getHeldItemSprite(inst.heldItem), alt: "", className: "detail-held-icon" }), _jsxs("div", { children: [_jsx("div", { className: "detail-held-name", children: getHeldItemName(inst.heldItem) }), _jsx("div", { className: "detail-held-desc", children: HELD_ITEMS_BY_ID[inst.heldItem]?.description })] })] })) : (_jsx("div", { className: "detail-held-none", children: "None" })) }), _jsx("div", { className: "detail-section-title", children: "Base Stats" }), _jsx("div", { className: "detail-base-stats", children: STAT_KEYS.map((key) => (_jsxs("div", { className: "detail-base-cell", children: [_jsx("span", { className: "detail-base-label", children: STAT_LABELS[key] }), _jsx("span", { className: "detail-base-value", children: pokemon.stats[key] })] }, key))) })] })] }));
}
