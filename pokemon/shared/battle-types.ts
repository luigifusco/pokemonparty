// Shared battle types used by both client and server

export interface BattlePokemonState {
  instanceId: string;
  name: string;
  sprite: string;
  types: string[];
  currentHp: number;
  maxHp: number;
  side: 'left' | 'right';
}

export interface BattleLogEntry {
  round: number;
  attackerInstanceId: string;
  attackerName: string;
  moveName: string;
  targetInstanceId: string;
  targetName: string;
  damage: number;
  effectiveness: 'super' | 'neutral' | 'not-very' | 'immune' | null;
  targetFainted: boolean;
  message: string;
}

export interface BattleSnapshot {
  left: BattlePokemonState[];
  right: BattlePokemonState[];
  log: BattleLogEntry[];
  winner: 'left' | 'right' | null;
  round: number;
}
