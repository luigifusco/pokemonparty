// Showdown Battle Simulator wrapper
// Runs a Pokemon Showdown battle and returns a BattleSnapshot
//
// Uses the BattleStream API from pokemon-showdown to run a full battle
// with proper abilities, items, crits, priority, etc.

import { Teams, Dex } from '../../pokemon-showdown/dist/sim/index.js';
import type { BattleSnapshot, BattlePokemonState, BattleLogEntry } from '../../shared/battle-types.js';
import type { Pokemon } from '../../shared/types.js';

const GEN5_DEX = Dex.forGen(5);

interface BattleTeamEntry {
  pokemon: Pokemon;
  heldItem?: string | null;
  moves: [string, string];
  ivs?: { hp: number; attack: number; defense: number; spAtk: number; spDef: number; speed: number };
  nature?: string;
}

// Map our held item IDs to Showdown item names
const ITEM_ID_TO_SHOWDOWN: Record<string, string> = {
  'leftovers': 'Leftovers',
  'sitrus-berry': 'Sitrus Berry',
  'lum-berry': 'Lum Berry',
  'choice-band': 'Choice Band',
  'choice-specs': 'Choice Specs',
  'choice-scarf': 'Choice Scarf',
  'life-orb': 'Life Orb',
  'focus-sash': 'Focus Sash',
  'assault-vest': 'Assault Vest',
  'rocky-helmet': 'Rocky Helmet',
  'eviolite': 'Eviolite',
  'black-sludge': 'Black Sludge',
  'air-balloon': 'Air Balloon',
  'weakness-policy': 'Weakness Policy',
  'expert-belt': 'Expert Belt',
  'shell-bell': 'Shell Bell',
  'wide-lens': 'Wide Lens',
  'scope-lens': 'Scope Lens',
  'red-card': 'Red Card',
  'eject-button': 'Eject Button',
};

function getShowdownAbility(speciesName: string): string {
  const species = GEN5_DEX.species.get(speciesName);
  if (!species || !species.abilities) return 'No Ability';
  return species.abilities[0] || 'No Ability';
}

function buildShowdownTeam(entries: BattleTeamEntry[]): string {
  const sets = entries.map((e) => {
    const species = e.pokemon.name;
    const ability = getShowdownAbility(species);
    const item = e.heldItem ? (ITEM_ID_TO_SHOWDOWN[e.heldItem] || '') : '';
    const ivs = e.ivs || { hp: 15, attack: 15, defense: 15, spAtk: 15, spDef: 15, speed: 15 };

    return {
      species,
      ability,
      item,
      moves: [...e.moves],
      nature: e.nature || 'Serious',
      level: 50,
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs: { hp: ivs.hp, atk: ivs.attack, def: ivs.defense, spa: ivs.spAtk, spd: ivs.spDef, spe: ivs.speed },
    };
  });
  return Teams.pack(sets);
}

// Parse "HP/MaxHP" or "HP/MaxHP status" from PS protocol
function parseHPString(hpStr: string): { hp: number; maxHp: number; status: string | null } {
  const parts = hpStr.trim().split(' ');
  const hpPart = parts[0];
  const statusPart = parts.length > 1 ? parts[1] : null;

  if (hpPart === '0' || hpPart === '0 fnt' || hpStr.includes('fnt')) {
    return { hp: 0, maxHp: 0, status: null };
  }

  const [cur, max] = hpPart.split('/').map(Number);
  return { hp: cur, maxHp: max || cur, status: statusPart };
}

// Parse "p1a: Victini" → { side: 'left', slot: 'a', name: 'Victini' }
function parsePokemonIdent(ident: string): { side: 'left' | 'right'; playerKey: string; name: string } {
  const match = ident.match(/^(p[12])([a-c]): (.+)$/);
  if (!match) return { side: 'left', playerKey: 'p1', name: ident };
  return {
    side: match[1] === 'p1' ? 'left' : 'right',
    playerKey: match[1],
    name: match[3],
  };
}

function effectivenessLabel(e: number): 'super' | 'neutral' | 'not-very' | 'immune' {
  if (e === 0) return 'immune';
  if (e > 1) return 'super';
  if (e < 1) return 'not-very';
  return 'neutral';
}

const STATUS_MAP: Record<string, string> = {
  'brn': 'burn',
  'par': 'paralysis',
  'psn': 'poison',
  'tox': 'toxic',
  'slp': 'sleep',
  'frz': 'freeze',
};

export function runShowdownBattle(
  leftEntries: BattleTeamEntry[],
  rightEntries: BattleTeamEntry[],
  fieldSize: number = 1,
): BattleSnapshot {
  const leftTeam = buildShowdownTeam(leftEntries);
  const rightTeam = buildShowdownTeam(rightEntries);

  const { Battle } = require('../../pokemon-showdown/dist/sim/index.js');

  const format = fieldSize > 1 ? 'gen5doublescustomgame' : 'gen5customgame';
  const battle = new Battle({
    formatid: format,
    p1: { name: 'Left', team: leftTeam },
    p2: { name: 'Right', team: rightTeam },
  });

  // Handle team preview
  battle.makeChoices('default', 'default');

  // Run battle: auto-choose random moves each turn
  let turns = 0;
  while (!battle.ended && turns < 50) {
    const p1choice = buildChoice(battle.sides[0]);
    const p2choice = buildChoice(battle.sides[1]);

    try {
      battle.makeChoices(p1choice, p2choice);
    } catch {
      break;
    }
    turns++;
  }

  // Deduplicate log lines (PS sometimes emits duplicates via send callbacks)
  const seen = new Set<string>();
  const uniqueLog: string[] = [];
  for (const line of battle.log) {
    if (!seen.has(line)) {
      seen.add(line);
      uniqueLog.push(line);
    }
  }

  return parseProtocol(uniqueLog, leftEntries, rightEntries, fieldSize, battle);
}

function buildChoice(side: any): string {
  const req = side.activeRequest;
  if (!req) return 'default';

  if (req.forceSwitch) {
    const switches = req.forceSwitch as boolean[];
    const choices: string[] = [];
    const chosen = new Set<number>();

    for (let i = 0; i < switches.length; i++) {
      if (!switches[i]) { choices.push('pass'); continue; }
      let found = false;
      for (let j = 0; j < side.pokemon.length; j++) {
        if (!side.pokemon[j].fainted && !side.pokemon[j].isActive && !chosen.has(j)) {
          choices.push(`switch ${j + 1}`);
          chosen.add(j);
          found = true;
          break;
        }
      }
      if (!found) choices.push('pass');
    }
    return choices.join(', ');
  }

  if (req.active) {
    const choices: string[] = [];
    for (const active of req.active) {
      if (!active) { choices.push('pass'); continue; }
      const moves = active.moves.filter((m: any) => !m.disabled && m.pp > 0);
      if (moves.length > 0) {
        const pick = moves[Math.floor(Math.random() * moves.length)];
        const moveIdx = active.moves.indexOf(pick) + 1;
        choices.push(`move ${moveIdx}`);
      } else {
        choices.push('move 1');
      }
    }
    return choices.join(', ');
  }

  return 'default';
}

function parseProtocol(
  lines: string[],
  leftEntries: BattleTeamEntry[],
  rightEntries: BattleTeamEntry[],
  fieldSize: number,
  battle?: any,
): BattleSnapshot {
  // Track pokemon state by ident (e.g. "p1a: Victini")
  const pokemonState: Record<string, { hp: number; maxHp: number; side: 'left' | 'right'; name: string; species: string }> = {};
  // Map player slot to our instance IDs
  const identToInstanceId: Record<string, string> = {};
  const instanceIdToSprite: Record<string, string> = {};
  const instanceIdToTypes: Record<string, string[]> = {};

  // Pre-build instance data from entries
  for (let i = 0; i < leftEntries.length; i++) {
    const p = leftEntries[i].pokemon;
    instanceIdToSprite[`l${i}`] = p.sprite;
    instanceIdToTypes[`l${i}`] = [...p.types];
  }
  for (let i = 0; i < rightEntries.length; i++) {
    const p = rightEntries[i].pokemon;
    instanceIdToSprite[`r${i}`] = p.sprite;
    instanceIdToTypes[`r${i}`] = [...p.types];
  }

  // Track which names map to which instance IDs
  const leftNameToIdx: Record<string, number> = {};
  for (let i = 0; i < leftEntries.length; i++) leftNameToIdx[leftEntries[i].pokemon.name] = i;
  const rightNameToIdx: Record<string, number> = {};
  for (let i = 0; i < rightEntries.length; i++) rightNameToIdx[rightEntries[i].pokemon.name] = i;

  function getInstanceId(ident: string): string {
    if (identToInstanceId[ident]) return identToInstanceId[ident];
    const parsed = parsePokemonIdent(ident);
    const nameMap = parsed.side === 'left' ? leftNameToIdx : rightNameToIdx;
    const idx = nameMap[parsed.name] ?? 0;
    const id = `${parsed.side === 'left' ? 'l' : 'r'}${idx}`;
    identToInstanceId[ident] = id;
    return id;
  }

  const log: BattleLogEntry[] = [];
  let currentRound = 0;
  let winner: 'left' | 'right' | null = null;

  // Track current effectiveness for the move being processed
  let pendingMove: {
    round: number;
    attackerIdent: string;
    attackerName: string;
    moveName: string;
    targetIdent: string;
    targetName: string;
  } | null = null;
  let pendingDamage = 0;
  let pendingEffectiveness: 'super' | 'neutral' | 'not-very' | 'immune' = 'neutral';
  let pendingFainted = false;
  let pendingCrit = false;
  let pendingMessage = '';
  let pendingStatusChange: { instanceId: string; status: string } | undefined;

  function flushPendingMove() {
    if (!pendingMove) return;
    const m = pendingMove;
    const attackerInstId = getInstanceId(m.attackerIdent);
    const targetInstId = getInstanceId(m.targetIdent);

    let message = `${m.attackerName} used ${m.moveName} on ${m.targetName}!`;
    if (pendingCrit) message += ' Critical hit!';
    if (pendingDamage === 0 && pendingEffectiveness === 'immune') {
      message += ' It had no effect...';
    } else {
      if (pendingEffectiveness === 'super') message += " It's super effective!";
      else if (pendingEffectiveness === 'not-very') message += " It's not very effective...";
      if (pendingDamage > 0) message += ` (${pendingDamage} dmg)`;
    }
    if (pendingFainted) message += ` ${m.targetName} fainted!`;

    log.push({
      round: m.round,
      attackerInstanceId: attackerInstId,
      attackerName: m.attackerName,
      moveName: m.moveName,
      targetInstanceId: targetInstId,
      targetName: m.targetName,
      damage: pendingDamage,
      effectiveness: pendingEffectiveness,
      targetFainted: pendingFainted,
      message,
      ...(pendingStatusChange ? { statusChange: pendingStatusChange } : {}),
    });

    pendingMove = null;
    pendingDamage = 0;
    pendingEffectiveness = 'neutral';
    pendingFainted = false;
    pendingCrit = false;
    pendingStatusChange = undefined;
  }

  for (const line of lines) {
    if (!line.startsWith('|') || line === '|') continue;
    const parts = line.split('|');
    // parts[0] is empty (before first |), parts[1] is the command
    const cmd = parts[1];

    switch (cmd) {
      case 'turn': {
        flushPendingMove();
        currentRound = parseInt(parts[2]);
        break;
      }

      case 'switch':
      case 'drag': {
        flushPendingMove();
        const ident = parts[2]; // "p1a: Victini"
        const detailParts = parts[3].split(', ');
        const hpStr = parts[4] || '100/100';
        const { hp, maxHp } = parseHPString(hpStr);
        const parsed = parsePokemonIdent(ident);
        const instId = getInstanceId(ident);

        pokemonState[ident] = { hp, maxHp, side: parsed.side, name: parsed.name, species: detailParts[0] };

        // Log replacement if this is mid-battle (after turn 0)
        if (currentRound > 0) {
          log.push({
            round: currentRound,
            attackerInstanceId: '', attackerName: '',
            moveName: '', targetInstanceId: '', targetName: '',
            damage: 0, effectiveness: null, targetFainted: false,
            message: `${parsed.name} was sent in!`,
            replacement: {
              instanceId: instId,
              name: parsed.name,
              sprite: instanceIdToSprite[instId] || '',
              side: parsed.side,
            },
          });
        }
        break;
      }

      case 'move': {
        flushPendingMove();
        const attackerIdent = parts[2];
        const moveName = parts[3];
        const targetIdent = parts[4] || attackerIdent;
        const attackerParsed = parsePokemonIdent(attackerIdent);
        const targetParsed = parsePokemonIdent(targetIdent);

        pendingMove = {
          round: currentRound,
          attackerIdent,
          attackerName: attackerParsed.name,
          moveName,
          targetIdent,
          targetName: targetParsed.name,
        };
        break;
      }

      case '-damage': {
        if (!pendingMove) break;
        const targetIdent = parts[2];
        const hpStr = parts[3];
        const { hp, maxHp } = parseHPString(hpStr);
        const prev = pokemonState[targetIdent];
        if (prev) {
          pendingDamage = Math.max(0, prev.hp - hp);
          prev.hp = hp;
          if (maxHp > 0) prev.maxHp = maxHp;
        }
        break;
      }

      case '-heal': {
        const healIdent = parts[2];
        const hpStr = parts[3];
        const { hp, maxHp } = parseHPString(hpStr);
        const prev = pokemonState[healIdent];
        const healAmount = prev ? hp - prev.hp : 0;
        if (prev) {
          prev.hp = hp;
          if (maxHp > 0) prev.maxHp = maxHp;
        }
        const parsed = parsePokemonIdent(healIdent);
        const source = parts[4] || '';
        if (healAmount > 0) {
          log.push({
            round: currentRound,
            attackerInstanceId: getInstanceId(healIdent),
            attackerName: parsed.name,
            moveName: '', targetInstanceId: getInstanceId(healIdent), targetName: parsed.name,
            damage: 0, effectiveness: null, targetFainted: false,
            message: `${parsed.name} restored ${healAmount} HP!${source ? ' (' + source.replace('[from] item: ', '') + ')' : ''}`,
          });
        }
        break;
      }

      case '-supereffective':
        pendingEffectiveness = 'super';
        break;

      case '-resisted':
        pendingEffectiveness = 'not-very';
        break;

      case '-immune': {
        pendingEffectiveness = 'immune';
        pendingDamage = 0;
        break;
      }

      case '-crit':
        pendingCrit = true;
        break;

      case '-miss':
      case '-notarget': {
        flushPendingMove(); // the move message is already pending
        if (pendingMove) break;
        // If we already flushed, create a miss message from previous context
        const missIdent = parts[2];
        const missParsed = parsePokemonIdent(missIdent);
        // Already handled by flushPendingMove with damage=0
        break;
      }

      case 'faint': {
        const faintIdent = parts[2];
        const faintParsed = parsePokemonIdent(faintIdent);
        if (pokemonState[faintIdent]) {
          pokemonState[faintIdent].hp = 0;
        }
        // Mark the pending move's target as fainted if it matches
        if (pendingMove && pendingMove.targetIdent === faintIdent) {
          pendingFainted = true;
        } else {
          // Faint from status damage or other cause
          flushPendingMove();
          log.push({
            round: currentRound,
            attackerInstanceId: getInstanceId(faintIdent),
            attackerName: faintParsed.name,
            moveName: '', targetInstanceId: getInstanceId(faintIdent), targetName: faintParsed.name,
            damage: 0, effectiveness: null, targetFainted: true,
            message: `${faintParsed.name} fainted!`,
          });
        }
        break;
      }

      case '-status': {
        const statusIdent = parts[2];
        const statusCode = parts[3]; // brn, par, psn, tox, slp, frz
        const statusName = STATUS_MAP[statusCode] || statusCode;
        const statusParsed = parsePokemonIdent(statusIdent);
        const statusInstId = getInstanceId(statusIdent);

        const STATUS_NAMES: Record<string, string> = {
          burn: 'burned', paralysis: 'paralyzed', poison: 'poisoned',
          toxic: 'badly poisoned', freeze: 'frozen', sleep: 'fell asleep',
        };

        if (pendingMove) {
          // Secondary effect from a move
          pendingStatusChange = { instanceId: statusInstId, status: statusName };
        } else {
          log.push({
            round: currentRound,
            attackerInstanceId: '', attackerName: '',
            moveName: '', targetInstanceId: statusInstId, targetName: statusParsed.name,
            damage: 0, effectiveness: null, targetFainted: false,
            message: `${statusParsed.name} ${STATUS_NAMES[statusName] || 'was afflicted'}!`,
            statusChange: { instanceId: statusInstId, status: statusName },
          });
        }
        break;
      }

      case '-curestatus': {
        const cureIdent = parts[2];
        const cureParsed = parsePokemonIdent(cureIdent);
        const cureInstId = getInstanceId(cureIdent);
        log.push({
          round: currentRound,
          attackerInstanceId: cureInstId, attackerName: cureParsed.name,
          moveName: '', targetInstanceId: cureInstId, targetName: cureParsed.name,
          damage: 0, effectiveness: null, targetFainted: false,
          message: `${cureParsed.name}'s status was cured!`,
          statusChange: { instanceId: cureInstId, status: '' },
        });
        break;
      }

      case '-boost':
      case '-unboost': {
        flushPendingMove();
        const boostIdent = parts[2];
        const stat = parts[3]; // atk, def, spa, spd, spe
        const amount = parseInt(parts[4]) * (cmd === '-unboost' ? -1 : 1);
        const boostParsed = parsePokemonIdent(boostIdent);
        const boostInstId = getInstanceId(boostIdent);

        const statNames: Record<string, string> = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };
        const direction = amount > 0 ? 'rose' : 'fell';
        const intensity = Math.abs(amount) >= 2 ? ' sharply' : '';

        log.push({
          round: currentRound,
          attackerInstanceId: boostInstId, attackerName: boostParsed.name,
          moveName: '', targetInstanceId: boostInstId, targetName: boostParsed.name,
          damage: 0, effectiveness: null, targetFainted: false,
          message: `${boostParsed.name}'s ${statNames[stat] || stat}${intensity} ${direction}!`,
          boostChanges: { instanceId: boostInstId, changes: { [stat]: amount } },
        });
        break;
      }

      case '-weather': {
        const weatherName = parts[2];
        let weatherTag: 'rain' | 'sun' | 'clear' | undefined;
        if (weatherName === 'RainDance') weatherTag = 'rain';
        else if (weatherName === 'SunnyDay') weatherTag = 'sun';
        else if (weatherName === 'none') weatherTag = 'clear';

        if (weatherTag) {
          const weatherMsg = weatherTag === 'rain' ? '🌧️ It started to rain!'
            : weatherTag === 'sun' ? '☀️ The sunlight turned harsh!'
            : 'The weather cleared up.';
          log.push({
            round: currentRound,
            attackerInstanceId: '', attackerName: '',
            moveName: '', targetInstanceId: '', targetName: '',
            damage: 0, effectiveness: null, targetFainted: false,
            message: weatherMsg,
            weather: weatherTag,
          });
        }
        break;
      }

      case 'win': {
        flushPendingMove();
        const winnerName = parts[2];
        winner = winnerName === 'Left' ? 'left' : 'right';
        break;
      }

      case 'tie': {
        flushPendingMove();
        winner = null;
        break;
      }

      case 'cant': {
        // Pokemon can't move (paralysis, sleep, freeze, etc.)
        flushPendingMove();
        const cantIdent = parts[2];
        const reason = parts[3] || '';
        const cantParsed = parsePokemonIdent(cantIdent);

        const cantMessages: Record<string, string> = {
          'slp': `${cantParsed.name} is fast asleep!`,
          'frz': `${cantParsed.name} is frozen solid!`,
          'par': `${cantParsed.name} is paralyzed! It can't move!`,
          'flinch': `${cantParsed.name} flinched!`,
        };

        log.push({
          round: currentRound,
          attackerInstanceId: getInstanceId(cantIdent), attackerName: cantParsed.name,
          moveName: '', targetInstanceId: getInstanceId(cantIdent), targetName: cantParsed.name,
          damage: 0, effectiveness: null, targetFainted: false,
          message: cantMessages[reason] || `${cantParsed.name} can't move!`,
        });
        break;
      }

      case '-ability': {
        // Ability activation — log it as a message
        const abilIdent = parts[2];
        const abilName = parts[3];
        const abilParsed = parsePokemonIdent(abilIdent);
        // Don't clutter log with initial ability announcements
        if (currentRound > 0) {
          log.push({
            round: currentRound,
            attackerInstanceId: getInstanceId(abilIdent), attackerName: abilParsed.name,
            moveName: '', targetInstanceId: getInstanceId(abilIdent), targetName: abilParsed.name,
            damage: 0, effectiveness: null, targetFainted: false,
            message: `${abilParsed.name}'s ${abilName}!`,
          });
        }
        break;
      }

      case '-item':
      case '-enditem': {
        const itemIdent = parts[2];
        const itemName = parts[3];
        const itemParsed = parsePokemonIdent(itemIdent);
        if (cmd === '-enditem') {
          log.push({
            round: currentRound,
            attackerInstanceId: getInstanceId(itemIdent), attackerName: itemParsed.name,
            moveName: '', targetInstanceId: getInstanceId(itemIdent), targetName: itemParsed.name,
            damage: 0, effectiveness: null, targetFainted: false,
            message: `${itemParsed.name}'s ${itemName} was consumed!`,
            itemConsumed: { instanceId: getInstanceId(itemIdent), itemId: itemName.toLowerCase().replace(/\s+/g, '-') },
          });
        }
        break;
      }

      default:
        // Skip other protocol messages (upkeep, etc.)
        break;
    }
  }

  flushPendingMove();

  // Build final BattlePokemonState arrays using battle object for accurate HP
  const left: BattlePokemonState[] = leftEntries.map((e, i) => {
    const instId = `l${i}`;
    const bPkmn = battle?.sides[0]?.pokemon[i];

    return {
      instanceId: instId,
      name: e.pokemon.name,
      sprite: e.pokemon.sprite,
      types: [...e.pokemon.types],
      currentHp: bPkmn ? bPkmn.hp : 0,
      maxHp: bPkmn ? bPkmn.maxhp : 100,
      side: 'left' as const,
      heldItem: e.heldItem ?? null,
    };
  });

  const right: BattlePokemonState[] = rightEntries.map((e, i) => {
    const instId = `r${i}`;
    const bPkmn = battle?.sides[1]?.pokemon[i];

    return {
      instanceId: instId,
      name: e.pokemon.name,
      sprite: e.pokemon.sprite,
      types: [...e.pokemon.types],
      currentHp: bPkmn ? bPkmn.hp : 0,
      maxHp: bPkmn ? bPkmn.maxhp : 100,
      side: 'right' as const,
      heldItem: e.heldItem ?? null,
    };
  });

  // Determine winner from remaining HP if not set
  if (!winner) {
    const leftHp = left.reduce((s, p) => s + p.currentHp, 0);
    const rightHp = right.reduce((s, p) => s + p.currentHp, 0);
    winner = leftHp >= rightHp ? 'left' : 'right';
  }

  return {
    left,
    right,
    log,
    winner,
    round: currentRound,
    fieldSize,
  };
}
