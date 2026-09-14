export interface User {
  id: string;
  nickname: string;
  createdAt: string;
}

export interface LobbyMember {
  userId: string;
  nickname: string;
  isReady: boolean;
  teamId: string | null;
  joinedAt: string;
}

export interface Team {
  id: string;
  lobbyId: string;
  name: string;
  score: number;
  createdAt: string;
}

export type LobbyStatus = 'waiting' | 'in_progress' | 'finished';

export interface Lobby {
  id: string;
  code: string;
  hostId: string;
  status: LobbyStatus;
  roundSeconds: number;
  targetScore: number;
  createdAt: string;
  members: LobbyMember[];
  teams: Team[];
}

export interface TeamScore {
  id: string;
  name: string;
  score: number;
}

export type TurnPhase = 'waiting' | 'active' | 'review';

export interface TurnWaitingPayload {
  teamId: string;
  explainerId: string;
  teamMemberIds: string[];
  readyUserIds: string[];
  scores: TeamScore[];
}

export interface ReadyUpdatePayload {
  readyUserIds: string[];
}

export interface TurnStartedPayload {
  teamId: string;
  explainerId: string;
  endsAt: number;
}

export interface WordPayload {
  word: string;
}

export interface TurnReviewPayload {
  teamId: string;
  explainerId: string;
  guessedWords: string[];
  skippedWords: string[];
  scores: TeamScore[];
}

export interface TurnEndedPayload {
  teamId: string;
  explainerId: string;
  guessed: number;
  skipped: number;
}

export interface ScoreUpdatedPayload {
  scores: TeamScore[];
}

export interface GameFinishedPayload {
  scores: TeamScore[];
  winnerTeamId: string;
}

export interface WordsUpdatePayload {
  guessedWords: string[];
  skippedWords: string[];
}
