import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './pages/LoginScreen';
import MenuScreen from './pages/MenuScreen';
import PokedexScreen from './pages/PokedexScreen';
import CollectionScreen from './pages/CollectionScreen';
import StoreScreen from './pages/StoreScreen';
import BattleDemo from './pages/BattleDemo';
import BattleMultiplayer from './pages/BattleMultiplayer';
import TradeScreen from './pages/TradeScreen';
import TVView from './pages/TVView';
import { socket } from './socket';
import { syncEssence, addPokemonToServer, removePokemonFromServer } from './api';
import { STARTING_ESSENCE } from '@shared/essence';
import { STARTING_ELO } from '@shared/elo';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import type { Pokemon } from '@shared/types';

interface PlayerState {
  id: string;
  name: string;
}

export default function App() {
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [essence, setEssence] = useState(0);
  const [elo, setElo] = useState(STARTING_ELO);
  const [collection, setCollection] = useState<Pokemon[]>([]);

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
  const addPokemon = (pokemon: Pokemon[]) => {
    setCollection((c) => [...c, ...pokemon]);
    if (player) addPokemonToServer(player.id, pokemon.map((p) => p.id));
  };

  const evolvePokemon = (pokemonId: number) => {
    const pokemon = POKEMON_BY_ID[pokemonId];
    if (!pokemon || !pokemon.evolutionTo) return;
    const evolved = POKEMON_BY_ID[pokemon.evolutionTo];
    if (!evolved) return;

    setCollection((c) => {
      const newCol = [...c];
      let removed = 0;
      const filtered = newCol.filter((p) => {
        if (p.id === pokemonId && removed < 4) {
          removed++;
          return false;
        }
        return true;
      });
      return [...filtered, evolved];
    });

    if (player) {
      removePokemonFromServer(player.id, pokemonId, 4);
      addPokemonToServer(player.id, [evolved.id]);
    }
  };

  const handleTrade = (give: Pokemon, receive: Pokemon) => {
    setCollection((c) => {
      const newCol = [...c];
      const idx = newCol.findIndex((p) => p.id === give.id);
      if (idx !== -1) newCol.splice(idx, 1);
      newCol.push(receive);
      return newCol;
    });
    if (player) {
      removePokemonFromServer(player.id, give.id, 1);
      addPokemonToServer(player.id, [receive.id]);
    }
  };

  const handleLogin = (playerData: { id: string; name: string; essence: number; elo: number }, pokemonIds: number[]) => {
    setPlayer({ id: playerData.id, name: playerData.name });
    setEssence(playerData.essence);
    setElo(playerData.elo ?? STARTING_ELO);
    setCollection(pokemonIds.map((id) => POKEMON_BY_ID[id]).filter(Boolean));
    // Connect socket and identify
    socket.connect();
    socket.emit('player:identify', playerData.name);
  };

  // TV view is always accessible without login
  // Everything else requires login
  if (!player) {
    return (
      <Routes>
        <Route path="/tv" element={<TVView />} />
        <Route path="*" element={<LoginScreen onLogin={handleLogin} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/play" element={<MenuScreen playerName={player.name} essence={essence} elo={elo} collectionSize={collection.length} />} />
      <Route path="/collection" element={<CollectionScreen collection={collection} onEvolve={evolvePokemon} />} />
      <Route path="/pokedex" element={<PokedexScreen />} />
      <Route path="/store" element={<StoreScreen essence={essence} onSpendEssence={spendEssence} onAddPokemon={addPokemon} />} />
      <Route path="/trade" element={<TradeScreen playerName={player.name} collection={collection} onTrade={handleTrade} />} />
      <Route path="/battle" element={<BattleMultiplayer playerName={player.name} collection={collection} essence={essence} onGainEssence={gainEssence} onEloUpdate={(newElo) => setElo(newElo)} />} />
      <Route path="/battle-demo" element={<BattleDemo essence={essence} onGainEssence={gainEssence} />} />
      <Route path="/tv" element={<TVView />} />
      <Route path="*" element={<Navigate to="/play" replace />} />
    </Routes>
  );
}
