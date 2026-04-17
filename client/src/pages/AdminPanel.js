import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { BASE_PATH } from '../config';
import './AdminPanel.css';
const API = BASE_PATH;
const RARITY_LABELS = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export default function AdminPanel() {
    const [players, setPlayers] = useState([]);
    const [stats, setStats] = useState(null);
    const [editingEssence, setEditingEssence] = useState({});
    const [editingElo, setEditingElo] = useState({});
    const [rarityWeights, setRarityWeights] = useState({
        common: 50, uncommon: 30, rare: 13, epic: 5, legendary: 2,
    });
    const [weightsDirty, setWeightsDirty] = useState(false);
    const refresh = useCallback(async () => {
        const [pRes, sRes, wRes] = await Promise.all([
            fetch(`${API}/api/admin/players`),
            fetch(`${API}/api/admin/stats`),
            fetch(`${API}/api/admin/settings`),
        ]);
        setPlayers((await pRes.json()).players);
        setStats(await sRes.json());
        const settings = await wRes.json();
        if (settings.rarity_weights) {
            setRarityWeights(settings.rarity_weights);
        }
        setWeightsDirty(false);
    }, []);
    useEffect(() => { refresh(); }, [refresh]);
    const setEssence = async (id) => {
        const val = parseInt(editingEssence[id] ?? '', 10);
        if (isNaN(val))
            return;
        await fetch(`${API}/api/admin/player/${id}/set-essence`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ essence: val }),
        });
        refresh();
    };
    const setElo = async (id) => {
        const val = parseInt(editingElo[id] ?? '', 10);
        if (isNaN(val))
            return;
        await fetch(`${API}/api/admin/player/${id}/set-elo`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ elo: val }),
        });
        refresh();
    };
    const wipePokemon = async (id, name) => {
        if (!confirm(`Wipe all pokemon for ${name}?`))
            return;
        await fetch(`${API}/api/admin/player/${id}/wipe-pokemon`, { method: 'POST' });
        refresh();
    };
    const deletePlayer = async (id, name) => {
        if (!confirm(`DELETE player ${name}? This cannot be undone.`))
            return;
        await fetch(`${API}/api/admin/player/${id}/delete`, { method: 'POST' });
        refresh();
    };
    const wipeAllPokemon = async () => {
        if (!confirm('Wipe ALL pokemon from ALL players?'))
            return;
        await fetch(`${API}/api/admin/wipe-all-pokemon`, { method: 'POST' });
        refresh();
    };
    return (_jsxs("div", { className: "admin-panel", children: [_jsxs("div", { className: "admin-header", children: [_jsx("h2", { children: "\uD83D\uDD27 Admin Panel" }), _jsx("button", { className: "admin-refresh", onClick: refresh, children: "\u21BB Refresh" })] }), stats && (_jsxs("div", { className: "admin-stats", children: [_jsxs("div", { className: "admin-stat", children: [_jsx("span", { children: stats.playerCount }), "Players"] }), _jsxs("div", { className: "admin-stat", children: [_jsx("span", { children: stats.pokemonCount }), "Pok\u00E9mon"] }), _jsxs("div", { className: "admin-stat", children: [_jsx("span", { children: stats.battleCount }), "Battles"] }), _jsxs("div", { className: "admin-stat", children: [_jsx("span", { children: stats.itemCount }), "Items"] })] })), _jsx("div", { className: "admin-actions", children: _jsx("button", { className: "admin-danger-btn", onClick: wipeAllPokemon, children: "\uD83D\uDDD1\uFE0F Wipe All Pok\u00E9mon" }) }), _jsxs("div", { className: "admin-section", children: [_jsx("h3", { children: "\uD83D\uDCE6 Pack Rarity Weights" }), _jsx("p", { className: "admin-hint", children: "Controls the probability of pulling each rarity from packs. Values are relative weights (don't need to sum to 100)." }), _jsxs("div", { className: "admin-weights", children: [RARITY_LABELS.map((rarity) => (_jsxs("div", { className: "admin-weight-row", children: [_jsx("label", { className: `admin-weight-label tier-${rarity}`, children: rarity }), _jsx("input", { type: "number", min: 0, value: rarityWeights[rarity], onChange: (e) => {
                                            setRarityWeights({ ...rarityWeights, [rarity]: Number(e.target.value) });
                                            setWeightsDirty(true);
                                        } })] }, rarity))), _jsx("button", { className: "admin-save-btn", disabled: !weightsDirty, onClick: async () => {
                                    await fetch(`${API}/api/admin/settings`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ key: 'rarity_weights', value: rarityWeights }),
                                    });
                                    setWeightsDirty(false);
                                }, children: weightsDirty ? '💾 Save Weights' : '✓ Saved' })] })] }), _jsx("div", { className: "admin-table-scroll", children: _jsxs("table", { className: "admin-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Essence" }), _jsx("th", { children: "Elo" }), _jsx("th", { children: "Pok\u00E9mon" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: players.map((p) => (_jsxs("tr", { children: [_jsx("td", { className: "admin-player-name", children: p.name }), _jsx("td", { children: _jsxs("div", { className: "admin-edit-cell", children: [_jsx("span", { children: p.essence.toLocaleString() }), _jsx("input", { type: "number", placeholder: String(p.essence), value: editingEssence[p.id] ?? '', onChange: (e) => setEditingEssence({ ...editingEssence, [p.id]: e.target.value }), onKeyDown: (e) => e.key === 'Enter' && setEssence(p.id) }), _jsx("button", { onClick: () => setEssence(p.id), children: "Set" })] }) }), _jsx("td", { children: _jsxs("div", { className: "admin-edit-cell", children: [_jsx("span", { children: p.elo }), _jsx("input", { type: "number", placeholder: String(p.elo), value: editingElo[p.id] ?? '', onChange: (e) => setEditingElo({ ...editingElo, [p.id]: e.target.value }), onKeyDown: (e) => e.key === 'Enter' && setElo(p.id) }), _jsx("button", { onClick: () => setElo(p.id), children: "Set" })] }) }), _jsx("td", { children: p.pokemon_count }), _jsxs("td", { className: "admin-actions-cell", children: [_jsx("button", { className: "admin-warn-btn", onClick: () => wipePokemon(p.id, p.name), children: "Wipe PKM" }), _jsx("button", { className: "admin-danger-btn", onClick: () => deletePlayer(p.id, p.name), children: "Delete" })] })] }, p.id))) })] }) })] }));
}
