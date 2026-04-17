import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { BASE_PATH } from './config';
const API_BASE = BASE_PATH;
// Build a PokemonInstance from a server-returned owned_pokemon row
export function buildInstance(row) {
    const pokemon = POKEMON_BY_ID[row.pokemon_id];
    if (!pokemon)
        return null;
    const inst = {
        instanceId: row.id,
        pokemon,
        nature: row.nature,
        ability: row.ability || '',
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
export function buildItem(row) {
    return {
        id: row.id,
        itemType: row.item_type,
        itemData: row.item_data,
    };
}
export async function syncEssence(playerId, essence) {
    await fetch(`${API_BASE}/api/player/${playerId}/essence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ essence }),
    });
}
export async function addPokemonToServer(playerId, pokemonIds) {
    const res = await fetch(`${API_BASE}/api/player/${playerId}/pokemon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pokemonIds }),
    });
    const data = await res.json();
    return (data.pokemon ?? []).map(buildInstance).filter(Boolean);
}
export async function removePokemonFromServer(playerId, pokemonId, count) {
    await fetch(`${API_BASE}/api/player/${playerId}/pokemon/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pokemonId, count }),
    });
}
export async function addItemsToServer(playerId, items) {
    const res = await fetch(`${API_BASE}/api/player/${playerId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
    });
    const data = await res.json();
    return (data.items ?? []).map(buildItem);
}
export async function removeItemsFromServer(playerId, itemType, itemData, count) {
    await fetch(`${API_BASE}/api/player/${playerId}/items/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType, itemData, count }),
    });
}
export async function evolvePokemonOnServer(playerId, instanceId, newPokemonId) {
    await fetch(`${API_BASE}/api/player/${playerId}/pokemon/evolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, newPokemonId }),
    });
}
export async function teachTMOnServer(playerId, instanceId, moveName, moveSlot) {
    await fetch(`${API_BASE}/api/player/${playerId}/pokemon/teach-tm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, moveName, moveSlot }),
    });
}
export async function useBoostOnServer(playerId, instanceId, stat) {
    await fetch(`${API_BASE}/api/player/${playerId}/pokemon/use-boost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, stat }),
    });
}
export async function giveHeldItemOnServer(playerId, instanceId, itemId) {
    await fetch(`${API_BASE}/api/player/${playerId}/pokemon/give-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, itemId }),
    });
}
export async function takeHeldItemOnServer(playerId, instanceId) {
    await fetch(`${API_BASE}/api/player/${playerId}/pokemon/take-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId }),
    });
}
