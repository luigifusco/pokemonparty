# AI Move Policies

Rules governing how the AI selects moves during battle.
Each policy has a name, description, and applies to specific battle formats.

---

## 1. No Friendly Fire

**Applies to:** Doubles, Triples (targeting only)

When a move requires choosing a target (`normal`, `any`, `adjacentFoe`),
the AI always picks an **opponent slot** (negative target number), never an ally.

AoE moves like Earthquake (`allAdjacent`) are **not filtered** — they hit
everyone adjacent including allies, and that's acceptable collateral damage.

Implementation: In `buildChoice()`, when `isMulti` and the move has a
targetable type, always use a negative slot number to target opponents.

---

## 2. No Redundant Status

**Applies to:** All formats

Don't waste turns on pure status moves that would fail:

- If the target already has a **main status** (burn/paralysis/poison/toxic/sleep/freeze),
  skip moves that apply a main status (Thunder Wave, Toxic, Will-O-Wisp, etc.)
- If the target is already **confused**, skip moves that apply confusion
  (Confuse Ray, Swagger) — but other status moves are still allowed since
  confusion stacks with main statuses
- Self-targeting stat moves (Swords Dance, Calm Mind) are never filtered
- Damaging moves with secondary status effects are never filtered

Falls back to random selection if all moves are filtered out.

Implementation: In `buildChoice()`, check `dex.moves.get(id)` for `.status`
and `.volatileStatus`, cross-reference with `target.status` and `target.volatiles`.
