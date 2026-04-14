// Battle sound effects using the Web Audio API.
// Generates short synthesized SFX for moves + loads Pokémon cries from Showdown CDN.
// Hit sounds use MP3 files keyed by effectiveness.

import { BASE_PATH } from '../config';

const SHOWDOWN_CDN = 'https://play.pokemonshowdown.com';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// --- Synthesized move SFX ---

type SfxType =
  | 'hit' | 'hit-hard' | 'hit-weak'
  | 'electric' | 'fire' | 'water' | 'ice' | 'grass'
  | 'psychic' | 'ghost' | 'poison' | 'ground'
  | 'rock' | 'fighting' | 'flying' | 'dragon' | 'steel'
  | 'normal' | 'bug'
  | 'weather' | 'faint' | 'miss';

function playTone(
  ac: AudioContext, freq: number, duration: number, type: OscillatorType = 'sine',
  volume = 0.3, detune = 0,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

function playNoise(ac: AudioContext, duration: number, volume = 0.15) {
  const bufferSize = ac.sampleRate * duration;
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ac.createBufferSource();
  source.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  source.connect(gain);
  gain.connect(ac.destination);
  source.start();
}

const SFX_PLAYERS: Record<SfxType, (ac: AudioContext) => void> = {
  'hit': (ac) => {
    playNoise(ac, 0.1, 0.2);
    playTone(ac, 200, 0.1, 'square', 0.15);
  },
  'hit-hard': (ac) => {
    playNoise(ac, 0.15, 0.3);
    playTone(ac, 120, 0.15, 'square', 0.2);
    playTone(ac, 80, 0.2, 'sawtooth', 0.1);
  },
  'hit-weak': (ac) => {
    playNoise(ac, 0.08, 0.1);
    playTone(ac, 300, 0.08, 'sine', 0.1);
  },
  'electric': (ac) => {
    playTone(ac, 800, 0.08, 'sawtooth', 0.2);
    setTimeout(() => playTone(ac, 1200, 0.06, 'sawtooth', 0.15), 50);
    setTimeout(() => playTone(ac, 600, 0.1, 'square', 0.2), 100);
    playNoise(ac, 0.15, 0.15);
  },
  'fire': (ac) => {
    playNoise(ac, 0.3, 0.2);
    playTone(ac, 300, 0.2, 'sawtooth', 0.15);
    playTone(ac, 200, 0.3, 'triangle', 0.1);
  },
  'water': (ac) => {
    playNoise(ac, 0.2, 0.12);
    playTone(ac, 400, 0.15, 'sine', 0.15);
    playTone(ac, 350, 0.2, 'sine', 0.1, 50);
  },
  'ice': (ac) => {
    playTone(ac, 1000, 0.12, 'sine', 0.2);
    playTone(ac, 1500, 0.08, 'sine', 0.1);
    playNoise(ac, 0.1, 0.1);
  },
  'grass': (ac) => {
    playTone(ac, 500, 0.15, 'sine', 0.15);
    playTone(ac, 600, 0.1, 'triangle', 0.1);
    playNoise(ac, 0.08, 0.08);
  },
  'psychic': (ac) => {
    playTone(ac, 600, 0.3, 'sine', 0.2);
    playTone(ac, 900, 0.2, 'sine', 0.1, 100);
  },
  'ghost': (ac) => {
    playTone(ac, 200, 0.4, 'sine', 0.15);
    playTone(ac, 150, 0.5, 'sine', 0.1, -50);
  },
  'poison': (ac) => {
    playTone(ac, 250, 0.2, 'sawtooth', 0.12);
    playNoise(ac, 0.15, 0.1);
  },
  'ground': (ac) => {
    playTone(ac, 60, 0.3, 'square', 0.25);
    playTone(ac, 40, 0.4, 'sawtooth', 0.15);
    playNoise(ac, 0.2, 0.2);
  },
  'rock': (ac) => {
    playNoise(ac, 0.15, 0.25);
    playTone(ac, 100, 0.15, 'square', 0.2);
  },
  'fighting': (ac) => {
    playNoise(ac, 0.1, 0.25);
    playTone(ac, 150, 0.1, 'square', 0.2);
  },
  'flying': (ac) => {
    playNoise(ac, 0.2, 0.1);
    playTone(ac, 500, 0.15, 'triangle', 0.12);
  },
  'dragon': (ac) => {
    playTone(ac, 150, 0.3, 'sawtooth', 0.2);
    playTone(ac, 200, 0.25, 'square', 0.15, 50);
  },
  'steel': (ac) => {
    playTone(ac, 1200, 0.1, 'square', 0.2);
    playTone(ac, 800, 0.08, 'sawtooth', 0.15);
    playNoise(ac, 0.05, 0.15);
  },
  'normal': (ac) => {
    playNoise(ac, 0.1, 0.15);
    playTone(ac, 250, 0.1, 'square', 0.12);
  },
  'bug': (ac) => {
    playTone(ac, 700, 0.08, 'square', 0.1);
    playTone(ac, 800, 0.06, 'square', 0.08);
    playNoise(ac, 0.08, 0.08);
  },
  'weather': (ac) => {
    playNoise(ac, 0.4, 0.08);
    playTone(ac, 300, 0.3, 'sine', 0.05);
  },
  'faint': (ac) => {
    playTone(ac, 400, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(ac, 300, 0.15, 'sine', 0.15), 100);
    setTimeout(() => playTone(ac, 200, 0.2, 'sine', 0.1), 200);
  },
  'miss': (ac) => {
    playNoise(ac, 0.15, 0.08);
  },
};

export function playSfx(type: SfxType) {
  try {
    const ac = getCtx();
    SFX_PLAYERS[type]?.(ac);
  } catch {
    // Audio not available
  }
}

// --- Move name → SFX type mapping ---

const MOVE_SFX: Record<string, SfxType> = {
  // Fire
  'Ember': 'fire', 'Flamethrower': 'fire',
  // Water
  'Water Gun': 'water', 'Hydro Pump': 'water', 'Surf': 'water', 'Absorb': 'grass',
  // Electric
  'Thunderbolt': 'electric', 'Thunder': 'electric',
  // Grass
  'Vine Whip': 'grass', 'Razor Leaf': 'grass', 'Giga Drain': 'grass', 'Solar Beam': 'grass',
  // Ice
  'Ice Beam': 'ice',
  // Psychic
  'Confusion': 'psychic', 'Psybeam': 'psychic', 'Psychic': 'psychic', 'Hidden Power': 'psychic',
  // Ghost/Dark
  'Lick': 'ghost', 'Night Shade': 'ghost', 'Shadow Ball': 'ghost', 'Crunch': 'ghost',
  // Fighting
  'Karate Chop': 'fighting', 'Low Kick': 'fighting', 'Cross Chop': 'fighting', 'Dynamic Punch': 'fighting',
  // Poison
  'Poison Sting': 'poison', 'Sludge Bomb': 'poison',
  // Bug
  'Bug Bite': 'bug', 'Silver Wind': 'bug', 'Pin Missile': 'bug',
  // Flying
  'Gust': 'flying', 'Peck': 'flying', 'Wing Attack': 'flying',
  'Aerial Ace': 'flying', 'Drill Peck': 'flying', 'Air Cutter': 'flying', 'Air Slash': 'flying',
  // Normal
  'Tackle': 'normal', 'Scratch': 'normal', 'Quick Attack': 'normal',
  'Hyper Fang': 'normal', 'Body Slam': 'hit-hard', 'Slam': 'hit-hard',
  'Headbutt': 'hit', 'Take Down': 'hit-hard', 'Struggle': 'hit-weak',
  // Rock/Ground
  'Rock Throw': 'rock', 'Rock Slide': 'rock', 'Dig': 'ground', 'Earthquake': 'ground',
  // Dragon
  'Twister': 'dragon', 'Dragon Claw': 'dragon',
  // Steel
  'Meteor Mash': 'steel', 'Zen Headbutt': 'psychic',
  // Weather
  'Rain Dance': 'weather', 'Sunny Day': 'weather', 'Sandstorm': 'weather', 'Hail': 'weather',
  // Hazards
  'Stealth Rock': 'rock', 'Spikes': 'ground', 'Toxic Spikes': 'poison',
  'Rapid Spin': 'normal', 'Defog': 'flying',
};

export function getMoveSfxType(moveName: string): SfxType {
  return MOVE_SFX[moveName] || 'hit';
}

// --- Move sound effects (MP3 files) ---

const moveSfxCache: Record<string, HTMLAudioElement | null> = {};

export function playMoveSfx(moveName: string, volume = 0.35) {
  try {
    const fileName = moveName.replace(/-/g, ' ');
    const url = `${BASE_PATH}/sfx/${encodeURIComponent(fileName)}.mp3`;

    if (moveSfxCache[moveName] === null) {
      // Previously failed to load — fall back to synth
      const sfxType = getMoveSfxType(moveName);
      playSfx(sfxType);
      return;
    }

    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(() => {
      // MP3 not available — mark and fall back
      moveSfxCache[moveName] = null;
      const sfxType = getMoveSfxType(moveName);
      playSfx(sfxType);
    });
    moveSfxCache[moveName] = audio;
  } catch {
    const sfxType = getMoveSfxType(moveName);
    playSfx(sfxType);
  }
}

// --- Battle BGM ---

interface BgmTrack {
  url: string;
  loopStart: number;
  loopEnd: number;
}

const BATTLE_BGMS: BgmTrack[] = [
  { url: 'audio/dpp-trainer.mp3', loopStart: 13.440, loopEnd: 96.959 },
  { url: 'audio/dpp-rival.mp3', loopStart: 13.888, loopEnd: 66.352 },
  { url: 'audio/hgss-johto-trainer.mp3', loopStart: 23.731, loopEnd: 125.086 },
  { url: 'audio/hgss-kanto-trainer.mp3', loopStart: 13.003, loopEnd: 94.656 },
  { url: 'audio/bw-trainer.mp3', loopStart: 14.629, loopEnd: 110.109 },
  { url: 'audio/bw-rival.mp3', loopStart: 19.180, loopEnd: 57.373 },
  { url: 'audio/bw-subway-trainer.mp3', loopStart: 15.503, loopEnd: 110.984 },
  { url: 'audio/bw2-rival.mp3', loopStart: 7.152, loopEnd: 68.708 },
  { url: 'audio/xy-trainer.mp3', loopStart: 7.802, loopEnd: 82.469 },
  { url: 'audio/xy-rival.mp3', loopStart: 7.802, loopEnd: 58.634 },
  { url: 'audio/oras-trainer.mp3', loopStart: 13.579, loopEnd: 91.548 },
  { url: 'audio/oras-rival.mp3', loopStart: 14.303, loopEnd: 69.149 },
  { url: 'audio/sm-trainer.mp3', loopStart: 8.323, loopEnd: 89.230 },
  { url: 'audio/sm-rival.mp3', loopStart: 11.389, loopEnd: 62.158 },
];

// Named tracks for specific trainer types
const BGM_KANTO_TRAINER: BgmTrack = { url: 'audio/hgss-kanto-trainer.mp3', loopStart: 13.003, loopEnd: 94.656 };
const BGM_KANTO_GYM: BgmTrack = { url: 'audio/bw2-kanto-gym-leader.mp3', loopStart: 14.626, loopEnd: 58.986 };
const BGM_JOHTO_TRAINER: BgmTrack = { url: 'audio/hgss-johto-trainer.mp3', loopStart: 23.731, loopEnd: 125.086 };
const BGM_ELITE4: BgmTrack = { url: 'audio/spl-elite4.mp3', loopStart: 3.962, loopEnd: 152.509 };
const BGM_CHAMPION_DPP: BgmTrack = { url: 'audio/dpp-trainer.mp3', loopStart: 13.440, loopEnd: 96.959 };
const BGM_RIVAL_DPP: BgmTrack = { url: 'audio/dpp-rival.mp3', loopStart: 13.888, loopEnd: 66.352 };
const BGM_HOENN_TRAINER: BgmTrack = { url: 'audio/oras-trainer.mp3', loopStart: 13.579, loopEnd: 91.548 };
const BGM_HOENN_RIVAL: BgmTrack = { url: 'audio/oras-rival.mp3', loopStart: 14.303, loopEnd: 69.149 };
const BGM_SINNOH_TRAINER: BgmTrack = { url: 'audio/dpp-trainer.mp3', loopStart: 13.440, loopEnd: 96.959 };
const BGM_RED: BgmTrack = { url: 'audio/bw2-kanto-gym-leader.mp3', loopStart: 14.626, loopEnd: 58.986 };

// Trainer ID → specific BGM
const TRAINER_BGM: Record<string, BgmTrack> = {
  // Kanto Gym Leaders
  brock: BGM_KANTO_GYM, misty: BGM_KANTO_GYM, ltsurge: BGM_KANTO_GYM,
  erika: BGM_KANTO_GYM, koga: BGM_KANTO_GYM, janine: BGM_KANTO_GYM,
  sabrina: BGM_KANTO_GYM, blaine: BGM_KANTO_GYM, giovanni: BGM_KANTO_GYM,
  // Kanto E4 / Champions
  bruno: BGM_ELITE4,
  lance: BGM_ELITE4, blue: BGM_ELITE4, red: BGM_RED,
  // Johto Gym Leaders
  falkner: BGM_JOHTO_TRAINER, bugsy: BGM_JOHTO_TRAINER, whitney: BGM_JOHTO_TRAINER,
  morty: BGM_JOHTO_TRAINER, chuck: BGM_JOHTO_TRAINER, jasmine: BGM_JOHTO_TRAINER,
  pryce: BGM_JOHTO_TRAINER, clair: BGM_JOHTO_TRAINER,
  // Johto E4 / Rival
  will: BGM_ELITE4, karen: BGM_ELITE4, silver: BGM_RIVAL_DPP,
  // Hoenn Gym Leaders
  roxanne: BGM_HOENN_TRAINER, brawly: BGM_HOENN_TRAINER, wattson: BGM_HOENN_TRAINER,
  flannery: BGM_HOENN_TRAINER, norman: BGM_HOENN_TRAINER, winona: BGM_HOENN_TRAINER,
  // Hoenn E4 / Champions
  sidney: BGM_ELITE4, phoebe: BGM_ELITE4, glacia: BGM_ELITE4, drake: BGM_ELITE4,
  steven: BGM_ELITE4, wallace: BGM_ELITE4,
  // Sinnoh Gym Leaders
  fantina: BGM_SINNOH_TRAINER, maylene: BGM_SINNOH_TRAINER, crasherwake: BGM_SINNOH_TRAINER,
  byron: BGM_SINNOH_TRAINER, candice: BGM_SINNOH_TRAINER, volkner: BGM_SINNOH_TRAINER,
  // Sinnoh E4 / Champions / Rival
  aaron: BGM_ELITE4, bertha: BGM_ELITE4, flint: BGM_ELITE4, lucian: BGM_ELITE4,
  cynthia: BGM_CHAMPION_DPP, barry: BGM_RIVAL_DPP,
};

let currentBgm: HTMLAudioElement | null = null;
let bgmLoopHandler: (() => void) | null = null;

export function startBattleBgm(volume = 0.25, trainerId?: string) {
  stopBattleBgm();
  try {
    const track = trainerId && TRAINER_BGM[trainerId]
      ? TRAINER_BGM[trainerId]
      : BATTLE_BGMS[Math.floor(Math.random() * BATTLE_BGMS.length)];
    const audio = new Audio(`${SHOWDOWN_CDN}/${track.url}`);
    audio.volume = volume;

    bgmLoopHandler = () => {
      if (audio.currentTime >= track.loopEnd) {
        audio.currentTime = track.loopStart;
      }
    };
    audio.addEventListener('timeupdate', bgmLoopHandler);
    audio.play().catch(() => {});
    currentBgm = audio;
  } catch {
    // Audio not available
  }
}

export function stopBattleBgm() {
  if (currentBgm) {
    if (bgmLoopHandler) {
      currentBgm.removeEventListener('timeupdate', bgmLoopHandler);
      bgmLoopHandler = null;
    }
    currentBgm.pause();
    currentBgm = null;
  }
}

export function toggleBgmMute(): boolean {
  if (currentBgm) {
    currentBgm.muted = !currentBgm.muted;
    return currentBgm.muted;
  }
  return false;
}

export function isBgmMuted(): boolean {
  return currentBgm?.muted ?? false;
}

// --- Hit sounds (MP3, keyed by effectiveness) ---

const HIT_SOUNDS: Record<string, string> = {
  'super': `${BASE_PATH}/hit-super-effective.mp3`,
  'not-very': `${BASE_PATH}/hit-not-very-effective.mp3`,
  'neutral': `${BASE_PATH}/hit-normal-damage.mp3`,
};

export function playHitSound(effectiveness: 'super' | 'neutral' | 'not-very' | 'immune' | null, volume = 0.4) {
  if (!effectiveness || effectiveness === 'immune') return;
  const url = HIT_SOUNDS[effectiveness] ?? HIT_SOUNDS['neutral'];
  try {
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {
    // Audio not available
  }
}

/** Preload hit sounds into browser cache */
export function preloadHitSounds() {
  for (const url of Object.values(HIT_SOUNDS)) {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.load();
  }
}

// --- Pokémon cries ---

const cryCache: Record<string, HTMLAudioElement> = {};

export function playCry(pokemonName: string, volume = 0.3, playbackRate = 1.0) {
  try {
    const id = pokemonName.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const url = `${SHOWDOWN_CDN}/audio/cries/${id}.mp3`;

    // Always create a fresh Audio for overlapping cries and rate changes
    const audio = new Audio(url);
    audio.volume = volume;
    audio.playbackRate = playbackRate;
    audio.play().catch(() => {});
  } catch {
    // Audio not available
  }
}

/** Preload cries into browser cache so they play instantly */
export function preloadCries(pokemonNames: string[]) {
  for (const name of pokemonNames) {
    const id = name.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const url = `${SHOWDOWN_CDN}/audio/cries/${id}.mp3`;
    // Fetch into browser cache without playing
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.load();
  }
}
