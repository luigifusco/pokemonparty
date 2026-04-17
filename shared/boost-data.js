// Boost items — one per stat, maxes out the IV when used on a Pokémon
// Sprites from Pokémon Showdown CDN (vitamin item icons)
export const MAX_IV = 31;
export const BOOST_ITEMS = [
    { stat: 'hp', name: 'HP Up', spriteSlug: 'hp-up' },
    { stat: 'attack', name: 'Protein', spriteSlug: 'protein' },
    { stat: 'defense', name: 'Iron', spriteSlug: 'iron' },
    { stat: 'spAtk', name: 'Calcium', spriteSlug: 'calcium' },
    { stat: 'spDef', name: 'Zinc', spriteSlug: 'zinc' },
    { stat: 'speed', name: 'Carbos', spriteSlug: 'carbos' },
];
export const BOOST_BY_STAT = Object.fromEntries(BOOST_ITEMS.map((b) => [b.stat, b]));
export function getBoostSprite(stat) {
    return `/pokemonparty/assets/${BOOST_BY_STAT[stat].spriteSlug}.png`;
}
export function getBoostName(stat) {
    return BOOST_BY_STAT[stat].name;
}
export function rollBoost() {
    const stats = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'];
    return stats[Math.floor(Math.random() * stats.length)];
}
