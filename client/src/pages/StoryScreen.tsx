import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { STORYLINES, STORYLINES_BY_ID, DIFFICULTY_ORDER, starterRegionChapter, STARTER_REGION_PREFIX, CHARACTER_UNLOCK_CHAPTER } from '@shared/story-data';
import type { Storyline, StoryStep, TeamChoice } from '@shared/story-data';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { openBox, rollTM } from '@shared/boxes';
import { rollBoost } from '@shared/boost-data';
import BattleScene from '../components/BattleScene';
import TeamSelectGrid from '../components/TeamSelectGrid';
import type { BattleSnapshot } from '@shared/battle-types';
import type { PokemonInstance } from '@shared/types';
import PokemonIcon from '../components/PokemonIcon';
import { BASE_PATH } from '../config';
import './StoryScreen.css';

const API = BASE_PATH;

interface StoryScreenProps {
  playerId: string;
  playerName: string;
  essence: number;
  onGainEssence: (amount: number) => void;
  onAddPokemon: (pokemonIds: number[]) => Promise<PokemonInstance[]>;
  onAddItems: (items: { itemType: string; itemData: string }[]) => void;
  collection: PokemonInstance[];
}

type Phase = 'hub' | 'dialogue' | 'select' | 'battle' | 'victory' | 'reward' | 'teamChoice' | 'info';

const DIFF_LABELS: Record<string, { label: string; cls: string }> = {
  beginner: { label: 'Beginner', cls: 'diff-beginner' },
  intermediate: { label: 'Intermediate', cls: 'diff-intermediate' },
  advanced: { label: 'Advanced', cls: 'diff-advanced' },
  expert: { label: 'Expert', cls: 'diff-expert' },
};

function stepKey(storylineId: string, stepIdx: number) {
  return storylineId + ':' + stepIdx;
}

export default function StoryScreen({ playerId, playerName, essence, onGainEssence, onAddPokemon, onAddItems, collection }: StoryScreenProps) {
  const navigate = useNavigate();
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>('hub');
  const [activeStoryline, setActiveStoryline] = useState<Storyline | null>(null);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [firstClear, setFirstClear] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<(string | null)[]>([]);
  const [battleFinished, setBattleFinished] = useState(false);
  const [dialogueLineIdx, setDialogueLineIdx] = useState(0);

  useEffect(() => {
    fetch(API + '/api/player/' + playerId + '/story')
      .then(r => r.json())
      .then(data => setCompletedSteps(new Set((data.completed ?? []).map(String))))
      .catch(() => {});
  }, [playerId]);

  // Derived state
  const isStorylineComplete = useCallback((sl: Storyline) => {
    return sl.steps.every((_, i) => completedSteps.has(stepKey(sl.id, i)));
  }, [completedSteps]);

  const getStorylineProgress = useCallback((sl: Storyline) => {
    let done = 0;
    for (let i = 0; i < sl.steps.length; i++) {
      if (completedSteps.has(stepKey(sl.id, i))) done++;
    }
    return done;
  }, [completedSteps]);

  const chosenStarterRegion = useMemo<string | null>(() => {
    for (const key of completedSteps) {
      if (key.startsWith(STARTER_REGION_PREFIX)) return key.slice(STARTER_REGION_PREFIX.length);
    }
    return null;
  }, [completedSteps]);

  const isUnlocked = useCallback((sl: Storyline) => {
    if (sl.regionLock && sl.regionLock !== chosenStarterRegion) return false;
    if (sl.requires.length === 0) return true;
    const needed = sl.requiresCount ?? sl.requires.length;
    let met = 0;
    for (const reqId of sl.requires) {
      const req = STORYLINES_BY_ID[reqId];
      if (req && isStorylineComplete(req)) met++;
    }
    return met >= needed;
  }, [isStorylineComplete, chosenStarterRegion]);

  const getNextStepIdx = useCallback((sl: Storyline) => {
    for (let i = 0; i < sl.steps.length; i++) {
      if (!completedSteps.has(stepKey(sl.id, i))) return i;
    }
    return sl.steps.length;
  }, [completedSteps]);

  // Enter a storyline
  const enterStoryline = useCallback((sl: Storyline) => {
    setActiveStoryline(sl);
    const nextStep = getNextStepIdx(sl);
    if (nextStep >= sl.steps.length) return; // already complete
    setActiveStepIdx(nextStep);
    setSelected([]);
    setSnapshot(null);
    setFirstClear(false);
    setBattleFinished(false);
    setDialogueLineIdx(0);
    const step = sl.steps[nextStep];
    if (step.type === 'dialogue') setPhase('dialogue');
    else if (step.type === 'info') setPhase('info');
    else if (collection.length > 0) setPhase('select');
    else startBattleStep(sl, nextStep);
  }, [getNextStepIdx, collection]);

  const markStepComplete = useCallback(async (sl: Storyline, stepIdx: number) => {
    const key = stepKey(sl.id, stepIdx);
    const res = await fetch(API + '/api/player/' + playerId + '/story/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId: key }),
    });
    const data = await res.json();
    setCompletedSteps(prev => new Set([...prev, key]));
    return data.firstClear as boolean;
  }, [playerId]);

  // Posts a sentinel `<storyline>:complete` chapter on first clear.
  // Server-side gates (e.g. Bond XP unlock) check for these sentinels.
  const markStorylineComplete = useCallback(async (sl: Storyline) => {
    const key = sl.id + ':complete';
    if (completedSteps.has(key)) return;
    try {
      await fetch(API + '/api/player/' + playerId + '/story/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: key }),
      });
      setCompletedSteps(prev => new Set([...prev, key]));
    } catch {}
  }, [playerId, completedSteps]);

  const startBattleStep = useCallback(async (sl: Storyline, stepIdx: number) => {
    const step = sl.steps[stepIdx];
    if (!step.team) return;
    setLoading(true);
    try {
      const teamSize = step.team.length;
      let playerTeam: number[];
      let playerMoves: ([string, string] | null)[] | undefined;
      let playerHeldItems: (string | null)[] | undefined;
      let playerAbilities: (string | null)[] | undefined;
      let playerCharacters: (string | null)[] | undefined;
      let playerInstanceIds: string[] | undefined;

      if (selected.length > 0) {
        playerTeam = selected.map(idx => collection[idx].pokemon.id);
        playerMoves = selected.map(idx => collection[idx].learnedMoves ?? null);
        playerHeldItems = selected.map(idx => collection[idx].heldItem ?? null);
        playerAbilities = selected.map(idx => collection[idx].ability ?? null);
        playerCharacters = selected.map((idx, i) => selectedCharacters[i] ?? collection[idx].character ?? null);
        playerInstanceIds = selected.map(idx => collection[idx].instanceId);
      } else {
        const pool = Object.values(POKEMON_BY_ID).filter(p => p.tier !== 'legendary');
        playerTeam = Array.from({ length: teamSize }, () => pool[Math.floor(Math.random() * pool.length)].id);
      }

      const res = await fetch(API + '/api/battle/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftTeam: playerTeam,
          rightTeam: step.team,
          fieldSize: step.fieldSize ?? 1,
          leftMoves: playerMoves,
          leftHeldItems: playerHeldItems,
          leftAbilities: playerAbilities,
          leftCharacters: playerCharacters,
          playerName,
          leftInstanceIds: playerInstanceIds,
          bondMode: 'story',
        }),
      });
      const data = await res.json();
      setSnapshot(data.snapshot);
      setBattleFinished(false);
      setPhase('battle');
    } catch (err) {
      console.error('Battle failed:', err);
    } finally {
      setLoading(false);
    }
  }, [collection, selected, selectedCharacters, playerName]);

  const handleBattleEnd = useCallback(async () => {
    if (!activeStoryline || !snapshot) return;
    const step = activeStoryline.steps[activeStepIdx];

    if (snapshot.winner === 'left') {
      const fc = await markStepComplete(activeStoryline, activeStepIdx);
      setFirstClear(fc);
      if (fc && step.essenceReward) onGainEssence(step.essenceReward);

      // Check if storyline just completed
      const allDone = activeStoryline.steps.every((_, i) =>
        i === activeStepIdx || completedSteps.has(stepKey(activeStoryline.id, i))
      );

      if (allDone && fc) {
        await markStorylineComplete(activeStoryline);
        // Give completion reward
        onGainEssence(activeStoryline.completionReward.essence);
        if (activeStoryline.completionReward.pack) {
          const pack = openBox(activeStoryline.completionReward.pack);
          await onAddPokemon(pack.map(p => p.id));
          const tm = rollTM();
          const boost = rollBoost();
          onAddItems([
            { itemType: 'tm', itemData: tm },
            { itemType: 'boost', itemData: boost },
          ]);
        }
        setPhase('reward');
      } else {
        setPhase('victory');
      }
    } else {
      setPhase('hub');
      setActiveStoryline(null);
    }
  }, [activeStoryline, activeStepIdx, snapshot, completedSteps, markStepComplete, markStorylineComplete, onGainEssence, onAddPokemon, onAddItems]);

  const advanceToNextStep = useCallback(() => {
    if (!activeStoryline) return;
    const nextIdx = activeStepIdx + 1;
    if (nextIdx >= activeStoryline.steps.length) {
      setPhase('hub');
      setActiveStoryline(null);
      return;
    }
    setActiveStepIdx(nextIdx);
    setSelected([]);
    setSnapshot(null);
    setBattleFinished(false);
    setDialogueLineIdx(0);
    const step = activeStoryline.steps[nextIdx];
    if (step.type === 'dialogue') setPhase('dialogue');
    else if (step.type === 'info') setPhase('info');
    else if (collection.length > 0) setPhase('select');
    else startBattleStep(activeStoryline, nextIdx);
  }, [activeStoryline, activeStepIdx, collection, startBattleStep]);

  const handleDialogueContinue = useCallback(async () => {
    if (!activeStoryline) return;
    const step = activeStoryline.steps[activeStepIdx];
    const lines = step.lines ?? [];

    // For dialogue steps we walk through lines one at a time. Info
    // steps render all lines at once so we skip the per-line loop.
    if (step.type === 'dialogue' && dialogueLineIdx < lines.length - 1) {
      setDialogueLineIdx(dialogueLineIdx + 1);
      return;
    }

    // Dialogue complete — mark step and advance
    await markStepComplete(activeStoryline, activeStepIdx);

    // Check if this was the final step
    const allDone = activeStoryline.steps.every((_, i) =>
      i === activeStepIdx || completedSteps.has(stepKey(activeStoryline.id, i))
    );

    if (allDone) {
      const fc = !completedSteps.has(stepKey(activeStoryline.id, activeStepIdx));
      if (fc) {
        await markStorylineComplete(activeStoryline);
        // If storyline has team choices, show choice screen before reward
        if (activeStoryline.teamChoices && activeStoryline.teamChoices.length > 0) {
          setPhase('teamChoice');
          return;
        }
        onGainEssence(activeStoryline.completionReward.essence);
        if (activeStoryline.completionReward.pack) {
          const pack = openBox(activeStoryline.completionReward.pack);
          await onAddPokemon(pack.map(p => p.id));
          const tm = rollTM();
          const boost = rollBoost();
          onAddItems([
            { itemType: 'tm', itemData: tm },
            { itemType: 'boost', itemData: boost },
          ]);
        }
        setPhase('reward');
        return;
      }
    }

    advanceToNextStep();
  }, [activeStoryline, activeStepIdx, dialogueLineIdx, completedSteps, markStepComplete, markStorylineComplete, advanceToNextStep, onGainEssence, onAddPokemon, onAddItems]);

  const handleTeamChoice = useCallback(async (choice: TeamChoice) => {
    if (!activeStoryline) return;
    await onAddPokemon(choice.pokemonIds);
    if (choice.region) {
      const key = starterRegionChapter(choice.region);
      try {
        await fetch(API + '/api/player/' + playerId + '/story/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterId: key }),
        });
        setCompletedSteps(prev => new Set([...prev, key]));
      } catch {}
    }
    if (activeStoryline.completionReward.essence > 0) {
      onGainEssence(activeStoryline.completionReward.essence);
    }
    setPhase('reward');
  }, [activeStoryline, onAddPokemon, onGainEssence, playerId]);

  // ─── Team Choice View ───
  if (phase === 'teamChoice' && activeStoryline?.teamChoices) {
    return (
      <div className="story-screen">
        <div className="story-dialogue">
          <div className="story-dialogue-name">Choose your team!</div>
          <div className="story-dialogue-title-text">Pick a regional starter trio — this also locks in the gym leaders &amp; Elite Four you'll face later. Choose carefully!</div>
          <div className="story-team-choices">
            {activeStoryline.teamChoices.map((choice, i) => (
              <button key={i} className="story-team-choice" onClick={() => handleTeamChoice(choice)}>
                <div className="story-team-choice-label">{choice.label}</div>
                <div className="story-team-choice-pokemon">
                  {choice.pokemonIds.map(id => {
                    const p = POKEMON_BY_ID[id];
                    return p ? (
                      <div key={id} className="story-team-choice-poke">
                        <img src={p.sprite} alt={p.name} className="story-team-choice-sprite" />
                        <span>{p.name}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Hub View ───
  if (phase === 'hub') {
    const visible = STORYLINES.filter(sl => {
      // Hide storylines locked to a region the player didn't pick.
      if (sl.regionLock && chosenStarterRegion && sl.regionLock !== chosenStarterRegion) return false;
      return true;
    });
    const sorted = [...visible].sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);
    return (
      <div className="story-screen">
        <div className="story-header">
          <button className="story-back" onClick={() => navigate('/play')}>← Back</button>
          <h2>Story Mode</h2>
        </div>
        <div className="story-hub">
          {sorted.map(sl => {
            const unlocked = isUnlocked(sl);
            const complete = isStorylineComplete(sl);
            const progress = getStorylineProgress(sl);
            const diff = DIFF_LABELS[sl.difficulty];
            return (
              <div
                key={sl.id}
                className={'story-card' + (complete ? ' complete' : '') + (!unlocked ? ' locked' : '')}
                onClick={() => unlocked && !complete && enterStoryline(sl)}
              >
                <div className="story-card-icon">{sl.icon}</div>
                <div className="story-card-body">
                  <div className="story-card-title">{sl.title}</div>
                  <div className="story-card-desc">{sl.description}</div>
                  <div className="story-card-meta">
                    <span className={'story-diff-badge ' + diff.cls}>{diff.label}</span>
                    <span className="story-card-region">{sl.region}</span>
                  </div>
                </div>
                <div className="story-card-status">
                  {complete ? '✅' : !unlocked ? '🔒' : progress + '/' + sl.steps.length}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const step = activeStoryline?.steps[activeStepIdx];

  // ─── Info View ───
  if (phase === 'info' && activeStoryline && step?.type === 'info') {
    const lines = step.lines ?? [];
    return (
      <div className="story-screen">
        <div className="story-info-card">
          <div className="story-info-icon">{step.infoIcon ?? 'ℹ️'}</div>
          <div className="story-info-title">{step.infoTitle ?? 'Info'}</div>
          <ul className="story-info-lines">
            {lines.map((ln, i) => <li key={i}>{ln}</li>)}
          </ul>
          <button className="story-fight-btn" onClick={handleDialogueContinue}>Got it! →</button>
        </div>
      </div>
    );
  }

  // ─── Dialogue View ───
  if (phase === 'dialogue' && activeStoryline && step?.type === 'dialogue') {
    const lines = step.lines ?? [];
    return (
      <div className="story-screen">
        <div className="story-dialogue story-dialogue--scene">
          <div className="story-dialogue-figure">
            {step.sprite && <img src={step.sprite} alt={step.speaker} className="story-dialogue-sprite" />}
            <div className="story-dialogue-name">{step.speaker}</div>
          </div>
          <div className="story-dialogue-body">
            <div className="story-dialogue-text">{lines[dialogueLineIdx]}</div>
          </div>
          <div className="story-dialogue-actions">
            <button className="story-retreat-btn" onClick={() => { setPhase('hub'); setActiveStoryline(null); }}>← Back</button>
            <button className="story-fight-btn" onClick={handleDialogueContinue}>
              {dialogueLineIdx < lines.length - 1 ? 'Continue →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Team Select ───
  if (phase === 'select' && activeStoryline && step?.type === 'battle') {
    const teamSize = step.team?.length ?? 1;
    const toggleSelect = (idx: number, character?: string | null) => {
      const i = selected.indexOf(idx);
      if (i !== -1) {
        setSelected(selected.filter((_, k) => k !== i));
        setSelectedCharacters(selectedCharacters.filter((_, k) => k !== i));
      } else if (selected.length < teamSize) {
        setSelected([...selected, idx]);
        setSelectedCharacters([...selectedCharacters, character ?? null]);
      }
    };
    return (
      <div className="story-screen">
        <div className="story-dialogue" style={{ marginBottom: 8 }}>
          <div className="story-dialogue-name">{step.trainerName}</div>
          <div className="story-dialogue-title-text">{step.trainerTitle}</div>
          <div className="story-dialogue-team">
            {step.team?.map((id, i) => <PokemonIcon key={i} pokemonId={id} size={32} />)}
          </div>
          <div className="story-format-info">{step.fieldSize}v{step.fieldSize} · {teamSize} Pokémon</div>
        </div>
        <TeamSelectGrid
          instances={collection}
          selected={selected}
          onToggle={toggleSelect}
          teamSize={teamSize}
          onSubmit={selected.length === teamSize ? () => startBattleStep(activeStoryline, activeStepIdx) : undefined}
          submitLabel={loading ? 'Loading...' : 'Battle!'}
          enableCharacterPick={completedSteps.has(CHARACTER_UNLOCK_CHAPTER)}
          selectedCharacters={selectedCharacters}
          headerLeft={<button className="battle-mp-back" onClick={() => { setPhase('hub'); setActiveStoryline(null); }}>← Back</button>}
          headerCenter={<span style={{ fontSize: 14, fontWeight: 'bold' }}>vs {step.trainerName}</span>}
        />
      </div>
    );
  }

  // ─── Battle ───
  if (phase === 'battle' && snapshot && activeStoryline) {
    return (
      <div className="story-battle-wrapper">
        <BattleScene snapshot={snapshot} turnDelayMs={1500} onFinished={() => setBattleFinished(true)} />
        {battleFinished && snapshot.winner && (
          <button className="story-continue-btn" onClick={handleBattleEnd}>
            {snapshot.winner === 'left' ? 'Continue' : 'Try Again'}
          </button>
        )}
      </div>
    );
  }

  // ─── Victory (step cleared, more steps remain) ───
  if (phase === 'victory' && activeStoryline) {
    return (
      <div className="story-screen">
        <div className="story-dialogue">
          <div className="story-dialogue-name">Victory!</div>
          {firstClear && step?.essenceReward && (
            <div className="story-rewards"><div className="story-reward">✦ +{step.essenceReward} Essence</div></div>
          )}
          <button className="story-fight-btn" onClick={advanceToNextStep}>Continue →</button>
        </div>
      </div>
    );
  }

  // ─── Storyline Completion Reward ───
  if (phase === 'reward' && activeStoryline) {
    return (
      <div className="story-screen">
        <div className="story-dialogue">
          <div className="story-dialogue-name">{activeStoryline.title} Complete!</div>
          <div className="story-rewards">
            <div className="story-reward">✦ +{activeStoryline.completionReward.essence} Essence</div>
            {activeStoryline.completionReward.pack && (
              <div className="story-reward">{activeStoryline.completionReward.pack} pack!</div>
            )}
          </div>
          <button className="story-fight-btn" onClick={() => { setPhase('hub'); setActiveStoryline(null); }}>Back to Stories →</button>
        </div>
      </div>
    );
  }

  return null;
}
