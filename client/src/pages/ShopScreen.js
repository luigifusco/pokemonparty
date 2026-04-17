import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_SHOP_TMS, getTMPrice } from '@shared/shop-data';
import { getMoveType, getTMSprite, STAT_MOVES, getMoveAccuracy } from '@shared/move-data';
import { getMoveInfo } from '@shared/move-info';
import { HELD_ITEMS } from '@shared/held-item-data';
import './ShopScreen.css';
const TYPE_COLORS = {
    normal: '#a8a878', fire: '#f08030', water: '#6890f0', electric: '#f8d030',
    grass: '#78c850', ice: '#98d8d8', fighting: '#c03028', poison: '#a040a0',
    ground: '#e0c068', flying: '#a890f0', psychic: '#f85888', bug: '#a8b820',
    rock: '#b8a038', ghost: '#705898', dragon: '#7038f8', dark: '#705848',
    steel: '#b8b8d0', fairy: '#ee99ac',
};
export default function ShopScreen({ essence, onSpendEssence, onAddItems }) {
    const navigate = useNavigate();
    const [bought, setBought] = useState(null);
    const [selected, setSelected] = useState(null);
    const [selectedHeldItem, setSelectedHeldItem] = useState(null);
    const [tab, setTab] = useState('tms');
    const [sort, setSort] = useState('type');
    const [filter, setFilter] = useState('all');
    const allTypes = useMemo(() => {
        const types = new Set();
        for (const tm of ALL_SHOP_TMS)
            types.add(getMoveType(tm));
        return Array.from(types).sort();
    }, []);
    const sortedTMs = useMemo(() => {
        let list = [...ALL_SHOP_TMS];
        if (filter === 'stat') {
            list = list.filter((m) => STAT_MOVES[m]);
        }
        else if (filter !== 'all') {
            list = list.filter((m) => getMoveType(m) === filter);
        }
        if (sort === 'name')
            list.sort();
        else if (sort === 'price-asc')
            list.sort((a, b) => getTMPrice(a) - getTMPrice(b));
        else if (sort === 'price-desc')
            list.sort((a, b) => getTMPrice(b) - getTMPrice(a));
        else if (sort === 'type')
            list.sort((a, b) => getMoveType(a).localeCompare(getMoveType(b)) || a.localeCompare(b));
        return list;
    }, [sort, filter]);
    const handleBuy = (moveName) => {
        const price = getTMPrice(moveName);
        if (essence < price)
            return;
        onSpendEssence(price);
        onAddItems([{ itemType: 'tm', itemData: moveName }]);
        setSelected(null);
        setBought(moveName);
        setTimeout(() => setBought(null), 1500);
    };
    const handleBuyHeldItem = (item) => {
        if (essence < item.price)
            return;
        onSpendEssence(item.price);
        onAddItems([{ itemType: 'held_item', itemData: item.id }]);
        setSelectedHeldItem(null);
        setBought(item.name);
        setTimeout(() => setBought(null), 1500);
    };
    return (_jsxs("div", { className: "shop-screen", children: [_jsxs("div", { className: "shop-header", children: [_jsx("button", { className: "shop-back", onClick: () => navigate('/play'), children: "\u2190 Back" }), _jsx("h2", { children: "\uD83D\uDED2 Shop" }), _jsxs("div", { className: "shop-essence", children: ["\u2726 ", essence] })] }), _jsxs("div", { className: "shop-tabs", children: [_jsx("button", { className: `shop-tab ${tab === 'tms' ? 'active' : ''}`, onClick: () => setTab('tms'), children: "TMs" }), _jsx("button", { className: `shop-tab ${tab === 'held' ? 'active' : ''}`, onClick: () => setTab('held'), children: "Held Items" })] }), tab === 'tms' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "shop-controls", children: [_jsxs("div", { className: "shop-sort", children: [_jsx("span", { children: "Sort:" }), _jsxs("select", { value: sort, onChange: (e) => setSort(e.target.value), children: [_jsx("option", { value: "type", children: "Type" }), _jsx("option", { value: "name", children: "Name" }), _jsx("option", { value: "price-asc", children: "Price \u2191" }), _jsx("option", { value: "price-desc", children: "Price \u2193" })] })] }), _jsxs("div", { className: "shop-filter", children: [_jsx("span", { children: "Filter:" }), _jsxs("select", { value: filter, onChange: (e) => setFilter(e.target.value), children: [_jsx("option", { value: "all", children: "All" }), _jsx("option", { value: "stat", children: "Stat Moves" }), allTypes.map((t) => (_jsx("option", { value: t, children: t }, t)))] })] })] }), _jsx("div", { className: "shop-grid", children: sortedTMs.map((moveName) => {
                            const price = getTMPrice(moveName);
                            const type = getMoveType(moveName);
                            const canAfford = essence >= price;
                            const isStat = !!STAT_MOVES[moveName];
                            const accuracy = getMoveAccuracy(moveName);
                            const accLabel = accuracy === Infinity ? '∞' : `${accuracy}%`;
                            return (_jsxs("div", { className: `shop-tm-card ${bought === moveName ? 'just-bought' : ''}`, onClick: () => setSelected(moveName), children: [_jsx("img", { src: getTMSprite(moveName), alt: moveName, className: "shop-tm-img" }), _jsxs("div", { className: "shop-tm-info", children: [_jsx("div", { className: "shop-tm-name", children: moveName }), _jsxs("div", { className: "shop-tm-meta", children: [_jsx("span", { className: "shop-tm-type", style: { background: TYPE_COLORS[type] ?? '#888' }, children: type }), isStat && _jsx("span", { className: "shop-tm-badge stat", children: "STAT" }), _jsxs("span", { className: "shop-tm-acc", children: ["Acc: ", accLabel] })] })] }), _jsxs("div", { className: "shop-tm-price", children: ["\u2726 ", price] })] }, moveName));
                        }) }), selected && (() => {
                        const moveName = selected;
                        const price = getTMPrice(moveName);
                        const type = getMoveType(moveName);
                        const canAfford = essence >= price;
                        const accuracy = getMoveAccuracy(moveName);
                        const accLabel = accuracy === Infinity ? '∞' : `${accuracy}%`;
                        const info = getMoveInfo(moveName);
                        const isStat = !!STAT_MOVES[moveName];
                        const statEffect = STAT_MOVES[moveName];
                        return (_jsx("div", { className: "shop-detail-overlay", onClick: (e) => e.target === e.currentTarget && setSelected(null), children: _jsxs("div", { className: "shop-detail-card", children: [_jsx("img", { src: getTMSprite(moveName), alt: moveName, className: "shop-detail-img" }), _jsx("h3", { className: "shop-detail-name", children: moveName }), _jsxs("div", { className: "shop-detail-badges", children: [_jsx("span", { className: "shop-tm-type", style: { background: TYPE_COLORS[type] ?? '#888' }, children: type }), _jsx("span", { className: "shop-detail-cat", children: info.category }), isStat && _jsx("span", { className: "shop-tm-badge stat", children: "STAT" })] }), _jsxs("div", { className: "shop-detail-stats", children: [info.bp > 0 && _jsxs("div", { className: "shop-detail-stat", children: [_jsx("span", { children: "Power" }), _jsx("strong", { children: info.bp })] }), _jsxs("div", { className: "shop-detail-stat", children: [_jsx("span", { children: "Accuracy" }), _jsx("strong", { children: accLabel })] })] }), statEffect && (_jsxs("div", { className: "shop-detail-boosts", children: [Object.entries(statEffect.boosts).map(([stat, val]) => (_jsxs("span", { className: `boost-tag ${val > 0 ? 'boost-up' : 'boost-down'}`, children: [val > 0 ? '▲' : '▼', stat.toUpperCase(), " ", val > 0 ? '+' : '', val] }, stat))), _jsxs("span", { className: "shop-detail-target", children: ["(", statEffect.target === 'self' ? 'Self' : 'Opponent', ")"] })] })), _jsx("p", { className: "shop-detail-desc", children: info.description }), _jsxs("div", { className: "shop-detail-price", children: ["\u2726 ", price] }), _jsxs("div", { className: "shop-detail-actions", children: [_jsx("button", { className: "shop-detail-btn cancel", onClick: () => setSelected(null), children: "Back" }), _jsx("button", { className: `shop-detail-btn buy ${canAfford ? '' : 'disabled'}`, onClick: () => canAfford && handleBuy(moveName), disabled: !canAfford, children: canAfford ? 'Buy' : 'Not enough ✦' })] })] }) }));
                    })()] })), tab === 'held' && (_jsx("div", { className: "shop-grid", children: HELD_ITEMS.map((item) => {
                    const canAfford = essence >= item.price;
                    return (_jsxs("div", { className: `shop-tm-card`, onClick: () => setSelectedHeldItem(item), children: [_jsx("img", { src: item.sprite, alt: item.name, className: "shop-tm-img", style: { imageRendering: 'pixelated' } }), _jsxs("div", { className: "shop-tm-info", children: [_jsx("div", { className: "shop-tm-name", children: item.name }), _jsx("div", { className: "shop-tm-meta", children: _jsx("span", { className: "shop-tm-badge held", children: "HELD" }) })] }), _jsxs("div", { className: "shop-tm-price", children: ["\u2726 ", item.price] })] }, item.id));
                }) })), selectedHeldItem && (() => {
                const item = selectedHeldItem;
                const canAfford = essence >= item.price;
                return (_jsx("div", { className: "shop-detail-overlay", onClick: (e) => e.target === e.currentTarget && setSelectedHeldItem(null), children: _jsxs("div", { className: "shop-detail-card", children: [_jsx("img", { src: item.sprite, alt: item.name, className: "shop-detail-img", style: { imageRendering: 'pixelated' } }), _jsx("h3", { className: "shop-detail-name", children: item.name }), _jsx("div", { className: "shop-detail-badges", children: _jsx("span", { className: "shop-tm-badge held", children: "HELD ITEM" }) }), _jsx("p", { className: "shop-detail-desc", children: item.description }), _jsxs("div", { className: "shop-detail-price", children: ["\u2726 ", item.price] }), _jsxs("div", { className: "shop-detail-actions", children: [_jsx("button", { className: "shop-detail-btn cancel", onClick: () => setSelectedHeldItem(null), children: "Back" }), _jsx("button", { className: `shop-detail-btn buy ${canAfford ? '' : 'disabled'}`, onClick: () => canAfford && handleBuyHeldItem(item), disabled: !canAfford, children: canAfford ? 'Buy' : 'Not enough ✦' })] })] }) }));
            })(), bought && (_jsxs("div", { className: "shop-toast", children: ["Purchased: ", bought, "!"] }))] }));
}
