// Elo rating system
export const STARTING_ELO = 1000;
const K_FACTOR = 32;
function calculateExpectedScore(playerElo, opponentElo) {
    return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}
export function calculateEloChanges(winnerElo, loserElo) {
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
