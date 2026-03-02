const MAX_RECENT = 3;
const STORAGE_KEY = 'recentTrainers';

function getKey(playerName: string): string {
  return `${STORAGE_KEY}:${playerName}`;
}

export function getRecentTrainers(playerName: string): string[] {
  try {
    const raw = localStorage.getItem(getKey(playerName));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentTrainer(playerName: string, trainerName: string): void {
  const recent = getRecentTrainers(playerName).filter((n) => n !== trainerName);
  recent.unshift(trainerName);
  localStorage.setItem(getKey(playerName), JSON.stringify(recent.slice(0, MAX_RECENT)));
}
