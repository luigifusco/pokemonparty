import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import './NotificationsScreen.css';
const TYPE_LABELS = {
    battle: { icon: '⚔️', label: 'Battle challenge' },
    trade: { icon: '🔄', label: 'Trade request' },
};
function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60)
        return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}
export default function NotificationsScreen({ notifications, onAccept, onDismiss }) {
    const navigate = useNavigate();
    return (_jsxs("div", { className: "notif-screen", children: [_jsxs("div", { className: "notif-header", children: [_jsx("button", { className: "notif-back", onClick: () => navigate('/play'), children: "\u2190 Back" }), _jsx("h2", { children: "\uD83D\uDD14 Notifications" })] }), _jsxs("div", { className: "notif-list", children: [notifications.length === 0 && (_jsx("div", { className: "notif-empty", children: "No notifications" })), notifications.map((n) => {
                        const { icon, label } = TYPE_LABELS[n.type];
                        return (_jsxs("div", { className: "notif-card", children: [_jsx("div", { className: "notif-card-icon", children: icon }), _jsxs("div", { className: "notif-card-body", children: [_jsxs("div", { className: "notif-card-text", children: [_jsx("strong", { children: n.from }), " \u2014 ", label] }), _jsx("div", { className: "notif-card-time", children: timeAgo(n.timestamp) })] }), _jsxs("div", { className: "notif-card-actions", children: [_jsx("button", { className: "notif-accept", onClick: () => onAccept(n), children: "Accept" }), _jsx("button", { className: "notif-dismiss", onClick: () => onDismiss(n.id), children: "\u2715" })] })] }, n.id));
                    })] })] }));
}
