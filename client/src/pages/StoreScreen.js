import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PACKS } from '@shared/pack-data';
import { openPack, getPackPoolSize, DEFAULT_RARITY_WEIGHTS } from '@shared/boxes';
import { BASE_PATH } from '../config';
import './StoreScreen.css';
export default function StoreScreen({ essence, onSpendEssence, onAddPokemon }) {
    const navigate = useNavigate();
    const [cards, setCards] = useState(null);
    const [phase, setPhase] = useState('idle');
    const [revealIndex, setRevealIndex] = useState(0);
    const [swiping, setSwiping] = useState(false);
    const [swipeX, setSwipeX] = useState(0);
    const dragStartX = useRef(0);
    const dragging = useRef(false);
    const [rarityWeights, setRarityWeights] = useState(DEFAULT_RARITY_WEIGHTS);
    useEffect(() => {
        fetch(`${BASE_PATH}/api/settings/rarity-weights`)
            .then((r) => r.json())
            .then(setRarityWeights)
            .catch(() => { });
    }, []);
    const handleBuy = async (packId, cost) => {
        if (essence < cost)
            return;
        const result = openPack(packId, rarityWeights);
        onSpendEssence(cost);
        const instances = await onAddPokemon(result.map((p) => p.id));
        const packCards = instances.map((inst) => ({
            type: 'pokemon',
            name: inst.pokemon.name,
            sprite: inst.pokemon.sprite,
            tier: inst.pokemon.tier,
            nature: inst.nature,
            ability: inst.ability,
            moves: (inst.learnedMoves ?? inst.pokemon.moves),
        }));
        setCards(packCards);
        setRevealIndex(0);
        setSwiping(false);
        setSwipeX(0);
        setPhase('opening');
        setTimeout(() => setPhase('reveal'), 1800);
    };
    const swipeThreshold = 80;
    const handlePointerDown = useCallback((e) => {
        if (phase !== 'reveal' || swiping)
            return;
        dragStartX.current = e.clientX;
        dragging.current = true;
        setSwipeX(0);
    }, [phase, swiping]);
    const handlePointerMove = useCallback((e) => {
        if (!dragging.current)
            return;
        const dx = e.clientX - dragStartX.current;
        setSwipeX(dx);
    }, []);
    const handlePointerUp = useCallback(() => {
        if (!dragging.current)
            return;
        dragging.current = false;
        if (Math.abs(swipeX) > swipeThreshold && cards) {
            setSwiping(true);
            const dir = swipeX > 0 ? 1 : -1;
            setSwipeX(dir * window.innerWidth);
            setTimeout(() => {
                const next = revealIndex + 1;
                if (next >= cards.length) {
                    setPhase('idle');
                    setCards(null);
                }
                else {
                    setRevealIndex(next);
                }
                setSwiping(false);
                setSwipeX(0);
            }, 250);
        }
        else {
            setSwipeX(0);
        }
    }, [swipeX, cards, revealIndex]);
    const handleTap = useCallback(() => {
        if (phase !== 'reveal' || swiping || !cards)
            return;
        if (Math.abs(swipeX) > 5)
            return; // was dragging
        setSwiping(true);
        setSwipeX(-window.innerWidth);
        setTimeout(() => {
            const next = revealIndex + 1;
            if (next >= cards.length) {
                setPhase('idle');
                setCards(null);
            }
            else {
                setRevealIndex(next);
            }
            setSwiping(false);
            setSwipeX(0);
        }, 250);
    }, [phase, swiping, cards, revealIndex, swipeX]);
    const currentCard = cards?.[revealIndex];
    const remaining = cards ? cards.length - revealIndex : 0;
    return (_jsxs("div", { className: "store-screen", children: [_jsxs("div", { className: "store-header", children: [_jsx("button", { className: "store-back", onClick: () => navigate('/play'), children: "\u2190 Back" }), _jsx("h2", { children: "Expansion Shop" }), _jsxs("div", { className: "store-essence", children: ["\u2726 ", essence] })] }), _jsx("div", { className: "store-boxes", children: PACKS.map((pack) => {
                    const canAfford = essence >= pack.cost;
                    const poolSize = getPackPoolSize(pack.id);
                    return (_jsxs("div", { className: `store-box ${canAfford ? '' : 'disabled'}`, onClick: () => canAfford && handleBuy(pack.id, pack.cost), children: [_jsx("div", { className: "store-box-icon", children: pack.icon }), _jsxs("div", { className: "store-box-info", children: [_jsx("div", { className: "store-box-name", children: pack.name }), _jsxs("div", { className: "store-box-desc", children: [pack.description, " \u2014 ", poolSize, " Pok\u00E9mon in pool \u2014 5 per pack"] })] }), _jsxs("div", { className: "store-box-cost", children: ["\u2726 ", pack.cost] })] }, pack.id));
                }) }), phase === 'opening' && (_jsx("div", { className: "pack-overlay", children: _jsxs("div", { className: "pack-opening-anim", children: [_jsx("div", { className: "pack-box-icon", children: "\uD83C\uDF81" }), _jsx("div", { className: "pack-burst" })] }) })), phase === 'reveal' && cards && (_jsxs("div", { className: "pack-overlay pack-reveal", onPointerDown: handlePointerDown, onPointerMove: handlePointerMove, onPointerUp: handlePointerUp, onPointerCancel: handlePointerUp, onClick: handleTap, style: { touchAction: 'none' }, children: [_jsxs("div", { className: "pack-counter", children: [revealIndex + 1, " / ", cards.length] }), cards.slice(revealIndex).reverse().map((card, ri) => {
                        const stackIndex = cards.length - revealIndex - 1 - ri; // 0 = top card
                        const isTop = stackIndex === 0;
                        const depth = stackIndex;
                        const borderClass = `tier-border-${card.tier}`;
                        const badgeClass = `tier-${card.tier}`;
                        const isDragging = isTop && swipeX !== 0 && !swiping;
                        return (_jsx("div", { className: `pack-reveal-card ${isTop && swiping ? 'swiping' : ''} ${isDragging ? 'dragging' : ''}`, style: {
                                transform: isTop
                                    ? `translateX(${swipeX}px) rotate(${swipeX * 0.05}deg)`
                                    : `scale(${1 - depth * 0.04}) translateY(${depth * 8}px)`,
                                zIndex: 20 - stackIndex,
                                pointerEvents: isTop ? 'auto' : 'none',
                            }, children: _jsxs("div", { className: `pack-card-inner ${borderClass}`, children: [_jsx("img", { src: card.sprite, alt: card.name, className: "pack-reveal-sprite", draggable: false, onContextMenu: (e) => e.preventDefault() }), _jsx("div", { className: "pack-reveal-name", children: card.name }), card.moves && (_jsxs("div", { className: "pack-reveal-info", children: [_jsx("span", { className: "pack-reveal-nature", children: card.nature }), card.ability && _jsx("span", { className: "pack-reveal-ability", children: card.ability }), _jsxs("span", { className: "pack-reveal-moves", children: [card.moves[0], " / ", card.moves[1]] })] })), _jsx("div", { className: `pack-reveal-badge ${badgeClass}`, children: card.tier })] }) }, `card-${revealIndex + stackIndex}`));
                    }), _jsx("div", { className: "pack-swipe-hint", children: cards.length - revealIndex > 1 ? 'Swipe or tap to reveal next' : 'Swipe or tap to finish' })] }))] }));
}
