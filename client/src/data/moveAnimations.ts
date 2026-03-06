// Simplified move animation configs for our battle scene.
// Each move maps to an animation style + optional effect sprite.

export type AnimStyle =
  | 'projectile'   // Sprite flies from attacker to defender
  | 'contact'      // Attacker lunges toward defender
  | 'beam'         // Horizontal beam-like effect
  | 'aoe'          // Effect appears at defender position or screen-wide
  | 'self'         // Effect on the user (weather, buffs)
  | 'none';        // No special animation (just shake)

export interface MoveAnimConfig {
  style: AnimStyle;
  sprite?: string;       // FX sprite filename (served from /fx/)
  bgFlash?: string;      // Background flash color
  bgFlashDuration?: number;
  count?: number;        // Number of projectile/effect repetitions
  shakeIntensity?: number; // px shake amount on defender (default 4)
}

const MOVE_ANIMS: Record<string, MoveAnimConfig> = {
  // Fire
  'Ember':        { style: 'projectile', sprite: 'fireball.png', bgFlash: '#ff6600', bgFlashDuration: 300 },
  'Flamethrower': { style: 'beam', sprite: 'flareball.png', bgFlash: '#ff4400', bgFlashDuration: 400, count: 3 },
  'Air Slash':    { style: 'projectile', sprite: 'feather.png' },

  // Water
  'Water Gun':    { style: 'projectile', sprite: 'waterwisp.png' },
  'Hydro Pump':   { style: 'beam', sprite: 'waterwisp.png', bgFlash: '#1565c0', bgFlashDuration: 400, count: 3 },
  'Surf':         { style: 'aoe', sprite: 'waterwisp.png', bgFlash: '#1976d2', bgFlashDuration: 500, count: 3, shakeIntensity: 6 },
  'Absorb':       { style: 'projectile', sprite: 'energyball.png' },

  // Electric
  'Thunderbolt':  { style: 'aoe', sprite: 'lightning.png', bgFlash: '#000000', bgFlashDuration: 300, count: 3 },
  'Thunder':      { style: 'aoe', sprite: 'lightning.png', bgFlash: '#ffffff', bgFlashDuration: 400, count: 3, shakeIntensity: 8 },

  // Grass
  'Vine Whip':    { style: 'contact', sprite: 'leaf1.png' },
  'Razor Leaf':   { style: 'projectile', sprite: 'leaf2.png', count: 3 },
  'Giga Drain':   { style: 'beam', sprite: 'energyball.png', bgFlash: '#2e7d32' },
  'Solar Beam':   { style: 'beam', sprite: 'energyball.png', bgFlash: '#ffeb3b', bgFlashDuration: 500, count: 3 },

  // Ice
  'Ice Beam':     { style: 'beam', sprite: 'icicle.png', bgFlash: '#b3e5fc', bgFlashDuration: 300, count: 3 },

  // Psychic
  'Confusion':    { style: 'projectile', sprite: 'wisp.png' },
  'Psybeam':      { style: 'beam', sprite: 'mistball.png', bgFlash: '#e040fb', bgFlashDuration: 300, count: 2 },
  'Psychic':      { style: 'aoe', sprite: 'mistball.png', bgFlash: '#e040fb', bgFlashDuration: 500, shakeIntensity: 6 },
  'Hidden Power': { style: 'projectile', sprite: 'wisp.png' },

  // Ghost/Dark
  'Lick':         { style: 'contact' },
  'Night Shade':  { style: 'aoe', sprite: 'blackwisp.png', bgFlash: '#311b92', bgFlashDuration: 400 },
  'Shadow Ball':  { style: 'projectile', sprite: 'shadowball.png', bgFlash: '#1a1a2e', bgFlashDuration: 200 },
  'Crunch':       { style: 'contact', sprite: 'topbite.png', shakeIntensity: 6 },

  // Fighting
  'Karate Chop':  { style: 'contact', sprite: 'rightchop.png' },
  'Low Kick':     { style: 'contact', sprite: 'foot.png' },
  'Cross Chop':   { style: 'contact', sprite: 'leftchop.png', shakeIntensity: 6 },
  'Dynamic Punch':{ style: 'contact', sprite: 'fist.png', bgFlash: '#ff6600', bgFlashDuration: 200, shakeIntensity: 8 },

  // Poison
  'Poison Sting': { style: 'projectile', sprite: 'poisonwisp.png' },
  'Sludge Bomb':  { style: 'projectile', sprite: 'poisonwisp.png', count: 3, shakeIntensity: 6 },

  // Bug
  'Bug Bite':     { style: 'contact', sprite: 'topbite.png' },
  'Silver Wind':  { style: 'projectile', sprite: 'wisp.png', count: 3 },
  'Pin Missile':  { style: 'projectile', sprite: 'rock1.png', count: 4 },

  // Flying
  'Gust':         { style: 'projectile', sprite: 'feather.png' },
  'Peck':         { style: 'contact' },
  'Wing Attack':  { style: 'contact', sprite: 'feather.png' },
  'Aerial Ace':   { style: 'contact', sprite: 'leftslash.png', shakeIntensity: 6 },
  'Drill Peck':   { style: 'contact', shakeIntensity: 6 },
  'Air Cutter':   { style: 'projectile', sprite: 'feather.png', count: 2 },

  // Normal
  'Tackle':       { style: 'contact' },
  'Scratch':      { style: 'contact', sprite: 'rightclaw.png' },
  'Quick Attack': { style: 'contact', shakeIntensity: 3 },
  'Hyper Fang':   { style: 'contact', sprite: 'topbite.png', shakeIntensity: 6 },
  'Body Slam':    { style: 'contact', bgFlash: '#ffffff', bgFlashDuration: 150, shakeIntensity: 8 },
  'Slam':         { style: 'contact', shakeIntensity: 6 },
  'Headbutt':     { style: 'contact', sprite: 'impact.png' },
  'Take Down':    { style: 'contact', sprite: 'impact.png', shakeIntensity: 6 },
  'Struggle':     { style: 'contact' },

  // Rock/Ground
  'Rock Throw':   { style: 'projectile', sprite: 'rock1.png' },
  'Rock Slide':   { style: 'aoe', sprite: 'rock1.png', count: 3, shakeIntensity: 6 },
  'Dig':          { style: 'contact', bgFlash: '#795548', bgFlashDuration: 200, shakeIntensity: 8 },
  'Earthquake':   { style: 'aoe', bgFlash: '#795548', bgFlashDuration: 600, shakeIntensity: 10, count: 2 },

  // Dragon
  'Twister':      { style: 'aoe', sprite: 'wisp.png', bgFlash: '#7c4dff', bgFlashDuration: 300, count: 3 },
  'Dragon Claw':  { style: 'contact', sprite: 'leftclaw.png', shakeIntensity: 6 },

  // Steel
  'Meteor Mash':  { style: 'contact', sprite: 'fist.png', bgFlash: '#b0bec5', bgFlashDuration: 300, shakeIntensity: 8 },
  'Zen Headbutt': { style: 'contact', sprite: 'mistball.png', bgFlash: '#e040fb', bgFlashDuration: 200, shakeIntensity: 6 },

  // Weather (self-targeting)
  'Rain Dance':   { style: 'self', bgFlash: '#1565c0', bgFlashDuration: 600 },
  'Sunny Day':    { style: 'self', bgFlash: '#ff8f00', bgFlashDuration: 600 },
};

const DEFAULT_ANIM: MoveAnimConfig = { style: 'contact' };

export function getMoveAnim(moveName: string): MoveAnimConfig {
  return MOVE_ANIMS[moveName] || DEFAULT_ANIM;
}
