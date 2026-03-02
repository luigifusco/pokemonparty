const API_BASE = '';

export async function syncEssence(playerId: string, essence: number) {
  await fetch(`${API_BASE}/api/player/${playerId}/essence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ essence }),
  });
}

export async function addPokemonToServer(playerId: string, pokemonIds: number[]) {
  await fetch(`${API_BASE}/api/player/${playerId}/pokemon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pokemonIds }),
  });
}

export async function removePokemonFromServer(playerId: string, pokemonId: number, count: number) {
  await fetch(`${API_BASE}/api/player/${playerId}/pokemon/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pokemonId, count }),
  });
}
