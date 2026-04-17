import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import BattleScene from '../components/BattleScene';
import BattleConfigScreen from '../components/BattleConfigScreen';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { calculateBattleEssence } from '@shared/essence';
import { useOnlinePlayers } from '../useOnlinePlayers';
import { DEFAULT_BATTLE_CONFIG } from '@shared/battle-types';
import TeamSelectGrid from '../components/TeamSelectGrid';
import './BattleMultiplayer.css';
import '../pages/BattleDemo.css';
export default function BattleMultiplayer({ playerName, collection, essence, onGainEssence, onEloUpdate }) {
    const navigate = useNavigate();
    const location = useLocation();
    const autoChallenge = location.state?.autoChallenge;
    const onlinePlayers = useOnlinePlayers(playerName);
    const [config, setConfig] = useState(DEFAULT_BATTLE_CONFIG);
    const [phase, setPhase] = useState(autoChallenge ? 'challenge' : 'config');
    const [targetName, setTargetName] = useState('');
    const [opponentName, setOpponentName] = useState('');
    const [battleId, setBattleId] = useState('');
    const [teamSize, setTeamSize] = useState(3);
    const [challengers, setChallengers] = useState([]);
    const [selected, setSelected] = useState([]);
    const [snapshot, setSnapshot] = useState(null);
    const [opponentTeamIds, setOpponentTeamIds] = useState([]);
    const [rewarded, setRewarded] = useState(false);
    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }
        const onConnect = () => {
            socket.emit('player:identify', playerName);
        };
        if (socket.connected) {
            socket.emit('player:identify', playerName);
        }
        socket.on('connect', onConnect);
        const onMatched = ({ battleId, opponent, fieldSize, totalPokemon }) => {
            setBattleId(battleId);
            setOpponentName(opponent);
            if (totalPokemon)
                setTeamSize(totalPokemon);
            if (fieldSize)
                setConfig((prev) => ({ ...prev, fieldSize: fieldSize, totalPokemon: totalPokemon ?? prev.totalPokemon }));
            setPhase('teamSelect');
        };
        const onWaiting = () => {
            setPhase('waiting');
        };
        const onChallenged = ({ challenger }) => {
            setChallengers((prev) => prev.includes(challenger) ? prev : [...prev, challenger]);
        };
        const onBattleStart = (data) => {
            const isPlayer1 = data.player1 === playerName;
            const theirTeam = isPlayer1 ? data.player2Team : data.player1Team;
            setOpponentTeamIds(theirTeam);
            setSnapshot(data.snapshot);
            setBattleId(data.battleId);
            setPhase('battle');
        };
        const onWaitingForOpponent = () => {
            setPhase('waitingTeam');
        };
        const handleEloUpdate = (update) => {
            const myNewElo = update.winnerName === playerName ? update.winnerNewElo : update.loserNewElo;
            onEloUpdate(myNewElo);
        };
        socket.on('battle:matched', onMatched);
        socket.on('battle:waiting', onWaiting);
        socket.on('battle:challenged', onChallenged);
        socket.on('battle:start', onBattleStart);
        socket.on('battle:waitingForOpponent', onWaitingForOpponent);
        socket.on('battle:eloUpdate', handleEloUpdate);
        return () => {
            socket.off('connect', onConnect);
            socket.off('battle:matched', onMatched);
            socket.off('battle:waiting', onWaiting);
            socket.off('battle:challenged', onChallenged);
            socket.off('battle:start', onBattleStart);
            socket.off('battle:waitingForOpponent', onWaitingForOpponent);
            socket.off('battle:eloUpdate', handleEloUpdate);
        };
    }, [playerName, opponentName]);
    // Auto-challenge when accepting a notification
    useEffect(() => {
        if (autoChallenge && phase === 'challenge') {
            setTargetName(autoChallenge);
            socket.emit('battle:challenge', { target: autoChallenge, fieldSize: config.fieldSize, totalPokemon: config.totalPokemon });
            window.history.replaceState({}, '');
        }
    }, [autoChallenge]);
    const handleChallenge = () => {
        if (!targetName.trim())
            return;
        socket.emit('battle:challenge', { target: targetName.trim(), fieldSize: config.fieldSize, totalPokemon: config.totalPokemon });
    };
    const handleCancel = () => {
        socket.emit('battle:cancel');
        setPhase('challenge');
    };
    const togglePokemon = (idx) => {
        if (selected.includes(idx)) {
            setSelected(selected.filter((i) => i !== idx));
        }
        else if (selected.length < teamSize) {
            setSelected([...selected, idx]);
        }
    };
    const submitTeam = () => {
        socket.emit('battle:selectTeam', {
            battleId,
            team: selected.map((idx) => collection[idx].pokemon.id),
            heldItems: selected.map((idx) => collection[idx].heldItem ?? null),
            moves: selected.map((idx) => {
                const inst = collection[idx];
                return inst.learnedMoves ?? null;
            }),
            abilities: selected.map((idx) => collection[idx].ability ?? null),
        });
        setPhase('waitingTeam');
    };
    // Config phase
    if (phase === 'config') {
        return (_jsx(BattleConfigScreen, { onConfirm: (c) => {
                setConfig(c);
                setTeamSize(c.totalPokemon);
                setPhase('challenge');
            }, onBack: () => navigate('/play') }));
    }
    // Battle phase
    if (phase === 'battle' && snapshot) {
        const opponentPokemon = opponentTeamIds.map((id) => POKEMON_BY_ID[id]).filter(Boolean);
        const essenceGained = calculateBattleEssence(opponentPokemon);
        if (snapshot.winner === 'left' && !rewarded) {
            onGainEssence(essenceGained);
            setRewarded(true);
        }
        return (_jsxs("div", { className: "battle-demo-wrapper", children: [_jsx(BattleScene, { snapshot: snapshot, turnDelayMs: 2000, essenceGained: essenceGained }), _jsx("button", { className: "battle-demo-back", onClick: () => navigate('/play'), children: "\u2190 Back to Menu" })] }));
    }
    // Team selection phase
    if (phase === 'teamSelect' || phase === 'waitingTeam') {
        return (_jsx(TeamSelectGrid, { instances: collection, selected: selected, onToggle: (idx) => phase === 'teamSelect' && togglePokemon(idx), teamSize: teamSize, disabled: phase === 'waitingTeam', onSubmit: selected.length === teamSize ? submitTeam : undefined, submitLabel: "\u2694\uFE0F Lock In!", headerLeft: _jsx("button", { className: "battle-mp-back", onClick: () => navigate('/play'), children: "\u2190 Back" }), headerCenter: _jsxs("h2", { children: ["Pick Your Team (", selected.length, "/", teamSize, ")"] }), headerRight: _jsxs("div", { className: "opponent-name", children: ["vs ", opponentName] }), aboveGrid: phase === 'waitingTeam' ? (_jsx("div", { className: "battle-mp-team-status", children: "Waiting for opponent's team..." })) : undefined }));
    }
    // Challenge phase
    return (_jsxs("div", { className: "battle-mp-screen", children: [_jsxs("div", { className: "battle-mp-header", children: [_jsx("button", { className: "battle-mp-back", onClick: () => setPhase('config'), children: "\u2190 Back" }), _jsxs("h2", { children: ["\u2694\uFE0F Battle (", config.fieldSize, "v", config.fieldSize, ", ", config.totalPokemon, " total)"] })] }), _jsxs("div", { className: "battle-mp-content", children: [challengers.length > 0 && (_jsxs("div", { className: "battle-mp-challenged", children: ["\u26A1 Challenged by: ", challengers.join(', ')] })), phase === 'challenge' && (_jsxs(_Fragment, { children: [onlinePlayers.length > 0 && (_jsxs("div", { className: "online-players-section", children: [_jsx("div", { className: "online-players-label", children: "\uD83D\uDFE2 Online" }), _jsx("div", { className: "recent-trainers", children: onlinePlayers.map((name) => (_jsx("button", { className: "recent-trainer-btn", onClick: () => setTargetName(name), children: name }, name))) })] })), _jsx("input", { className: "battle-mp-input", type: "text", placeholder: "Opponent's name", value: targetName, onChange: (e) => setTargetName(e.target.value), onKeyDown: (e) => e.key === 'Enter' && handleChallenge(), maxLength: 20 }), _jsx("button", { className: "battle-mp-btn", onClick: handleChallenge, disabled: !targetName.trim(), children: "\u2694\uFE0F Challenge!" })] })), phase === 'waiting' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "battle-mp-status waiting", children: ["Waiting for ", targetName, " to challenge you back..."] }), _jsx("button", { className: "battle-mp-btn", onClick: handleCancel, children: "Cancel" })] }))] })] }));
}
