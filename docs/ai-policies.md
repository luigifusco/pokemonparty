# AI Move Policies

Rules governing how the AI selects moves during battle.
Policies are split into **hard filters** (score=0, move skipped) and
**soft weights** (score multiplied, move preferred/discouraged).

Selection uses weighted random: higher score = more likely to be picked.

---

## Hard Filters (move skipped entirely)

### 1. No Friendly Fire
**Applies to:** Doubles, Triples — targeting only.
Targeted moves always pick an opponent slot, never an ally.

### 2. No Redundant Status
Skip pure status moves when target already has a main status.
Skip confusion moves on already-confused targets.

### 3. No Capped Stats
Skip self-boost moves when all positive boosts at +6.
Skip opponent-debuff moves when all negative boosts at -6.

### 4. Don't Status Immune Types
Skip Thunder Wave on Ground/Electric types, Will-O-Wisp on Fire types,
Toxic on Poison/Steel types, powder moves on Grass types, etc.

### 5. Avoid Self-Destruct Early
Don't use Explosion/Self-Destruct unless it's the last Pokémon alive.

---

## Soft Weights (score multiplied)

### 6. Prefer Super Effective (×3 for SE, ×0.5 for resist, ×0.01 for immune)
Strongly prefer moves with type advantage. Avoid immune matchups
(e.g. Normal vs Ghost, Ground vs Levitate).

### 7. Prefer STAB (×1.3)
Slight preference for same-type-attack-bonus moves.

### 8. Prefer Priority on Low-HP Targets (×2)
When opponent is below 30% HP, prefer priority moves
(Quick Attack, Bullet Punch, etc.) to secure the KO.

### 9. Don't Boost When Low HP (×0.1)
When below 30% HP, almost never use setup moves — just attack.

### 10. Don't Boost on Last Pokémon Standing (×0.2)
If opponent has only 1 low-HP Pokémon left, prefer attacking over setup.

### 11. Weather Awareness
Don't set weather already active (×0.05).
Prefer weather-boosted moves: Water in rain ×1.5, Fire in sun ×1.5.
Discourage anti-weather moves: Fire in rain ×0.5, Water in sun ×0.5.

### 12. Focus Fire (Doubles/Triples)
In multi-battles, target the opponent with the lowest HP percentage
to secure KOs rather than spreading damage.
