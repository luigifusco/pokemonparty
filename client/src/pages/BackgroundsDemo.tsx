import BattleBackground, { BACKGROUND_PRESETS } from '../components/BattleBackground';
import './BackgroundsDemo.css';

export default function BackgroundsDemo() {
  const n = BACKGROUND_PRESETS.length;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  return (
    <div
      className="bg-demo-screen"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {BACKGROUND_PRESETS.map((p) => (
        <div key={p.id} className="bg-demo-tile">
          <BattleBackground preset={p} />
          <div className="bg-demo-label">
            <div className="bg-demo-title">{p.label}</div>
            <div className="bg-demo-id">{p.id}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
