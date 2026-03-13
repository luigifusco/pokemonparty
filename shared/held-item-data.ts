// Held item definitions for battle use
// Sprites sourced from play.pokemonshowdown.com/sprites/itemicons/

export interface HeldItemDef {
  id: string;
  name: string;
  description: string;
  price: number;
  sprite: string;
}

const ITEMS_PATH = '/pokemonparty/assets/items';

export const HELD_ITEMS: HeldItemDef[] = [
  // Recovery
  { id: 'leftovers', name: 'Leftovers', description: 'Restores 1/16 max HP each turn.', price: 200, sprite: `${ITEMS_PATH}/leftovers.png` },
  { id: 'sitrus-berry', name: 'Sitrus Berry', description: 'Restores 25% HP when below 50% HP. Consumed after use.', price: 100, sprite: `${ITEMS_PATH}/sitrus-berry.png` },
  { id: 'shell-bell', name: 'Shell Bell', description: 'Restores 1/8 of damage dealt to the opponent.', price: 120, sprite: `${ITEMS_PATH}/shell-bell.png` },
  { id: 'black-sludge', name: 'Black Sludge', description: 'Poison-types recover 1/16 HP per turn; other types lose 1/8 HP.', price: 150, sprite: `${ITEMS_PATH}/black-sludge.png` },

  // Choice items
  { id: 'choice-band', name: 'Choice Band', description: 'Boosts Attack by 50% but locks into one move.', price: 250, sprite: `${ITEMS_PATH}/choice-band.png` },
  { id: 'choice-specs', name: 'Choice Specs', description: 'Boosts Sp. Atk by 50% but locks into one move.', price: 250, sprite: `${ITEMS_PATH}/choice-specs.png` },
  { id: 'choice-scarf', name: 'Choice Scarf', description: 'Boosts Speed by 50% but locks into one move.', price: 250, sprite: `${ITEMS_PATH}/choice-scarf.png` },

  // Damage boosters
  { id: 'life-orb', name: 'Life Orb', description: 'Boosts move damage by 30% but costs 10% HP per attack.', price: 200, sprite: `${ITEMS_PATH}/life-orb.png` },
  { id: 'muscle-band', name: 'Muscle Band', description: 'Boosts physical move damage by 10%.', price: 120, sprite: `${ITEMS_PATH}/muscle-band.png` },
  { id: 'wise-glasses', name: 'Wise Glasses', description: 'Boosts special move damage by 10%.', price: 120, sprite: `${ITEMS_PATH}/wise-glasses.png` },
  { id: 'expert-belt', name: 'Expert Belt', description: 'Super-effective moves deal 20% more damage.', price: 150, sprite: `${ITEMS_PATH}/expert-belt.png` },
  { id: 'scope-lens', name: 'Scope Lens', description: 'Increases critical hit ratio.', price: 100, sprite: `${ITEMS_PATH}/scope-lens.png` },

  // Defensive
  { id: 'focus-sash', name: 'Focus Sash', description: 'Survives a one-hit KO at 1 HP when at full health. Consumed after use.', price: 200, sprite: `${ITEMS_PATH}/focus-sash.png` },
  { id: 'eviolite', name: 'Eviolite', description: 'Boosts Def and Sp. Def by 50% if holder can still evolve.', price: 200, sprite: `${ITEMS_PATH}/eviolite.png` },
  { id: 'rocky-helmet', name: 'Rocky Helmet', description: 'Deals 1/6 of attacker HP on contact moves.', price: 180, sprite: `${ITEMS_PATH}/rocky-helmet.png` },

  // Status orbs
  { id: 'flame-orb', name: 'Flame Orb', description: 'Burns the holder at end of turn. Useful with Guts ability.', price: 150, sprite: `${ITEMS_PATH}/flame-orb.png` },
  { id: 'toxic-orb', name: 'Toxic Orb', description: 'Badly poisons the holder at end of turn. Useful with Poison Heal.', price: 150, sprite: `${ITEMS_PATH}/toxic-orb.png` },

  // Status cure
  { id: 'lum-berry', name: 'Lum Berry', description: 'Cures any status condition once. Consumed after use.', price: 100, sprite: `${ITEMS_PATH}/lum-berry.png` },
];

export const HELD_ITEMS_BY_ID: Record<string, HeldItemDef> = {};
for (const item of HELD_ITEMS) {
  HELD_ITEMS_BY_ID[item.id] = item;
}

export function getHeldItemSprite(itemId: string): string {
  return HELD_ITEMS_BY_ID[itemId]?.sprite ?? '';
}

export function getHeldItemName(itemId: string): string {
  return HELD_ITEMS_BY_ID[itemId]?.name ?? itemId;
}

export function getHeldItemPrice(itemId: string): number {
  return HELD_ITEMS_BY_ID[itemId]?.price ?? 100;
}
