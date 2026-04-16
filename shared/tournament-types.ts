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
}

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
  createdAt: number;
  fixedTeam: boolean;
  frozenTeams: Record<string, FrozenPokemon[]>;
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
}
