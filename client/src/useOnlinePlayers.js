import { useState, useEffect } from 'react';
import { BASE_PATH } from './config';
export function useOnlinePlayers(playerName) {
    const [players, setPlayers] = useState([]);
    useEffect(() => {
        let cancelled = false;
        const fetchPlayers = async () => {
            try {
                const res = await fetch(`${BASE_PATH}/api/players/online`);
                const data = await res.json();
                if (!cancelled) {
                    setPlayers((data.players ?? []).filter((n) => n !== playerName));
                }
            }
            catch {
                // ignore
            }
        };
        fetchPlayers();
        const interval = setInterval(fetchPlayers, 5000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [playerName]);
    return players;
}
