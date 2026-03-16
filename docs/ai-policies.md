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
