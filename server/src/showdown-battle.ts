// Showdown Battle Simulator wrapper
// Runs a Pokemon Showdown battle and returns a BattleSnapshot
//
// Uses the BattleStream API from pokemon-showdown to run a full battle
// with proper abilities, items, crits, priority, etc.

import { Teams, Dex } from '../../pokemon-showdown/dist/sim/index.js';
// Battle imported dynamically to avoid circular issues at module load time
let BattleClass: any = null;
function getBattleClass() {
  if (!BattleClass) {
    BattleClass = require('../../pokemon-showdown/dist/sim/index.js').Battle;
  }
  return BattleClass;
}
import type { BattleSnapshot, BattlePokemonState, BattleLogEntry } from '../../shared/battle-types.js';
import type { Pokemon } from '../../shared/types.js';
import { buildChoice as aiBuildChoice } from './ai/chooseAction.js';

const GEN5_DEX = Dex.forGen(5);

interface BattleTeamEntry {
  pokemon: Pokemon;
  heldItem?: string | null;
  moves: [string, string];
  ivs?: { hp: number; attack: number; defense: number; spAtk: number; spDef: number; speed: number };
  nature?: string;
  ability?: string;
  character?: string | null;
  instanceId?: string;
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

/** Pick a random ability from a species' available abilities */
export function randomAbilityForSpecies(speciesName: string): string {
  const species = GEN5_DEX.species.get(speciesName);
  if (!species || !species.abilities) return 'No Ability';
  const pool: string[] = [];
  if (species.abilities[0]) pool.push(species.abilities[0]);
  if (species.abilities[1]) pool.push(species.abilities[1]);
  if (species.abilities.H) pool.push(species.abilities.H);
  if (pool.length === 0) return 'No Ability';
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildShowdownTeam(entries: BattleTeamEntry[]): string {
  const sets = entries.map((e) => {
    const species = e.pokemon.name;
    const ability = e.ability || getShowdownAbility(species);
    const item = e.heldItem ? (ITEM_ID_TO_SHOWDOWN[e.heldItem] || '') : '';
    const ivs = e.ivs || { hp: 15, attack: 15, defense: 15, spAtk: 15, spDef: 15, speed: 15 };

    return {
      species,
      ability,
      item,
      moves: [...e.moves],
      nature: e.nature || 'Serious',
      level: 100,
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
  // Matches both "p1a: Name" (active slot) and "p1: Name" (bench/generic)
  const match = ident.match(/^(p[12])[a-c]?: (.+)$/);
  if (!match) return { side: 'left', playerKey: 'p1', name: ident };
  return {
    side: match[1] === 'p1' ? 'left' : 'right',
    playerKey: match[1],
    name: match[2],
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

  const Battle = getBattleClass();

  // Map fieldSize to PS format: 1=singles, 2=doubles, 3+=triples
  let formatid = 'gen5customgame';
  if (fieldSize === 2) formatid = 'gen5doublescustomgame';
  else if (fieldSize >= 3) formatid = 'gen5triplescustomgame';

  const battle = new Battle({
    formatid,
    p1: { name: 'Left', team: leftTeam },
    p2: { name: 'Right', team: rightTeam },
  });

  // Handle team preview
  battle.makeChoices('default', 'default');

  // Run battle: AI-driven move choices each turn
  // Build character lookup by species name for each side
  const leftCharBySpecies: Record<string, string> = {};
  for (const e of leftEntries) if (e.character) leftCharBySpecies[e.pokemon.name] = e.character;
  const rightCharBySpecies: Record<string, string> = {};
  for (const e of rightEntries) if (e.character) rightCharBySpecies[e.pokemon.name] = e.character;
  const p1GetChar = (_id: string | undefined, speciesName: string) => leftCharBySpecies[speciesName];
  const p2GetChar = (_id: string | undefined, speciesName: string) => rightCharBySpecies[speciesName];

  let turns = 0;
  while (!battle.ended && turns < 50) {
    const p1choice = aiBuildChoice(battle, 0, { getCharacter: p1GetChar });
    const p2choice = aiBuildChoice(battle, 1, { getCharacter: p2GetChar });

    try {
      battle.makeChoices(p1choice, p2choice);
    } catch (e: any) {
      // If choices failed, try simpler alternatives
      try { battle.makeChoices('default', 'default'); } catch { break; }
    }
    turns++;
  }

  // Filter split sections: |split|pN is followed by private + public view lines.
  // Keep only the first (private) view to avoid duplicates.
  const filteredLog: string[] = [];
  for (let i = 0; i < battle.log.length; i++) {
    const line = battle.log[i];
    if (line.startsWith('|split|')) {
      // Next line is private view (keep), line after is public view (skip)
      if (i + 1 < battle.log.length) filteredLog.push(battle.log[i + 1]);
      i += 2;
      continue;
    }
    filteredLog.push(line);
  }

  const snapshot = parseProtocol(filteredLog, leftEntries, rightEntries, fieldSize, battle);

  // Attach raw protocol log for debug view
  snapshot.rawLog = filteredLog.filter(l => l.startsWith('|') && l !== '|');

  // Post-process: clean up log entries that would cause visual confusion.
  // Track HP state to detect attacks on already-fainted pokemon.
  const trackHp: Record<string, number> = {};
  for (const p of [...snapshot.left, ...snapshot.right]) trackHp[p.instanceId] = p.maxHp;

  snapshot.log = snapshot.log.filter((entry) => {
    if (!entry.moveName) {
      // Update tracked HP from hpState for non-move entries
      if (entry.hpState) {
        for (const [id, v] of Object.entries(entry.hpState)) trackHp[id] = v;
      }
      if (entry.targetFainted && entry.targetInstanceId) trackHp[entry.targetInstanceId] = 0;
      return true;
    }

    // Remove friendly-fire (attack redirected to ally)
    const aSide = entry.attackerInstanceId?.[0];
    const tSide = entry.targetInstanceId?.[0];
    if (aSide && tSide && aSide === tSide && entry.attackerInstanceId !== entry.targetInstanceId && entry.damage > 0) {
      return false;
    }

    // Remove attacks on already-fainted pokemon — check HP BEFORE this entry's hpState
    if (entry.damage > 0 && entry.targetInstanceId) {
      const targetHpBefore = trackHp[entry.targetInstanceId] ?? 999;
      if (targetHpBefore <= 0) return false;
    }

    // Now apply this entry's state for subsequent checks
    if (entry.hpState) {
      for (const [id, v] of Object.entries(entry.hpState)) trackHp[id] = v;
    }
    if (entry.damage > 0 && entry.targetInstanceId && !entry.hpState) {
      trackHp[entry.targetInstanceId] = Math.max(0, (trackHp[entry.targetInstanceId] ?? 0) - entry.damage);
    }
    if (entry.targetFainted && entry.targetInstanceId) {
      trackHp[entry.targetInstanceId] = 0;
    }

    return true;
  });

  return snapshot;
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

  // Build absolute HP snapshot from pokemonState at the current point in time
  // Track maxHp from switch events for reserve pokemon
  const knownMaxHp: Record<string, number> = {};

  function getHpSnapshot(): Record<string, number> {
    const snap: Record<string, number> = {};
    // Only include pokemon that have appeared in battle (via |switch| events)
    // Reserves are NOT included — the client initializes them at maxHp
    for (const [ident, state] of Object.entries(pokemonState)) {
      const instId = getInstanceId(ident);
      snap[instId] = Math.max(0, state.hp);
    }
    return snap;
  }

  const log: BattleLogEntry[] = [];
  // Helper to push log entries with automatic HP snapshot
  function pushLog(entry: BattleLogEntry) {
    entry.hpState = getHpSnapshot();
    log.push(entry);
  }
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

    pushLog({
      round: m.round,
      attackerInstanceId: attackerInstId,
      attackerName: m.attackerName,
      moveName: m.moveName,
      targetInstanceId: targetInstId,
      targetName: m.targetName,
      damage: pendingDamage,
      effectiveness: pendingEffectiveness,
      targetFainted: pendingFainted,
      crit: pendingCrit || undefined,
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
        knownMaxHp[instId] = maxHp;

        // Log replacement if this is mid-battle (after turn 0)
        if (currentRound > 0) {
          pushLog({
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

      case 'replace': {
        // Illusion broken: |replace|p1a: Zoroark|Zoroark, L50, M
        // Remap the ident — previous events used the disguise name
        flushPendingMove();
        const replaceIdent = parts[2]; // "p1a: Zoroark" (real identity)
        const replaceParsed = parsePokemonIdent(replaceIdent);
        const replaceDetails = parts[3]?.split(', ') || [];
        const realSpecies = replaceDetails[0] || replaceParsed.name;

        // Find the old ident for this slot (the disguise)
        const slotPrefix = replaceIdent.split(':')[0]; // "p1a"
        for (const [oldIdent, state] of Object.entries(pokemonState)) {
          if (oldIdent.startsWith(slotPrefix + ':') && oldIdent !== replaceIdent) {
            // Transfer HP state from disguise to real identity
            pokemonState[replaceIdent] = { ...state, name: replaceParsed.name, species: realSpecies };
            // Remap instance ID: the disguise ident pointed to wrong pokemon
            const correctIdx = replaceParsed.side === 'left'
              ? leftNameToIdx[replaceParsed.name]
              : rightNameToIdx[replaceParsed.name];
            if (correctIdx !== undefined) {
              identToInstanceId[replaceIdent] = `${replaceParsed.side === 'left' ? 'l' : 'r'}${correctIdx}`;
              // Also fix the old ident to point to the correct ID
              identToInstanceId[oldIdent] = identToInstanceId[replaceIdent];
            }
            delete pokemonState[oldIdent];
            break;
          }
        }
        break;
      }

      case '-end': {
        // Ability/condition end (e.g. Illusion) — informational, no action needed
        break;
      }

      case 'move': {
        flushPendingMove();
        const attackerIdent = parts[2];
        const moveName = parts[3];
        const targetIdent = parts[4] || '';
        // Check for [miss] tag in remaining parts
        const hasMissTag = parts.slice(5).some(p => p === '[miss]');
        // Check for [still] tag (charge turn, no real action yet)
        const hasStillTag = parts.slice(5).some(p => p === '[still]');

        if (hasStillTag || !targetIdent) {
          // Charge turn (Fly, Dig, Bounce, etc.) — just emit a preparation message
          const attackerParsed = parsePokemonIdent(attackerIdent);
          pushLog({
            round: currentRound,
            attackerInstanceId: getInstanceId(attackerIdent),
            attackerName: attackerParsed.name,
            moveName,
            targetInstanceId: getInstanceId(attackerIdent),
            targetName: attackerParsed.name,
            damage: 0,
            effectiveness: null,
            targetFainted: false,
            message: `${attackerParsed.name} used ${moveName}!`,
          });
          // Don't set pendingMove — next events (like -prepare) are informational
          break;
        }

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

        if (hasMissTag) {
          pendingDamage = 0;
          pendingEffectiveness = 'neutral';
          // Will be flushed when next event arrives, message will show "missed"
        }
        break;
      }

      case '-prepare': {
        // Charge turn preparation (Fly, Dig, etc.) — already handled by 'move' with [still]
        break;
      }

      case '-damage': {
        const dmgIdent = parts[2];
        const hpStr = parts[3];
        const source = parts[4] || '';
        const { hp, maxHp } = parseHPString(hpStr);
        const prev = pokemonState[dmgIdent];

        if (pendingMove) {
          // Damage from the pending move
          if (prev) {
            pendingDamage = Math.max(0, prev.hp - hp);
            prev.hp = hp;
            if (maxHp > 0) prev.maxHp = maxHp;
          }
        } else {
          // Orphaned damage (recoil, status, item, ability, etc.)
          const dmgAmount = prev ? Math.max(0, prev.hp - hp) : 0;
          if (prev) {
            prev.hp = hp;
            if (maxHp > 0) prev.maxHp = maxHp;
          }
          if (dmgAmount > 0) {
            const parsed = parsePokemonIdent(dmgIdent);
            const sourceText = source.replace('[from] ', '').replace('item: ', '');
            pushLog({
              round: currentRound,
              attackerInstanceId: getInstanceId(dmgIdent),
              attackerName: parsed.name,
              moveName: '',
              targetInstanceId: getInstanceId(dmgIdent),
              targetName: parsed.name,
              damage: 0,
              effectiveness: null,
              targetFainted: hp <= 0,
              message: `${parsed.name} lost ${dmgAmount} HP!${sourceText ? ' (' + sourceText + ')' : ''}`,
              statusDamage: { instanceId: getInstanceId(dmgIdent), damage: dmgAmount },
            });
          }
        }
        break;
      }

      case '-heal': {
        flushPendingMove();
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
          pushLog({
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
        // Mark the pending move as a miss — it will be flushed with damage=0
        if (pendingMove) {
          pendingDamage = 0;
          // Override the message when flushed
          const m = pendingMove;
          flushPendingMove();
          // The flushed entry has damage=0, effectiveness=neutral — message says "missed" already
          // But let's fix the last entry's message to be explicit
          if (log.length > 0) {
            const last = log[log.length - 1];
            if (!last.message.includes('missed') && !last.message.includes('no effect')) {
              last.message = `${m.attackerName} used ${m.moveName} on ${m.targetName}! It missed!`;
            }
          }
        }
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
          pushLog({
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
          if (pendingStatusChange) {
            // A second status while a move is pending (e.g. Synchronize reflecting
            // paralysis back). Flush the move with the first status, then let this
            // one fall through to become its own log entry.
            flushPendingMove();
          } else {
            // Secondary effect from a move
            pendingStatusChange = { instanceId: statusInstId, status: statusName };
            break;
          }
        }
        {
          pushLog({
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
        pushLog({
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

        pushLog({
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
        // Skip upkeep messages (weather continuing each turn)
        const isUpkeep = parts.some(p => p.includes('[upkeep]'));
        if (isUpkeep) break;

        // Flush any pending move first (weather can trigger from abilities mid-turn)
        flushPendingMove();

        let weatherTag: 'rain' | 'sun' | 'sand' | 'hail' | 'clear' | undefined;
        if (weatherName === 'RainDance') weatherTag = 'rain';
        else if (weatherName === 'SunnyDay') weatherTag = 'sun';
        else if (weatherName === 'Sandstorm') weatherTag = 'sand';
        else if (weatherName === 'Hail' || weatherName === 'Snow') weatherTag = 'hail';
        else if (weatherName === 'none') weatherTag = 'clear';

        if (weatherTag) {
          // Check for ability source (e.g. Drizzle, Drought, Sand Stream, Snow Warning)
          const fromAbility = parts.find(p => p.startsWith('[from] ability:'));
          const ofPoke = parts.find(p => p.startsWith('[of] '));
          let weatherMsg: string;
          if (weatherTag === 'clear') {
            weatherMsg = 'The weather cleared up.';
          } else {
            const weatherNames: Record<string, string> = {
              rain: '🌧️ It started to rain!',
              sun: '☀️ The sunlight turned harsh!',
              sand: '🏜️ A sandstorm kicked up!',
              hail: '🌨️ It started to hail!',
            };
            weatherMsg = weatherNames[weatherTag];
            if (fromAbility && ofPoke) {
              const abilityName = fromAbility.replace('[from] ability: ', '');
              const pokeName = parsePokemonIdent(ofPoke.replace('[of] ', '')).name;
              weatherMsg = `${pokeName}'s ${abilityName}! ${weatherMsg}`;
            }
          }
          pushLog({
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

        pushLog({
          round: currentRound,
          attackerInstanceId: getInstanceId(cantIdent), attackerName: cantParsed.name,
          moveName: '', targetInstanceId: getInstanceId(cantIdent), targetName: cantParsed.name,
          damage: 0, effectiveness: null, targetFainted: false,
          message: cantMessages[reason] || `${cantParsed.name} can't move!`,
        });
        break;
      }

      case '-ability': {
        // Ability activation (Intimidate, Turboblaze, etc.)
        flushPendingMove();
        const abilIdent = parts[2];
        const abilName = parts[3];
        const abilParsed = parsePokemonIdent(abilIdent);
        pushLog({
          round: currentRound,
          attackerInstanceId: getInstanceId(abilIdent), attackerName: abilParsed.name,
          moveName: '', targetInstanceId: getInstanceId(abilIdent), targetName: abilParsed.name,
          damage: 0, effectiveness: null, targetFainted: false,
          message: `${abilParsed.name}'s ${abilName}!`,
        });
        break;
      }

      case '-item':
      case '-enditem': {
        flushPendingMove();
        const itemIdent = parts[2];
        const itemName = parts[3];
        const itemParsed = parsePokemonIdent(itemIdent);
        if (cmd === '-enditem') {
          pushLog({
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

      case '-sidestart': {
        flushPendingMove();
        const sideIdent = parts[2]; // e.g. "p1: Left"
        const condition = parts[3]; // e.g. "move: Stealth Rock", "Spikes"
        const sideName = sideIdent.startsWith('p1') ? 'Left' : 'Right';
        const condName = condition.replace('move: ', '');
        pushLog({
          round: currentRound,
          attackerInstanceId: '', attackerName: '',
          moveName: '', targetInstanceId: '', targetName: sideName,
          damage: 0, effectiveness: null, targetFainted: false,
          message: `${condName} was set on ${sideName}'s side!`,
        });
        break;
      }

      case '-sideend': {
        flushPendingMove();
        const sideEndIdent = parts[2];
        const endCondition = parts[3];
        const sideEndName = sideEndIdent.startsWith('p1') ? 'Left' : 'Right';
        const endCondName = endCondition.replace('move: ', '');
        pushLog({
          round: currentRound,
          attackerInstanceId: '', attackerName: '',
          moveName: '', targetInstanceId: '', targetName: sideEndName,
          damage: 0, effectiveness: null, targetFainted: false,
          message: `${endCondName} was cleared from ${sideEndName}'s side!`,
        });
        break;
      }

      default:
        // Skip other protocol messages (upkeep, etc.)
        break;
    }
  }

  flushPendingMove();

  // Use battle object directly for final HP — most reliable source
  const finalHp: Record<string, number> = {};
  const maxHpByName: Record<string, number> = {};
  if (battle) {
    for (let s = 0; s < 2; s++) {
      const prefix = s === 0 ? 'l' : 'r';
      const entries = s === 0 ? leftEntries : rightEntries;
      // Match by name since PS may reorder pokemon array
      for (let j = 0; j < entries.length; j++) {
        const name = entries[j].pokemon.name;
        const bPkmn = battle.sides[s].pokemon.find((p: any) => (p.name || p.species?.name) === name);
        finalHp[`${prefix}${j}`] = bPkmn ? bPkmn.hp : 0;
        if (bPkmn) maxHpByName[name] = bPkmn.maxhp;
      }
    }
  }

  // Build final BattlePokemonState arrays using protocol-tracked HP
  const left: BattlePokemonState[] = leftEntries.map((e, i) => {
    const instId = `l${i}`;
    return {
      instanceId: instId,
      name: e.pokemon.name,
      sprite: e.pokemon.sprite,
      types: [...e.pokemon.types],
      currentHp: finalHp[instId] ?? 0,
      maxHp: maxHpByName[e.pokemon.name] ?? 100,
      side: 'left' as const,
      heldItem: e.heldItem ?? null,
    };
  });

  const right: BattlePokemonState[] = rightEntries.map((e, i) => {
    const instId = `r${i}`;
    return {
      instanceId: instId,
      name: e.pokemon.name,
      sprite: e.pokemon.sprite,
      types: [...e.pokemon.types],
      currentHp: finalHp[instId] ?? 0,
      maxHp: maxHpByName[e.pokemon.name] ?? 100,
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
