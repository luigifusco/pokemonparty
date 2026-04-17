import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { POKEMON_BY_ID } from '@shared/pokemon-data';
import { BASE_PATH } from '../config';
import './TVView.css';
const API_BASE = BASE_PATH;
export default function TVView() {
    const [leaderboard, setLeaderboard] = useState([]);
    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/leaderboard`);
                const data = await res.json();
                setLeaderboard(data.players);
            }
            catch {
                // ignore
            }
        };
        fetchLeaderboard();
        const interval = setInterval(fetchLeaderboard, 5000);
        return () => clearInterval(interval);
    }, []);
    // Split leaderboard into two columns
    const mid = Math.ceil(leaderboard.length / 2);
    const leftCol = leaderboard.slice(0, mid);
    const rightCol = leaderboard.slice(mid);
    const renderRows = (entries, startIndex) => entries.map((entry, i) => {
        const rank = startIndex + i;
        return (_jsxs("tr", { children: [_jsx("td", { className: `tv-rank ${rank < 3 ? `tv-rank-${rank + 1}` : ''}`, children: rank + 1 }), _jsx("td", { className: "tv-trainer", children: entry.name }), _jsx("td", { className: "center", children: _jsxs("div", { className: "tv-pokemon-row", children: [entry.topPokemon.map((pid, j) => {
                                const pkmn = POKEMON_BY_ID[pid];
                                return pkmn ? (_jsx("img", { src: pkmn.sprite, alt: pkmn.name, title: pkmn.name, className: "tv-pokemon-sprite" }, j)) : null;
                            }), entry.topPokemon.length === 0 && _jsx("span", { className: "tv-no-pokemon", children: "\u2014" })] }) }), _jsx("td", { className: "right tv-elo", children: entry.elo })] }, entry.name));
    });
    return (_jsxs("div", { className: "tv-view", children: [_jsx("h1", { className: "tv-title", children: "\u26A1 Pok\u00E9mon Party \u2014 Leaderboard" }), leaderboard.length === 0 ? (_jsx("div", { className: "tv-empty", children: "No players yet" })) : (_jsxs("div", { className: "tv-columns", children: [_jsxs("table", { className: "tv-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "Trainer" }), _jsx("th", { className: "center", children: "Top Pok\u00E9mon" }), _jsx("th", { className: "right", children: "Elo" })] }) }), _jsx("tbody", { children: renderRows(leftCol, 0) })] }), rightCol.length > 0 && (_jsxs("table", { className: "tv-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "Trainer" }), _jsx("th", { className: "center", children: "Top Pok\u00E9mon" }), _jsx("th", { className: "right", children: "Elo" })] }) }), _jsx("tbody", { children: renderRows(rightCol, mid) })] }))] }))] }));
}
