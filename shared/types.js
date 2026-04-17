// Shared types for the Pokémon party game
// Returns the effective moves for a pokemon instance (learned overrides species defaults)
export function getEffectiveMoves(inst) {
    return inst.learnedMoves ?? inst.pokemon.moves;
}
