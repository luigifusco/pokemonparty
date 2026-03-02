// Elo rating system

export const STARTING_ELO = 1000;
export const K_FACTOR = 32;

export function calculateExpectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

export function calculateEloChanges(
  winnerElo: number,
  loserElo: number
): { winnerNewElo: number; loserNewElo: number; winnerDelta: number; loserDelta: number } {
  const expectedWinner = calculateExpectedScore(winnerElo, loserElo);
  const expectedLoser = 1 - expectedWinner;

  const winnerDelta = Math.round(K_FACTOR * (1 - expectedWinner));
  const loserDelta = Math.round(K_FACTOR * (0 - expectedLoser));

  return {
    winnerNewElo: winnerElo + winnerDelta,
    loserNewElo: Math.max(0, loserElo + loserDelta),
    winnerDelta,
    loserDelta,
  };
}
