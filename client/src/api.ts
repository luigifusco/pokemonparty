import type { PokemonInstance, NatureName, OwnedItem } from '@shared/types';
import { POKEMON_BY_ID } from '@shared/pokemon-data';

import { BASE_PATH } from './config';

const API_BASE = BASE_PATH;

// Build a PokemonInstance from a server-returned owned_pokemon row
export function buildInstance(row: any): PokemonInstance | null {
  const pokemon = POKEMON_BY_ID[row.pokemon_id];
  if (!pokemon) return null;
  const inst: PokemonInstance = {
    instanceId: row.id,
    pokemon,
    nature: row.nature as NatureName,
    ivs: {
      hp: row.iv_hp,
      attack: row.iv_atk,
      defense: row.iv_def,
      spAtk: row.iv_spa,
      spDef: row.iv_spd,
      speed: row.iv_spe,
    },
  };
  if (row.move_1 != null && row.move_2 != null) {
    inst.learnedMoves = [row.move_1, row.move_2];
  }
  if (row.held_item != null) {
    inst.heldItem = row.held_item;
  }
  return inst;
}

// Build an OwnedItem from a server-returned owned_items row
export function buildItem(row: any): OwnedItem {
  return {
    id: row.id,
    itemType: row.item_type,
    itemData: row.item_data,
  };
}

export async function syncEssence(playerId: string, essence: number) {
  await fetch(`${API_BASE}/api/player/${playerId}/essence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ essence }),
  });
}

export async function addPokemonToServer(playerId: string, pokemonIds: number[]): Promise<PokemonInstance[]> {
  const res = await fetch(`${API_BASE}/api/player/${playerId}/pokemon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pokemonIds }),
  });
  const data = await res.json();
  return (data.pokemon ?? []).map(buildInstance).filter(Boolean) as PokemonInstance[];
}

export async function removePokemonFromServer(playerId: string, pokemonId: number, count: number) {
  await fetch(`${API_BASE}/api/player/${playerId}/pokemon/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pokemonId, count }),
  });
}

export async function addItemsToServer(playerId: string, items: { itemType: string; itemData: string }[]): Promise<OwnedItem[]> {
  const res = await fetch(`${API_BASE}/api/player/${playerId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const data = await res.json();
  return (data.items ?? []).map(buildItem);
}

export async function removeItemsFromServer(playerId: string, itemType: string, itemData: string, count: number) {
  await fetch(`${API_BASE}/api/player/${playerId}/items/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemType, itemData, count }),
  });
}

export async function evolvePokemonOnServer(playerId: string, instanceId: string, newPokemonId: number) {
  await fetch(`${API_BASE}/api/player/${playerId}/pokemon/evolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instanceId, newPokemonId }),
  });
}

export async function teachTMOnServer(playerId: string, instanceId: string, moveName: string, moveSlot: 0 | 1) {
  await fetch(`${API_BASE}/api/player/${playerId}/pokemon/teach-tm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instanceId, moveName, moveSlot }),
  });
}

export async function useBoostOnServer(playerId: string, instanceId: string, stat: string) {
  await fetch(`${API_BASE}/api/player/${playerId}/pokemon/use-boost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instanceId, stat }),
  });
}

export async function giveHeldItemOnServer(playerId: string, instanceId: string, itemId: string) {
  await fetch(`${API_BASE}/api/player/${playerId}/pokemon/give-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instanceId, itemId }),
  });
}

export async function takeHeldItemOnServer(playerId: string, instanceId: string) {
  await fetch(`${API_BASE}/api/player/${playerId}/pokemon/take-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instanceId }),
  });
}
