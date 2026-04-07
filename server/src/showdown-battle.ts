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
  battle.choose('p1', 'default');
  battle.choose('p2', 'default');

  // Run battle: auto-choose random moves each turn
  let turns = 0;
  while (!battle.ended && turns < 50) {
    const p1choice = buildChoice(battle, 0);
    const p2choice = buildChoice(battle, 1);

    try {
      battle.choose('p1', p1choice);
      battle.choose('p2', p2choice);
    } catch (e: any) {
      try { battle.choose('p1', 'default'); battle.choose('p2', 'default'); } catch { break; }
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

  // Post-process: remove friendly-fire damage entries caused by Showdown's
  // automatic target redirection when the intended opponent faints mid-turn.
  // These are removed entirely from the log — the player never sees them.
  snapshot.log = snapshot.log.filter((entry) => {
    if (!entry.moveName || entry.damage === 0) return true;
    const aSide = entry.attackerInstanceId?.[0]; // 'l' or 'r'
    const tSide = entry.targetInstanceId?.[0];
    if (aSide && tSide && aSide === tSide && entry.attackerInstanceId !== entry.targetInstanceId) {
      return false; // Remove friendly-fire entry
    }
    return true;
  });

  return snapshot;
}

function buildChoice(battle: any, sideIndex: number): string {
  const side = battle.sides[sideIndex];
  const oppSide = battle.sides[1 - sideIndex];
  const req = side.activeRequest;
  if (!req) return 'default';
  const dex = battle.dex;

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
    const isMulti = req.active.length > 1;
    const choices: string[] = [];
    // Count total alive opponents for policy decisions
    const oppAlive = oppSide.pokemon.filter((p: any) => !p.fainted).length;

    for (let i = 0; i < req.active.length; i++) {
      const active = req.active[i];
      if (!active) { choices.push('pass'); continue; }
      const usable = active.moves.filter((m: any) => !m.disabled && m.pp > 0);
      if (usable.length === 0) { choices.push('move 1'); continue; }

      const selfPkmn = side.active[i];
      const selfHpPct = selfPkmn ? selfPkmn.hp / selfPkmn.maxhp : 1;

      // In doubles/triples, pick lowest-HP opponent for Focus Fire policy
      const opponents = oppSide.active.filter((p: any) => p && !p.fainted);
      const primaryTarget = isMulti && opponents.length > 0
        ? opponents.reduce((a: any, b: any) => (a.hp / a.maxhp) < (b.hp / b.maxhp) ? a : b)
        : oppSide.active[0];

      // --- Score each move ---
      const scored = usable.map((m: any) => {
        const md = dex.moves.get(m.id);
        if (!md) return { move: m, score: 1 };
        let score = 1;
        const isStatus = md.category === 'Status';
        const isDamaging = md.basePower > 0 || (md.category !== 'Status');
        const target = primaryTarget && !primaryTarget.fainted ? primaryTarget : null;

        // ── Hard filters (score = 0 means skip) ──

        if (isStatus && target) {
          // Policy 2: No Redundant Status
          if (md.status && target.status) score = 0;
          if (md.volatileStatus === 'confusion' && target.volatiles?.['confusion']) score = 0;

          // Policy 3: No Capped Stats
          if (md.boosts && !md.status && !md.volatileStatus) {
            const boostEntries = Object.entries(md.boosts) as [string, number][];
            const isSelfTarget = md.target === 'self' || md.target === 'adjacentAllyOrSelf' || md.target === 'allySide';
            if (isSelfTarget && selfPkmn) {
              const pos = boostEntries.filter(([, v]) => v > 0);
              if (pos.length > 0 && pos.every(([s]) => (selfPkmn.boosts?.[s] ?? 0) >= 6)) score = 0;
            } else if (!isSelfTarget && target) {
              const neg = boostEntries.filter(([, v]) => v < 0);
              if (neg.length > 0 && neg.every(([s]) => (target.boosts?.[s] ?? 0) <= -6)) score = 0;
            }
          }

          // Policy 5: Don't Status Immune Types
          if (md.status && target) {
            const targetTypes = target.types || target.getTypes?.() || [];
            // Electric immune to paralysis
            if (md.status === 'par' && targetTypes.includes('Electric')) score = 0;
            // Fire immune to burn
            if (md.status === 'brn' && targetTypes.includes('Fire')) score = 0;
            // Ice immune to freeze
            if (md.status === 'frz' && targetTypes.includes('Ice')) score = 0;
            // Poison/Steel immune to poison/toxic
            if ((md.status === 'psn' || md.status === 'tox') && (targetTypes.includes('Poison') || targetTypes.includes('Steel'))) score = 0;
            // Grass immune to powder moves
            if (md.flags?.powder && targetTypes.includes('Grass')) score = 0;
            // Electric-type status moves (Thunder Wave) don't work on Ground
            if (md.type === 'Electric') {
              const dmgTaken = dex.types.get('Ground')?.damageTaken?.[md.type];
              if (dmgTaken === 3 && targetTypes.includes('Ground')) score = 0;
            }
          }
        }

        // Policy 9: Avoid Self-Destruct Early
        if (md.selfdestruct && selfPkmn) {
          const allyAlive = side.pokemon.filter((p: any) => !p.fainted).length;
          // Only allow if last pokemon or opponent is in KO range
          if (allyAlive > 1) score = 0;
        }

        if (score === 0) return { move: m, score: 0 };

        // ── Soft scoring (weighted preferences) ──

        if (isDamaging && target) {
          // Policy 4: Prefer Super Effective / avoid immune
          const moveType = md.type;
          const targetTypes = target.types || target.getTypes?.() || [];
          let eff = 1;
          for (const ttype of targetTypes) {
            const dt = dex.types.get(ttype)?.damageTaken?.[moveType];
            if (dt === 1) eff *= 2;       // super effective
            else if (dt === 2) eff *= 0.5; // resisted
            else if (dt === 3) eff *= 0;   // immune
          }
          if (eff === 0) score *= 0.01;        // almost never pick immune moves
          else if (eff >= 2) score *= 3;       // strongly prefer super effective
          else if (eff <= 0.5) score *= 0.5;   // discourage resisted

          // Check ability-based immunities (Levitate vs Ground, etc.)
          if (moveType === 'Ground' && target.ability) {
            const abilName = dex.abilities.get(target.ability)?.name;
            if (abilName === 'Levitate') score *= 0.01;
          }

          // Policy 7: Prefer STAB
          const selfTypes = selfPkmn?.types || selfPkmn?.getTypes?.() || [];
          if (selfTypes.includes(moveType)) score *= 1.3;

          // Policy 6: Prefer Priority When Low HP Target
          if (md.priority > 0 && target.hp / target.maxhp < 0.3) score *= 2;
        }

        // Policy 8: Don't Boost When Low HP
        if (isStatus && md.boosts && (md.target === 'self' || md.target === 'adjacentAllyOrSelf')) {
          if (selfHpPct < 0.3) score *= 0.1;
        }

        // Policy 10: Don't Boost On Last Pokémon Standing
        if (isStatus && md.boosts && (md.target === 'self' || md.target === 'adjacentAllyOrSelf')) {
          if (oppAlive === 1 && target && target.hp / target.maxhp < 0.3) {
            score *= 0.2;
          }
        }

        // Policy 11: Weather Awareness
        if (md.weather) {
          const curWeather = battle.field?.weatherState?.id || '';
          // Don't set weather that's already active
          if (md.weather === 'RainDance' && curWeather === 'raindance') score *= 0.05;
          if (md.weather === 'sunnyday' && curWeather === 'sunnyday') score *= 0.05;
        }
        // Boost weather-matching moves
        if (isDamaging && battle.field?.weatherState?.id) {
          const weather = battle.field.weatherState.id;
          if (weather === 'raindance' && md.type === 'Water') score *= 1.5;
          if (weather === 'raindance' && md.type === 'Fire') score *= 0.5;
          if (weather === 'sunnyday' && md.type === 'Fire') score *= 1.5;
          if (weather === 'sunnyday' && md.type === 'Water') score *= 0.5;
        }

        return { move: m, score };
      });

      // Remove hard-filtered moves, fall back to all if none remain
      const viable = scored.filter(s => s.score > 0);
      const pool = viable.length > 0 ? viable : scored.map(s => ({ ...s, score: 1 }));

      // Weighted random selection based on scores
      const totalScore = pool.reduce((s, m) => s + m.score, 0);
      let roll = Math.random() * totalScore;
      let pick = pool[0];
      for (const entry of pool) {
        roll -= entry.score;
        if (roll <= 0) { pick = entry; break; }
      }

      const moveIdx = active.moves.indexOf(pick.move) + 1;

      // Policy 1: No Friendly Fire — always target a living opponent in multi battles
      if (isMulti && (pick.move.target === 'normal' || pick.move.target === 'any' || pick.move.target === 'adjacentFoe')) {
        // Find living opponents and their slot indices
        const livingOppSlots: number[] = [];
        for (let j = 0; j < oppSide.active.length; j++) {
          const opp = oppSide.active[j];
          if (opp && !opp.fainted && opp.hp > 0) livingOppSlots.push(j);
        }
        if (livingOppSlots.length > 0) {
          // Policy 12: Focus Fire — target lowest HP living opponent
          let bestSlot = livingOppSlots[0];
          let bestHpPct = 1;
          for (const slot of livingOppSlots) {
            const opp = oppSide.active[slot];
            const pct = opp.hp / opp.maxhp;
            if (pct < bestHpPct) { bestHpPct = pct; bestSlot = slot; }
          }
          choices.push(`move ${moveIdx} ${bestSlot + 1}`);
        } else {
          // No living opponents — just pick the move without targeting
          choices.push(`move ${moveIdx}`);
        }
      } else {
        choices.push(`move ${moveIdx}`);
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

  // Build absolute HP snapshot from pokemonState at the current point in time
  function getHpSnapshot(): Record<string, number> {
    const snap: Record<string, number> = {};
    // Start with tracked protocol state for pokemon that have appeared in battle
    for (const [ident, state] of Object.entries(pokemonState)) {
      const instId = getInstanceId(ident);
      snap[instId] = Math.max(0, state.hp);
    }
    // For unseen pokemon (still in reserve), use maxHp from battle object
    for (let i = 0; i < leftEntries.length; i++) {
      if (snap[`l${i}`] === undefined) {
        const bPkmn = battle?.sides?.[0]?.pokemon?.[i];
        snap[`l${i}`] = bPkmn?.maxhp ?? 100;
      }
    }
    for (let i = 0; i < rightEntries.length; i++) {
      if (snap[`r${i}`] === undefined) {
        const bPkmn = battle?.sides?.[1]?.pokemon?.[i];
        snap[`r${i}`] = bPkmn?.maxhp ?? 100;
      }
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
          // Secondary effect from a move
          pendingStatusChange = { instanceId: statusInstId, status: statusName };
        } else {
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
        let weatherTag: 'rain' | 'sun' | 'clear' | undefined;
        if (weatherName === 'RainDance') weatherTag = 'rain';
        else if (weatherName === 'SunnyDay') weatherTag = 'sun';
        else if (weatherName === 'none') weatherTag = 'clear';

        if (weatherTag) {
          const weatherMsg = weatherTag === 'rain' ? '🌧️ It started to rain!'
            : weatherTag === 'sun' ? '☀️ The sunlight turned harsh!'
            : 'The weather cleared up.';
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
