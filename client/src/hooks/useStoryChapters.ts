import { useEffect, useState } from 'react';
import { BASE_PATH } from '../config';

/**
 * Fetches the set of completed story chapter ids for a player.
 * Used to gate features behind story-mode milestones (e.g. battle-style picker).
 */
export function useStoryChapters(playerId: string | null | undefined): Set<string> {
  const [chapters, setChapters] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!playerId) return;
    let alive = true;
    fetch(BASE_PATH + '/api/player/' + playerId + '/story')
      .then(r => r.json())
      .then(data => { if (alive) setChapters(new Set((data.completed ?? []).map(String))); })
      .catch(() => {});
    return () => { alive = false; };
  }, [playerId]);
  return chapters;
}
