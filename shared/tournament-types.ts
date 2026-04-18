// Tournament types shared between client and server

export interface TournamentMatch {
  id: string;
  round: number;
  position: number;
  player1: string | null;
  player2: string | null;
  winner: string | null;
  status: 'pending' | 'active' | 'completed' | 'forfeit';
  deadline?: number;
}

export interface FrozenPokemon {
  pokemonId: number;
  name: string;
  sprite: string;
  heldItem: string | null;
  moves: [string, string] | null;
  ability: string | null;
  character?: string | null;
}

export interface TournamentPrize {
  essence: number;
  pack?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  pokemonIds?: number[];
}

/** Ranked prize list: index 0 = 1st place, 1 = 2nd, ..., last = participation */
export type TournamentPrizes = TournamentPrize[];

export const DEFAULT_PRIZES: TournamentPrizes = [
  { essence: 2000, pack: 'legendary' },
  { essence: 1000, pack: 'rare' },
  { essence: 200 },
];

export interface Tournament {
  id: string;
  name: string;
  fieldSize: 1 | 2 | 3;
  totalPokemon: number;
  status: 'registration' | 'active' | 'completed' | 'cancelled';
  registrationEnd: number;
  matchTimeLimit: number;
  participants: string[];
  bracket: TournamentMatch[];
  currentRound: number;
  winner?: string;
  runnerUp?: string;
  createdAt: number;
  fixedTeam: boolean;
  publicTeams: boolean;
  frozenTeams: Record<string, FrozenPokemon[]>;
  prizes: TournamentPrizes;
}

export interface TournamentSummary {
  id: string;
  name: string;
  status: Tournament['status'];
  fieldSize: number;
  totalPokemon: number;
  participantCount: number;
  registrationEnd: number;
  currentRound: number;
  winner?: string;
  fixedTeam: boolean;
  publicTeams: boolean;
  prizes: TournamentPrizes;
}
