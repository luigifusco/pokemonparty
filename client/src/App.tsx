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
import type { Notification } from './pages/NotificationsScreen';
import TVView from './pages/TVView';
import AdminPanel from './pages/AdminPanel';
import BackgroundsDemo from './pages/BackgroundsDemo';
import StoryScreen from './pages/StoryScreen';
import TournamentScreen from './pages/TournamentScreen';
import { socket } from './socket';
import { syncEssence, addPokemonToServer, removePokemonFromServer, addItemsToServer, removeItemsFromServer, evolvePokemonOnServer, teachTMOnServer, useBoostOnServer, giveHeldItemOnServer, takeHeldItemOnServer, buildInstance, buildItem } from './api';
import { BASE_PATH } from './config';
import { STARTING_ESSENCE } from '@shared/essence';
import { STARTING_ELO } from '@shared/elo';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { MAX_IV } from '@shared/boost-data';
import type { StatKey } from '@shared/boost-data';
import type { PokemonInstance, OwnedItem, MoveId } from '@shared/types';
import { getEffectiveMoves } from '@shared/types';

interface PlayerState {
  id: string;
  name: string;
  picture: string | null;
}

export default function App() {
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [essence, setEssence] = useState(0);
  const [elo, setElo] = useState(STARTING_ELO);
  const [collection, setCollection] = useState<PokemonInstance[]>([]);
  const [items, setItems] = useState<OwnedItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [discovered, setDiscovered] = useState<Set<number>>(new Set());
  const [recentPokemonIds, setRecentPokemonIds] = useState<number[]>([]);

  const spendEssence = (amount: number) => {
    const newEssence = essence - amount;
    setEssence(newEssence);
    if (player) syncEssence(player.id, newEssence);
  };
  const gainEssence = (amount: number) => {
    const newEssence = essence + amount;
    setEssence(newEssence);
    if (player) syncEssence(player.id, newEssence);
  };
  const addPokemon = async (pokemonIds: number[]): Promise<PokemonInstance[]> => {
    if (player) {
      const instances = await addPokemonToServer(player.id, pokemonIds);
      setCollection((c) => [...c, ...instances]);
      setDiscovered((prev) => {
        const next = new Set(prev);
        for (const pid of pokemonIds) next.add(pid);
        return next;
      });
      return instances;
    }
    return [];
  };

  const addItems = async (newItems: { itemType: string; itemData: string }[]) => {
    if (player) {
      const created = await addItemsToServer(player.id, newItems);
      setItems((i) => [...i, ...created]);
    }
  };

  const evolvePokemon = async (instance: PokemonInstance, targetId: number) => {
    const pokemon = instance.pokemon;
    if (!pokemon.evolutionTo || !pokemon.evolutionTo.includes(targetId)) return;
    const evolved = POKEMON_BY_ID[targetId];
    if (!evolved) return;

    // Consume 3 tokens of the same pokemon
    const tokenId = String(pokemon.id);
    const tokensToRemove = items.filter((i) => i.itemType === 'token' && i.itemData === tokenId).slice(0, 3);
    if (tokensToRemove.length < 3) return;

    // Remove tokens from local state
    const removedIds = new Set(tokensToRemove.map((t) => t.id));
    setItems((prev) => prev.filter((i) => !removedIds.has(i.id)));

    // Evolve the pokemon in-place (keep IVs, nature)
    setCollection((c) =>
      c.map((inst) =>
        inst.instanceId === instance.instanceId
          ? { ...inst, pokemon: evolved }
          : inst
      )
    );

    if (player) {
      removeItemsFromServer(player.id, 'token', tokenId, 3);
      evolvePokemonOnServer(player.id, instance.instanceId, evolved.id);
    }
  };

  const shardPokemon = async (instance: PokemonInstance) => {
    // If pokemon holds an item, return it to inventory
    if (instance.heldItem) {
      const created = await addItemsToServer(player!.id, [{ itemType: 'held_item', itemData: instance.heldItem }]);
      setItems((i) => [...i, ...created]);
    }
    setCollection((c) => c.filter((inst) => inst.instanceId !== instance.instanceId));
    if (player) {
      removePokemonFromServer(player.id, instance.pokemon.id, 1);
      await addItems([{ itemType: 'token', itemData: String(instance.pokemon.id) }]);
    }
  };

  const teachTM = async (instance: PokemonInstance, moveName: string, moveSlot: 0 | 1) => {
    const currentMoves = getEffectiveMoves(instance);
    const newMoves: [MoveId, MoveId] = [...currentMoves];
    newMoves[moveSlot] = moveName;

    // Update pokemon's moves locally
    setCollection((c) =>
      c.map((inst) =>
        inst.instanceId === instance.instanceId
          ? { ...inst, learnedMoves: newMoves }
          : inst
      )
    );

    // Remove TM locally (just one copy)
    const tmToRemove = items.find((i) => i.itemType === 'tm' && i.itemData === moveName);
    if (tmToRemove) {
      setItems((prev) => prev.filter((i) => i.id !== tmToRemove.id));
    }

    if (player) {
      teachTMOnServer(player.id, instance.instanceId, moveName, moveSlot);
    }
  };

  const useBoost = async (instance: PokemonInstance, stat: StatKey) => {
    // Update IV locally
    setCollection((c) =>
      c.map((inst) =>
        inst.instanceId === instance.instanceId
          ? { ...inst, ivs: { ...inst.ivs, [stat]: MAX_IV } }
          : inst
      )
    );

    // Remove boost item locally (just one copy)
    const boostToRemove = items.find((i) => i.itemType === 'boost' && i.itemData === stat);
    if (boostToRemove) {
      setItems((prev) => prev.filter((i) => i.id !== boostToRemove.id));
    }

    if (player) {
      useBoostOnServer(player.id, instance.instanceId, stat);
    }
  };

  const giveHeldItem = async (instance: PokemonInstance, itemId: string) => {
    // If pokemon already holds an item, return it to inventory
    if (instance.heldItem) {
      const returned = await addItemsToServer(player!.id, [{ itemType: 'held_item', itemData: instance.heldItem }]);
      setItems((i) => [...i, ...returned]);
    }

    // Assign item to pokemon locally
    setCollection((c) =>
      c.map((inst) =>
        inst.instanceId === instance.instanceId
          ? { ...inst, heldItem: itemId }
          : inst
      )
    );

    // Remove held item from inventory locally
    const itemToRemove = items.find((i) => i.itemType === 'held_item' && i.itemData === itemId);
    if (itemToRemove) {
      setItems((prev) => prev.filter((i) => i.id !== itemToRemove.id));
    }

    if (player) {
      giveHeldItemOnServer(player.id, instance.instanceId, itemId);
    }
  };

  const takeHeldItem = async (instance: PokemonInstance) => {
    if (!instance.heldItem) return;
    const itemId = instance.heldItem;

    // Remove item from pokemon locally
    setCollection((c) =>
      c.map((inst) =>
        inst.instanceId === instance.instanceId
          ? { ...inst, heldItem: undefined }
          : inst
      )
    );

    // Add item back to inventory
    if (player) {
      const created = await addItemsToServer(player.id, [{ itemType: 'held_item', itemData: itemId }]);
      setItems((i) => [...i, ...created]);
      takeHeldItemOnServer(player.id, instance.instanceId);
    }
  };

  const handleTrade = (give: PokemonInstance, receive: PokemonInstance) => {
    setCollection((c) => {
      const newCol = [...c];
      const idx = newCol.findIndex((inst) => inst.instanceId === give.instanceId);
      if (idx !== -1) newCol.splice(idx, 1);
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
    const addNotification = (type: Notification['type'], from: string) => {
      setNotifications((prev) => {
        // Deduplicate: only one notification per (type, from)
        if (prev.some((n) => n.type === type && n.from === from)) return prev;
        return [...prev, { id: crypto.randomUUID(), type, from, timestamp: Date.now() }];
      });
    };

    const onBattleChallenged = ({ challenger }: { challenger: string }) => {
      addNotification('battle', challenger);
    };
    const onTradeIncoming = ({ from }: { from: string }) => {
      addNotification('trade', from);
    };
    const onTournamentCreated = ({ name }: { name: string }) => {
      addNotification('tournament', name);
    };
    const onTournamentMatchReady = ({ opponent }: { opponent: string }) => {
      addNotification('tournament', 'Match vs ' + opponent);
    };

    socket.on('battle:challenged', onBattleChallenged);
    socket.on('trade:incoming', onTradeIncoming);
    socket.on('tournament:created', onTournamentCreated);
    socket.on('tournament:matchReady', onTournamentMatchReady);

    return () => {
      socket.off('battle:challenged', onBattleChallenged);
      socket.off('trade:incoming', onTradeIncoming);
      socket.off('tournament:created', onTournamentCreated);
      socket.off('tournament:matchReady', onTournamentMatchReady);
    };
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const navigate = useNavigate();
  const handleAcceptNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    const routes: Record<Notification['type'], string> = {
      battle: '/battle',
      trade: '/trade',
      tournament: '/tournaments',
    };
    navigate(routes[notification.type], { state: { autoChallenge: notification.from } });
  }, [navigate]);

  const handleLogin = async (playerData: { id: string; name: string; essence: number; elo: number; picture?: string | null }, pokemonRows: any[], itemRows: any[], recentPokemon?: number[]) => {
    setPlayer({ id: playerData.id, name: playerData.name, picture: playerData.picture ?? null });
    setEssence(playerData.essence);
    setElo(playerData.elo ?? STARTING_ELO);
    setCollection(pokemonRows.map(buildInstance).filter(Boolean) as PokemonInstance[]);
    setItems((itemRows ?? []).map(buildItem));
    setRecentPokemonIds(recentPokemon ?? []);

    // Backfill pokedex from owned pokemon, then load discovered set
    await fetch(`${BASE_PATH}/api/player/${playerData.id}/pokedex/backfill`, { method: 'POST' });
    const pdRes = await fetch(`${BASE_PATH}/api/player/${playerData.id}/pokedex`);
    const pdData = await pdRes.json();
    setDiscovered(new Set(pdData.discovered));
    // Connect socket and identify
    socket.connect();
    socket.emit('player:identify', playerData.name);
  };

  // TV and admin views are always accessible without login
  if (!player) {
    return (
      <Routes>
        <Route path="/tv" element={<TVView />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/bg-demo" element={<BackgroundsDemo />} />
        <Route path="*" element={<LoginScreen onLogin={handleLogin} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/play" element={<MenuScreen playerName={player.name} playerPicture={player.picture} essence={essence} elo={elo} collectionSize={collection.length} itemCount={items.length} notificationCount={notifications.length} />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/notifications" element={<NotificationsScreen notifications={notifications} onAccept={handleAcceptNotification} onDismiss={dismissNotification} />} />
      <Route path="/collection" element={<CollectionScreen collection={collection} items={items} onEvolve={evolvePokemon} onShard={shardPokemon} />} />
      <Route path="/pokemon/:idx" element={<PokemonDetailScreen collection={collection} items={items} onShard={shardPokemon} onEvolve={evolvePokemon} />} />
      <Route path="/pokedex" element={<PokedexScreen discovered={discovered} />} />
      <Route path="/store" element={<StoreScreen essence={essence} onSpendEssence={spendEssence} onAddPokemon={addPokemon} onAddItems={addItems} />} />
      <Route path="/shop" element={<ShopScreen essence={essence} onSpendEssence={spendEssence} onAddItems={addItems} />} />
      <Route path="/items" element={<ItemsScreen items={items} collection={collection} onTeachTM={teachTM} onUseBoost={useBoost} onGiveHeldItem={giveHeldItem} onTakeHeldItem={takeHeldItem} />} />
      <Route path="/trade" element={<TradeScreen playerName={player.name} collection={collection} onTrade={handleTrade} />} />
      <Route path="/battle" element={<BattleMultiplayer playerName={player.name} collection={collection} essence={essence} onGainEssence={gainEssence} onEloUpdate={(newElo) => setElo(newElo)} recentPokemonIds={recentPokemonIds} onUpdateRecentPokemonIds={setRecentPokemonIds} />} />
      <Route path="/battle-demo" element={<BattleDemo essence={essence} onGainEssence={gainEssence} collection={collection} recentPokemonIds={recentPokemonIds} />} />
      <Route path="/story" element={<StoryScreen playerId={player.id} essence={essence} onGainEssence={gainEssence} onAddPokemon={addPokemon} onAddItems={addItems} collection={collection} />} />
      <Route path="/tournaments" element={<TournamentScreen playerName={player.name} collection={collection} />} />
      <Route path="/tv" element={<TVView />} />
      <Route path="/bg-demo" element={<BackgroundsDemo />} />
      <Route path="*" element={<Navigate to="/play" replace />} />
    </Routes>
  );
}
