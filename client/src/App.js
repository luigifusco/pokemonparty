import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginScreen from './pages/LoginScreen';
import MenuScreen from './pages/MenuScreen';
import PokedexScreen from './pages/PokedexScreen';
import CollectionScreen from './pages/CollectionScreen';
import PokemonDetailScreen from './pages/PokemonDetailScreen';
import StoreScreen from './pages/StoreScreen';
import ItemsScreen from './pages/ItemsScreen';
import BattleDemo from './pages/BattleDemo';
import BattleMultiplayer from './pages/BattleMultiplayer';
import ShopScreen from './pages/ShopScreen';
import TradeScreen from './pages/TradeScreen';
import NotificationsScreen from './pages/NotificationsScreen';
import TVView from './pages/TVView';
import AdminPanel from './pages/AdminPanel';
import StoryScreen from './pages/StoryScreen';
import { socket } from './socket';
import { syncEssence, addPokemonToServer, removePokemonFromServer, addItemsToServer, removeItemsFromServer, evolvePokemonOnServer, teachTMOnServer, useBoostOnServer, giveHeldItemOnServer, takeHeldItemOnServer, buildInstance, buildItem } from './api';
import { BASE_PATH } from './config';
import { STARTING_ELO } from '@shared/elo';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { MAX_IV } from '@shared/boost-data';
import { getEffectiveMoves } from '@shared/types';
export default function App() {
    const [player, setPlayer] = useState(null);
    const [essence, setEssence] = useState(0);
    const [elo, setElo] = useState(STARTING_ELO);
    const [collection, setCollection] = useState([]);
    const [items, setItems] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [discovered, setDiscovered] = useState(new Set());
    const spendEssence = (amount) => {
        const newEssence = essence - amount;
        setEssence(newEssence);
        if (player)
            syncEssence(player.id, newEssence);
    };
    const gainEssence = (amount) => {
        const newEssence = essence + amount;
        setEssence(newEssence);
        if (player)
            syncEssence(player.id, newEssence);
    };
    const addPokemon = async (pokemonIds) => {
        if (player) {
            const instances = await addPokemonToServer(player.id, pokemonIds);
            setCollection((c) => [...c, ...instances]);
            setDiscovered((prev) => {
                const next = new Set(prev);
                for (const pid of pokemonIds)
                    next.add(pid);
                return next;
            });
            return instances;
        }
        return [];
    };
    const addItems = async (newItems) => {
        if (player) {
            const created = await addItemsToServer(player.id, newItems);
            setItems((i) => [...i, ...created]);
        }
    };
    const evolvePokemon = async (instance, targetId) => {
        const pokemon = instance.pokemon;
        if (!pokemon.evolutionTo || !pokemon.evolutionTo.includes(targetId))
            return;
        const evolved = POKEMON_BY_ID[targetId];
        if (!evolved)
            return;
        // Consume 3 tokens of the same pokemon
        const tokenId = String(pokemon.id);
        const tokensToRemove = items.filter((i) => i.itemType === 'token' && i.itemData === tokenId).slice(0, 3);
        if (tokensToRemove.length < 3)
            return;
        // Remove tokens from local state
        const removedIds = new Set(tokensToRemove.map((t) => t.id));
        setItems((prev) => prev.filter((i) => !removedIds.has(i.id)));
        // Evolve the pokemon in-place (keep IVs, nature)
        setCollection((c) => c.map((inst) => inst.instanceId === instance.instanceId
            ? { ...inst, pokemon: evolved }
            : inst));
        if (player) {
            removeItemsFromServer(player.id, 'token', tokenId, 3);
            evolvePokemonOnServer(player.id, instance.instanceId, evolved.id);
        }
    };
    const shardPokemon = async (instance) => {
        // If pokemon holds an item, return it to inventory
        if (instance.heldItem) {
            const created = await addItemsToServer(player.id, [{ itemType: 'held_item', itemData: instance.heldItem }]);
            setItems((i) => [...i, ...created]);
        }
        setCollection((c) => c.filter((inst) => inst.instanceId !== instance.instanceId));
        if (player) {
            removePokemonFromServer(player.id, instance.pokemon.id, 1);
            await addItems([{ itemType: 'token', itemData: String(instance.pokemon.id) }]);
        }
    };
    const teachTM = async (instance, moveName, moveSlot) => {
        const currentMoves = getEffectiveMoves(instance);
        const newMoves = [...currentMoves];
        newMoves[moveSlot] = moveName;
        // Update pokemon's moves locally
        setCollection((c) => c.map((inst) => inst.instanceId === instance.instanceId
            ? { ...inst, learnedMoves: newMoves }
            : inst));
        // Remove TM locally (just one copy)
        const tmToRemove = items.find((i) => i.itemType === 'tm' && i.itemData === moveName);
        if (tmToRemove) {
            setItems((prev) => prev.filter((i) => i.id !== tmToRemove.id));
        }
        if (player) {
            teachTMOnServer(player.id, instance.instanceId, moveName, moveSlot);
        }
    };
    const useBoost = async (instance, stat) => {
        // Update IV locally
        setCollection((c) => c.map((inst) => inst.instanceId === instance.instanceId
            ? { ...inst, ivs: { ...inst.ivs, [stat]: MAX_IV } }
            : inst));
        // Remove boost item locally (just one copy)
        const boostToRemove = items.find((i) => i.itemType === 'boost' && i.itemData === stat);
        if (boostToRemove) {
            setItems((prev) => prev.filter((i) => i.id !== boostToRemove.id));
        }
        if (player) {
            useBoostOnServer(player.id, instance.instanceId, stat);
        }
    };
    const giveHeldItem = async (instance, itemId) => {
        // If pokemon already holds an item, return it to inventory
        if (instance.heldItem) {
            const returned = await addItemsToServer(player.id, [{ itemType: 'held_item', itemData: instance.heldItem }]);
            setItems((i) => [...i, ...returned]);
        }
        // Assign item to pokemon locally
        setCollection((c) => c.map((inst) => inst.instanceId === instance.instanceId
            ? { ...inst, heldItem: itemId }
            : inst));
        // Remove held item from inventory locally
        const itemToRemove = items.find((i) => i.itemType === 'held_item' && i.itemData === itemId);
        if (itemToRemove) {
            setItems((prev) => prev.filter((i) => i.id !== itemToRemove.id));
        }
        if (player) {
            giveHeldItemOnServer(player.id, instance.instanceId, itemId);
        }
    };
    const takeHeldItem = async (instance) => {
        if (!instance.heldItem)
            return;
        const itemId = instance.heldItem;
        // Remove item from pokemon locally
        setCollection((c) => c.map((inst) => inst.instanceId === instance.instanceId
            ? { ...inst, heldItem: undefined }
            : inst));
        // Add item back to inventory
        if (player) {
            const created = await addItemsToServer(player.id, [{ itemType: 'held_item', itemData: itemId }]);
            setItems((i) => [...i, ...created]);
            takeHeldItemOnServer(player.id, instance.instanceId);
        }
    };
    const handleTrade = (give, receive) => {
        setCollection((c) => {
            const newCol = [...c];
            const idx = newCol.findIndex((inst) => inst.instanceId === give.instanceId);
            if (idx !== -1)
                newCol.splice(idx, 1);
            newCol.push(receive);
            return newCol;
        });
        if (player) {
            removePokemonFromServer(player.id, give.pokemon.id, 1);
            addPokemonToServer(player.id, [receive.pokemon.id]);
        }
    };
    // Global notification listeners
    useEffect(() => {
        const addNotification = (type, from) => {
            setNotifications((prev) => {
                // Deduplicate: only one notification per (type, from)
                if (prev.some((n) => n.type === type && n.from === from))
                    return prev;
                return [...prev, { id: crypto.randomUUID(), type, from, timestamp: Date.now() }];
            });
        };
        const onBattleChallenged = ({ challenger }) => {
            addNotification('battle', challenger);
        };
        const onTradeIncoming = ({ from }) => {
            addNotification('trade', from);
        };
        socket.on('battle:challenged', onBattleChallenged);
        socket.on('trade:incoming', onTradeIncoming);
        return () => {
            socket.off('battle:challenged', onBattleChallenged);
            socket.off('trade:incoming', onTradeIncoming);
        };
    }, []);
    const dismissNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);
    const navigate = useNavigate();
    const handleAcceptNotification = useCallback((notification) => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        const routes = {
            battle: '/battle',
            trade: '/trade',
        };
        navigate(routes[notification.type], { state: { autoChallenge: notification.from } });
    }, [navigate]);
    const handleLogin = async (playerData, pokemonRows, itemRows) => {
        setPlayer({ id: playerData.id, name: playerData.name });
        setEssence(playerData.essence);
        setElo(playerData.elo ?? STARTING_ELO);
        setCollection(pokemonRows.map(buildInstance).filter(Boolean));
        setItems((itemRows ?? []).map(buildItem));
        // Backfill pokedex from owned pokemon, then load discovered set
        await fetch(`${BASE_PATH}/api/player/${playerData.id}/pokedex/backfill`, { method: 'POST' });
        const pdRes = await fetch(`${BASE_PATH}/api/player/${playerData.id}/pokedex`);
        const pdData = await pdRes.json();
        setDiscovered(new Set(pdData.discovered));
        // Connect socket and identify
        socket.connect();
        socket.emit('player:identify', playerData.name);
    };
    // TV view is always accessible without login
    // Everything else requires login
    if (!player) {
        return (_jsxs(Routes, { children: [_jsx(Route, { path: "/tv", element: _jsx(TVView, {}) }), _jsx(Route, { path: "*", element: _jsx(LoginScreen, { onLogin: handleLogin }) })] }));
    }
    // Admin panel for "admin" user
    if (player.name === 'admin') {
        return (_jsx(Routes, { children: _jsx(Route, { path: "*", element: _jsx(AdminPanel, {}) }) }));
    }
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/play", element: _jsx(MenuScreen, { playerName: player.name, essence: essence, elo: elo, collectionSize: collection.length, itemCount: items.length, notificationCount: notifications.length }) }), _jsx(Route, { path: "/notifications", element: _jsx(NotificationsScreen, { notifications: notifications, onAccept: handleAcceptNotification, onDismiss: dismissNotification }) }), _jsx(Route, { path: "/collection", element: _jsx(CollectionScreen, { collection: collection, items: items, onEvolve: evolvePokemon, onShard: shardPokemon }) }), _jsx(Route, { path: "/pokemon/:idx", element: _jsx(PokemonDetailScreen, { collection: collection }) }), _jsx(Route, { path: "/pokedex", element: _jsx(PokedexScreen, { discovered: discovered }) }), _jsx(Route, { path: "/store", element: _jsx(StoreScreen, { essence: essence, onSpendEssence: spendEssence, onAddPokemon: addPokemon, onAddItems: addItems }) }), _jsx(Route, { path: "/shop", element: _jsx(ShopScreen, { essence: essence, onSpendEssence: spendEssence, onAddItems: addItems }) }), _jsx(Route, { path: "/items", element: _jsx(ItemsScreen, { items: items, collection: collection, onTeachTM: teachTM, onUseBoost: useBoost, onGiveHeldItem: giveHeldItem, onTakeHeldItem: takeHeldItem }) }), _jsx(Route, { path: "/trade", element: _jsx(TradeScreen, { playerName: player.name, collection: collection, onTrade: handleTrade }) }), _jsx(Route, { path: "/battle", element: _jsx(BattleMultiplayer, { playerName: player.name, collection: collection, essence: essence, onGainEssence: gainEssence, onEloUpdate: (newElo) => setElo(newElo) }) }), _jsx(Route, { path: "/battle-demo", element: _jsx(BattleDemo, { essence: essence, onGainEssence: gainEssence, collection: collection }) }), _jsx(Route, { path: "/story", element: _jsx(StoryScreen, { playerId: player.id, essence: essence, onGainEssence: gainEssence, onAddPokemon: addPokemon, onAddItems: addItems, collection: collection }) }), _jsx(Route, { path: "/tv", element: _jsx(TVView, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/play", replace: true }) })] }));
}
