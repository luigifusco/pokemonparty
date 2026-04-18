// Choose action — top-level entry replacing the old buildChoice.
// ====================================================================

import type { MoveCtx, CharacterProfile } from './types.js';
import { resolveProfile, PROFILES } from './characterProfile.js';
import { scoreMove, pickMove, priorityKOBypass } from './scoring.js';

type CharLookup = (instanceId: string | undefined, speciesName: string) => string | undefined;

export interface AIOptions {
  /** Look up the character override for a given active pokemon. */
  getCharacter?: CharLookup;
}

export function buildChoice(battle: any, sideIndex: number, opts: AIOptions = {}): string {
  const side = battle.sides[sideIndex];
  const oppSide = battle.sides[1 - sideIndex];
  const req = side.activeRequest;
  if (!req) return 'default';
  const dex = battle.dex;

  // ── Force switch (same as legacy) ────────────────────────────────
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

  if (!req.active) return 'default';

  const isMulti = req.active.length > 1;
  const choices: string[] = [];
  const oppAlive = oppSide.pokemon.filter((p: any) => !p.fainted).length;

  for (let i = 0; i < req.active.length; i++) {
    const active = req.active[i];
    if (!active) { choices.push('pass'); continue; }
    const usable = active.moves.filter((m: any) => !m.disabled && m.pp > 0);
    if (usable.length === 0) { choices.push('move 1'); continue; }

    const selfPkmn = side.active[i];
    const selfHpPct = selfPkmn ? selfPkmn.hp / selfPkmn.maxhp : 1;

    const opponents = oppSide.active.filter((p: any) => p && !p.fainted);
    const primaryTarget = isMulti && opponents.length > 0
      ? opponents.reduce((a: any, b: any) => (a.hp / a.maxhp) < (b.hp / b.maxhp) ? a : b)
      : oppSide.active[0];

    // Resolve profile for this pokemon
    const speciesName = selfPkmn?.species?.name || selfPkmn?.speciesid || '';
    const characterOverride = opts.getCharacter?.(selfPkmn?.id, speciesName);
    const profile: CharacterProfile = resolveProfile(characterOverride, speciesName);

    const ctx: MoveCtx = {
      battle,
      dex,
      side,
      oppSide,
      selfPkmn,
      target: primaryTarget && !primaryTarget.fainted ? primaryTarget : null,
      opponents,
      isMulti,
      selfHpPct,
      oppAlive,
      profile,
    };

    const scored = usable.map((m: any) => scoreMove(m, ctx));
    const bypass = ctx.target ? priorityKOBypass(scored, ctx) : null;
    const pick = bypass || pickMove(scored, profile.temperature);
    const moveIdx = active.moves.indexOf(pick.move) + 1;

    // Friendly-fire avoidance / focus-fire targeting (unchanged policy)
    if (isMulti && (pick.move.target === 'normal' || pick.move.target === 'any' || pick.move.target === 'adjacentFoe')) {
      const livingOppSlots: number[] = [];
      for (let j = 0; j < oppSide.active.length; j++) {
        const opp = oppSide.active[j];
        if (opp && !opp.fainted && opp.hp > 0) livingOppSlots.push(j);
      }
      if (livingOppSlots.length > 0) {
        let bestSlot = livingOppSlots[0];
        let bestHpPct = 1;
        for (const slot of livingOppSlots) {
          const opp = oppSide.active[slot];
          const pct = opp.hp / opp.maxhp;
          if (pct < bestHpPct) { bestHpPct = pct; bestSlot = slot; }
        }
        choices.push(`move ${moveIdx} ${bestSlot + 1}`);
      } else {
        choices.push(`move ${moveIdx}`);
      }
    } else {
      choices.push(`move ${moveIdx}`);
    }
  }
  return choices.join(', ');
}

export { PROFILES, resolveProfile };
