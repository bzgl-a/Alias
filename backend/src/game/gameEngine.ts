import { EventEmitter } from "node:events";
import { WORD_DICTIONARY } from "./words.js";

export interface GameTeam {
  id: string;
  memberIds: string[];
}

type TurnPhase = "waiting" | "active" | "review";

interface TurnState {
  phase: TurnPhase;
  teamId: string;
  explainerId: string;
  teamMemberIds: string[];
  readyUserIds: Set<string>;
  word: string | null;
  endsAt: number | null;
  guessedWords: string[];
  skippedWords: string[];
}

export interface TurnWaitingPayload {
  teamId: string;
  explainerId: string;
  teamMemberIds: string[];
  readyUserIds: string[];
}

export interface TurnStartedPayload {
  teamId: string;
  explainerId: string;
  endsAt: number;
}

export interface TurnReviewPayload {
  teamId: string;
  explainerId: string;
  guessedWords: string[];
  skippedWords: string[];
}

export interface TurnEndedPayload {
  teamId: string;
  explainerId: string;
  guessed: number;
  skipped: number;
}

export declare interface GameEngine {
  on(
    event: "turn:waiting",
    listener: (payload: TurnWaitingPayload) => void,
  ): this;
  on(
    event: "turn:readyUpdate",
    listener: (payload: { readyUserIds: string[] }) => void,
  ): this;
  on(
    event: "turn:started",
    listener: (payload: TurnStartedPayload) => void,
  ): this;
  on(
    event: "word",
    listener: (payload: { explainerId: string; word: string }) => void,
  ): this;
  on(
    event: "turn:review",
    listener: (payload: TurnReviewPayload) => void,
  ): this;
  on(event: "turn:ended", listener: (payload: TurnEndedPayload) => void): this;
}

export class GameEngine extends EventEmitter {
  private teamIndex = 0;
  private readonly explainerIndexByTeam = new Map<string, number>();
  private readonly usedWords = new Set<string>();
  private turn: TurnState | null = null;
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;

  constructor(
    private readonly teams: GameTeam[],
    private readonly roundSeconds: number,
  ) {
    super();

    if (teams.length < 2) {
      throw new Error("Need at least 2 teams to start a game");
    }

    for (const team of teams) {
      if (team.memberIds.length === 0) {
        throw new Error(`Team ${team.id} has no members`);
      }
    }
  }

  start(): void {
    this.stopped = false;
    this.prepareNextTurn();
  }

  stop(): void {
    this.stopped = true;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  getCurrentTurn(): TurnState | null {
    return this.turn;
  }

  toggleReady(userId: string): void {
    if (!this.turn || this.turn.phase !== "waiting") return;
    if (!this.turn.teamMemberIds.includes(userId)) return;
    if (userId === this.turn.explainerId) return;

    if (this.turn.readyUserIds.has(userId)) {
      this.turn.readyUserIds.delete(userId);
    } else {
      this.turn.readyUserIds.add(userId);
    }

    this.emit("turn:readyUpdate", {
      readyUserIds: Array.from(this.turn.readyUserIds),
    });
  }

  private isTeamReady(): boolean {
    if (!this.turn) return false;

    const requiredIds = this.turn.teamMemberIds.filter(
      id => id !== this.turn!.explainerId,
    );

    if (requiredIds.length === 0) return true;

    return requiredIds.every(id => this.turn!.readyUserIds.has(id));
  }

  startRound(userId: string): boolean {
    if (!this.turn || this.turn.phase !== "waiting") return false;
    if (userId !== this.turn.explainerId) return false;
    if (!this.isTeamReady()) return false;

    const word = this.pickWord();
    const endsAt = Date.now() + this.roundSeconds * 1000;

    this.turn.phase = "active";
    this.turn.word = word;
    this.turn.endsAt = endsAt;
    this.turn.guessedWords = [];
    this.turn.skippedWords = [];

    this.emit("turn:started", {
      teamId: this.turn.teamId,
      explainerId: this.turn.explainerId,
      endsAt,
    });

    this.emit("word", { explainerId: this.turn.explainerId, word });

    this.timer = setTimeout(() => this.endTurn(), this.roundSeconds * 1000);

    return true;
  }

  markCorrect(): void {
    if (!this.turn || this.turn.phase !== "active") return;

    this.usedWords.add(this.turn.word!);
    this.turn.guessedWords.push(this.turn.word!);
    this.nextWord();
  }

  markSkip(): void {
    if (!this.turn || this.turn.phase !== "active") return;

    this.usedWords.add(this.turn.word!);
    this.turn.skippedWords.push(this.turn.word!);
    this.nextWord();
  }

  adjustWord(
    userId: string,
    word: string,
    newStatus: "guessed" | "skipped",
  ): boolean {
    if (!this.turn || this.turn.phase !== "review") return false;
    if (userId !== this.turn.explainerId) return false;

    const guessedIdx = this.turn.guessedWords.indexOf(word);
    const skippedIdx = this.turn.skippedWords.indexOf(word);

    if (newStatus === "guessed") {
      if (skippedIdx === -1) return false;
      this.turn.skippedWords.splice(skippedIdx, 1);
      this.turn.guessedWords.push(word);
      return true;
    } else {
      if (guessedIdx === -1) return false;
      this.turn.guessedWords.splice(guessedIdx, 1);
      this.turn.skippedWords.push(word);
      return true;
    }
  }

  confirmReview(userId: string): boolean {
    if (!this.turn || this.turn.phase !== "review") return false;
    if (userId !== this.turn.explainerId) return false;

    const { teamId, explainerId, guessedWords, skippedWords } = this.turn;

    this.turn = null;
    this.teamIndex = (this.teamIndex + 1) % this.teams.length;

    this.emit("turn:ended", {
      teamId,
      explainerId,
      guessed: guessedWords.length,
      skipped: skippedWords.length,
    });

    this.prepareNextTurn();
    return true;
  }

  private pickWord(): string {
    const available = WORD_DICTIONARY.filter(word => !this.usedWords.has(word));
    const pool = available.length > 0 ? available : WORD_DICTIONARY;

    if (available.length === 0) {
      this.usedWords.clear();
    }

    return pool[Math.floor(Math.random() * pool.length)]!;
  }

  private nextWord(): void {
    if (!this.turn || this.turn.phase !== "active") return;

    const word = this.pickWord();
    this.turn.word = word;

    this.emit("word", { explainerId: this.turn.explainerId, word });
  }

  private prepareNextTurn(): void {
    if (this.stopped) return;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const team = this.teams[this.teamIndex]!;
    const currentIdx = this.explainerIndexByTeam.get(team.id) ?? -1;
    const nextIdx = (currentIdx + 1) % team.memberIds.length;
    this.explainerIndexByTeam.set(team.id, nextIdx);

    const explainerId = team.memberIds[nextIdx]!;

    this.turn = {
      phase: "waiting",
      teamId: team.id,
      explainerId,
      teamMemberIds: team.memberIds,
      readyUserIds: new Set(),
      word: null,
      endsAt: null,
      guessedWords: [],
      skippedWords: [],
    };

    this.emit("turn:waiting", {
      teamId: team.id,
      explainerId,
      teamMemberIds: team.memberIds,
      readyUserIds: [],
    });
  }

  private endTurn(): void {
    if (!this.turn || this.turn.phase !== "active" || this.stopped) return;

    const { teamId, explainerId, guessedWords, skippedWords } = this.turn;

    this.turn.phase = "review";

    this.emit("turn:review", {
      teamId,
      explainerId,
      guessedWords: [...guessedWords],
      skippedWords: [...skippedWords],
    });
  }
}
