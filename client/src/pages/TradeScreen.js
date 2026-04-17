import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { useOnlinePlayers } from '../useOnlinePlayers';
import { randomNature, randomIVs } from '@shared/natures';
import './TradeScreen.css';
import '../pages/BattleDemo.css';
export default function TradeScreen({ playerName, collection, onTrade }) {
    const navigate = useNavigate();
    const location = useLocation();
    const autoChallenge = location.state?.autoChallenge;
    const onlinePlayers = useOnlinePlayers(playerName);
    const [phase, setPhase] = useState('request');
    const [targetName, setTargetName] = useState('');
    const [partnerName, setPartnerName] = useState('');
    const [tradeId, setTradeId] = useState('');
    const [incomingFrom, setIncomingFrom] = useState([]);
    const [selectedIdx, setSelectedIdx] = useState(null);
    const [myPokemonId, setMyPokemonId] = useState(null);
    const [theirPokemonId, setTheirPokemonId] = useState(null);
    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }
        const onConnect = () => socket.emit('player:identify', playerName);
        if (socket.connected)
            socket.emit('player:identify', playerName);
        socket.on('connect', onConnect);
        const onMatched = ({ tradeId, partner }) => {
            setTradeId(tradeId);
            setPartnerName(partner);
            setPhase('selectPokemon');
        };
        const onWaiting = () => setPhase('waiting');
        const onIncoming = ({ from }) => {
            setIncomingFrom((prev) => prev.includes(from) ? prev : [...prev, from]);
        };
        const onBothSelected = ({ player1Pokemon, player2Pokemon }) => {
            // Figure out which is mine
            // The server sets player1 = whoever initiated first, we need to check
            // We stored our selection, so the other one is theirs
            if (myPokemonId === player1Pokemon) {
                setTheirPokemonId(player2Pokemon);
            }
            else if (myPokemonId === player2Pokemon) {
                setTheirPokemonId(player1Pokemon);
            }
            else {
                // We might not have set myPokemonId yet via state, use the one that matches
                setMyPokemonId(player1Pokemon);
                setTheirPokemonId(player2Pokemon);
            }
            setPhase('confirm');
        };
        const onWaitingForPartner = () => setPhase('waitingPartner');
        const onWaitingConfirm = () => setPhase('waitingConfirm');
        const onExecute = ({ player1, player1Pokemon, player2Pokemon }) => {
            const isPlayer1 = player1 === playerName;
            const givePokemonId = isPlayer1 ? player1Pokemon : player2Pokemon;
            const receivePokemonId = isPlayer1 ? player2Pokemon : player1Pokemon;
            setMyPokemonId(givePokemonId);
            setTheirPokemonId(receivePokemonId);
            setPhase('animation');
            setTimeout(() => {
                const giveInst = collection.find((inst) => inst.pokemon.id === givePokemonId);
                const receivePokemon = POKEMON_BY_ID[receivePokemonId];
                if (giveInst && receivePokemon) {
                    const receiveInst = {
                        instanceId: crypto.randomUUID(),
                        pokemon: receivePokemon,
                        ivs: randomIVs(),
                        nature: randomNature(),
                        ability: '',
                    };
                    onTrade(giveInst, receiveInst);
                }
            }, 2000);
        };
        socket.on('trade:matched', onMatched);
        socket.on('trade:waiting', onWaiting);
        socket.on('trade:incoming', onIncoming);
        socket.on('trade:bothSelected', onBothSelected);
        socket.on('trade:waitingForPartner', onWaitingForPartner);
        socket.on('trade:waitingConfirm', onWaitingConfirm);
        socket.on('trade:execute', onExecute);
        return () => {
            socket.off('connect', onConnect);
            socket.off('trade:matched', onMatched);
            socket.off('trade:waiting', onWaiting);
            socket.off('trade:incoming', onIncoming);
            socket.off('trade:bothSelected', onBothSelected);
            socket.off('trade:waitingForPartner', onWaitingForPartner);
            socket.off('trade:waitingConfirm', onWaitingConfirm);
            socket.off('trade:execute', onExecute);
        };
    }, [playerName, myPokemonId]);
    // Auto-request when accepting a notification
    useEffect(() => {
        if (autoChallenge && phase === 'request') {
            setTargetName(autoChallenge);
            socket.emit('trade:request', autoChallenge);
            window.history.replaceState({}, '');
        }
    }, [autoChallenge]);
    const handleRequest = () => {
        if (!targetName.trim())
            return;
        socket.emit('trade:request', targetName.trim());
    };
    const handleCancel = () => {
        socket.emit('trade:cancel');
        setPhase('request');
    };
    const handleSelectPokemon = () => {
        if (selectedIdx === null)
            return;
        const inst = collection[selectedIdx];
        setMyPokemonId(inst.pokemon.id);
        socket.emit('trade:selectPokemon', { tradeId, pokemonId: inst.pokemon.id });
    };
    const handleConfirm = () => {
        socket.emit('trade:confirm', { tradeId });
    };
    const myPokemon = myPokemonId !== null ? POKEMON_BY_ID[myPokemonId] : null;
    const theirPokemon = theirPokemonId !== null ? POKEMON_BY_ID[theirPokemonId] : null;
    // Animation phase
    if (phase === 'animation' && myPokemon && theirPokemon) {
        return (_jsxs("div", { className: "trade-overlay", children: [_jsxs("div", { className: "trade-animation", children: [_jsxs("div", { className: "trade-anim-card outgoing", children: [_jsx("img", { src: myPokemon.sprite, alt: myPokemon.name }), _jsx("div", { className: "name", children: myPokemon.name })] }), _jsx("div", { className: "trade-anim-arrows", children: "\u21C4" }), _jsxs("div", { className: "trade-anim-card incoming", children: [_jsx("img", { src: theirPokemon.sprite, alt: theirPokemon.name }), _jsx("div", { className: "name", children: theirPokemon.name })] })] }), _jsx("div", { className: "trade-anim-text", children: "Trade complete!" }), _jsxs("div", { className: "trade-anim-received", children: ["You received ", theirPokemon.name, "!"] }), _jsx("button", { className: "trade-anim-close", onClick: () => navigate('/play'), children: "OK" })] }));
    }
    // Confirm phase
    if (phase === 'confirm' || phase === 'waitingConfirm') {
        return (_jsxs("div", { className: "trade-screen", children: [_jsx("div", { className: "trade-header", children: _jsx("h2", { children: "Confirm Trade" }) }), _jsxs("div", { className: "trade-content", children: [_jsxs("div", { className: "trade-confirm-view", children: [_jsxs("div", { className: "trade-confirm-card", children: [_jsx("div", { className: "label", children: "You give" }), myPokemon && (_jsxs(_Fragment, { children: [_jsx("img", { src: myPokemon.sprite, alt: myPokemon.name }), _jsx("div", { className: "name", children: myPokemon.name })] }))] }), _jsx("div", { className: "trade-confirm-arrow", children: "\u21C4" }), _jsxs("div", { className: "trade-confirm-card", children: [_jsx("div", { className: "label", children: "You get" }), theirPokemon && (_jsxs(_Fragment, { children: [_jsx("img", { src: theirPokemon.sprite, alt: theirPokemon.name }), _jsx("div", { className: "name", children: theirPokemon.name })] }))] })] }), phase === 'confirm' && (_jsx("button", { className: "trade-btn confirm", onClick: handleConfirm, children: "\u2705 Confirm Trade" })), phase === 'waitingConfirm' && (_jsxs("div", { className: "trade-status waiting", children: ["Waiting for ", partnerName, " to confirm..."] }))] })] }));
    }
    // Select pokemon phase
    if (phase === 'selectPokemon' || phase === 'waitingPartner') {
        const indices = collection.map((_, i) => i).sort((a, b) => collection[a].pokemon.id - collection[b].pokemon.id);
        return (_jsxs("div", { className: "trade-screen", children: [_jsx("div", { className: "trade-header", children: _jsxs("h2", { children: ["Trade with ", partnerName] }) }), _jsx("div", { style: { padding: '8px 12px', textAlign: 'center' }, children: phase === 'waitingPartner' ? (_jsxs("div", { className: "trade-status waiting", children: ["Waiting for ", partnerName, " to pick..."] })) : (_jsx("div", { className: "trade-select-label", children: "Select a Pok\u00E9mon to trade" })) }), selectedIdx !== null && phase === 'selectPokemon' && (_jsxs("div", { style: { textAlign: 'center', padding: '8px' }, children: [_jsxs("div", { className: "trade-selected-pokemon", style: { display: 'inline-flex' }, children: [_jsx("img", { src: collection[selectedIdx].pokemon.sprite, alt: collection[selectedIdx].pokemon.name }), _jsx("div", { className: "name", children: collection[selectedIdx].pokemon.name })] }), _jsx("div", { style: { marginTop: '8px' }, children: _jsx("button", { className: "trade-btn", onClick: handleSelectPokemon, style: { maxWidth: '200px' }, children: "Offer this Pok\u00E9mon" }) })] })), _jsx("div", { className: "team-select-grid", style: { flex: 1, overflow: 'auto', padding: '8px' }, children: indices.map((idx) => {
                        const p = collection[idx].pokemon;
                        const isSelected = selectedIdx === idx;
                        return (_jsxs("div", { className: `team-select-card ${isSelected ? 'selected' : ''}`, onClick: () => phase === 'selectPokemon' && setSelectedIdx(idx), children: [_jsx("img", { src: p.sprite, alt: p.name }), _jsx("div", { className: "team-select-card-name", children: p.name })] }, idx));
                    }) })] }));
    }
    // Request phase
    return (_jsxs("div", { className: "trade-screen", children: [_jsxs("div", { className: "trade-header", children: [_jsx("button", { className: "trade-back", onClick: () => navigate('/play'), children: "\u2190 Back" }), _jsx("h2", { children: "\uD83D\uDD04 Trade" })] }), _jsxs("div", { className: "trade-content", children: [incomingFrom.length > 0 && (_jsxs("div", { className: "trade-incoming", children: ["\uD83D\uDD04 Trade request from: ", incomingFrom.join(', ')] })), phase === 'request' && (_jsxs(_Fragment, { children: [onlinePlayers.length > 0 && (_jsxs("div", { className: "online-players-section", children: [_jsx("div", { className: "online-players-label", children: "\uD83D\uDFE2 Online" }), _jsx("div", { className: "recent-trainers", children: onlinePlayers.map((name) => (_jsx("button", { className: "recent-trainer-btn", onClick: () => setTargetName(name), children: name }, name))) })] })), _jsx("input", { className: "trade-input", type: "text", placeholder: "Partner's name", value: targetName, onChange: (e) => setTargetName(e.target.value), onKeyDown: (e) => e.key === 'Enter' && handleRequest(), maxLength: 20 }), _jsx("button", { className: "trade-btn", onClick: handleRequest, disabled: !targetName.trim(), children: "\uD83D\uDD04 Request Trade" })] })), phase === 'waiting' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "trade-status waiting", children: ["Waiting for ", targetName, " to accept..."] }), _jsx("button", { className: "trade-btn", onClick: handleCancel, children: "Cancel" })] }))] })] }));
}
