import type { TeamRepository } from "../repositories/team.repository.js";
import type { LobbyRepository } from "../repositories/lobbies.repository.js";
import type { LobbyService } from "./lobbies.service.js";
import { AppError } from "../errors/AppError.js";
import { GameEngine, type GameTeam } from "../game/gameEngine.js";
import type { SocketService } from "../socket/socket.service.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import { ForbiddenError } from "../errors/ForbiddenError.js";

interface TeamScore {
  id: string;
  name: string;
  score: number;
}

interface ActiveGame {
  engine: GameEngine;
  scores: Map<string, TeamScore>;
  targetScore: number;
  teamOrder: string[];
}

export class GameService {
  private readonly activeGames = new Map<string, ActiveGame>();

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly lobbyRepository: LobbyRepository,
    private readonly lobbyService: LobbyService,
    private readonly socketService: SocketService,
  ) {}

  async startGame(lobbyId: string, hostId: string): Promise<void> {
    const lobby = await this.lobbyRepository.findById(lobbyId);
    if (!lobby) throw new NotFoundError("Lobby not found");
    if (lobby.hostId !== hostId)
      throw new ForbiddenError("Only host can start");
    if (this.activeGames.has(lobbyId))
      throw new ForbiddenError("Game already in progress");

    const teams = await this.teamRepository.findTeamsWithMembers(lobbyId);
    if (teams.length < 2) throw new ForbiddenError("Need at least 2 teams");
    if (teams.some(t => t.memberIds.length === 0))
      throw new ForbiddenError("Empty teams not allowed");

    await this.teamRepository.resetScores(lobbyId);

    const engineTeams: GameTeam[] = teams.map(t => ({
      id: t.id,
      memberIds: t.memberIds,
    }));
    const engine = new GameEngine(engineTeams, lobby.roundSeconds);

    const scores = new Map<string, TeamScore>(
      teams.map(t => [t.id, { id: t.id, name: t.name, score: 0 }]),
    );

    const teamOrder = teams.map(t => t.id);

    engine.on("turn:waiting", payload => {
      this.socketService.broadcastGameEvent(lobbyId, "game:turnWaiting", {
        ...payload,
        scores: Array.from(scores.values()),
      });
    });

    engine.on("turn:readyUpdate", payload => {
      this.socketService.broadcastGameEvent(
        lobbyId,
        "game:readyUpdate",
        payload,
      );
    });

    engine.on("turn:started", payload => {
      this.socketService.broadcastGameEvent(
        lobbyId,
        "game:turnStarted",
        payload,
      );
    });

    engine.on("word", payload => {
      this.socketService.sendToUser(payload.explainerId, "game:word", {
        word: payload.word,
      });
    });

    engine.on("turn:review", payload => {
      this.socketService.broadcastGameEvent(lobbyId, "game:turnReview", {
        teamId: payload.teamId,
        explainerId: payload.explainerId,
        guessedWords: payload.guessedWords,
        skippedWords: payload.skippedWords,
        scores: Array.from(scores.values()),
      });
    });

    engine.on("turn:ended", async payload => {
      this.socketService.broadcastGameEvent(lobbyId, "game:turnEnded", payload);

      const game = this.activeGames.get(lobbyId);
      if (!game) return;

      const lastTeamInRound = game.teamOrder[game.teamOrder.length - 1];

      if (payload.teamId === lastTeamInRound) {
        const hasWinner = Array.from(game.scores.values()).some(
          s => s.score >= game.targetScore,
        );

        if (hasWinner) {
          await this.finishGame(lobbyId);
        }
      }
    });

    this.activeGames.set(lobbyId, {
      engine,
      scores,
      targetScore: lobby.targetScore,
      teamOrder,
    });

    await this.lobbyRepository.setStatus(lobbyId, "in_progress");
    engine.start();
  }

  toggleReady(lobbyId: string, userId: string): void {
    this.activeGames.get(lobbyId)?.engine.toggleReady(userId);
  }

  startRound(lobbyId: string, userId: string): boolean {
    const game = this.activeGames.get(lobbyId);
    if (!game) return false;
    return game.engine.startRound(userId);
  }

  async markCorrect(lobbyId: string, userId: string): Promise<void> {
    const game = this.activeGames.get(lobbyId);
    if (!game) return;

    const turn = game.engine.getCurrentTurn();
    if (!turn || turn.phase !== "active" || turn.explainerId !== userId) return;

    const teamScore = game.scores.get(turn.teamId);
    if (!teamScore) return;

    game.engine.markCorrect();
    teamScore.score += 1;

    this.socketService.broadcastGameEvent(lobbyId, "game:wordsUpdate", {
      guessedWords: [...turn.guessedWords],
      skippedWords: [...turn.skippedWords],
    });

    this.socketService.broadcastGameEvent(lobbyId, "game:scoreUpdated", {
      scores: Array.from(game.scores.values()),
    });

    await this.teamRepository.incrementScore(turn.teamId, 1);
  }

  markSkip(lobbyId: string, userId: string): void {
    const game = this.activeGames.get(lobbyId);
    if (!game) return;

    const turn = game.engine.getCurrentTurn();
    if (turn?.phase === "active" && turn.explainerId === userId) {
      game.engine.markSkip();

      this.socketService.broadcastGameEvent(lobbyId, "game:wordsUpdate", {
        guessedWords: [...turn.guessedWords],
        skippedWords: [...turn.skippedWords],
      });
    }
  }

  async adjustWord(
    lobbyId: string,
    userId: string,
    word: string,
    newStatus: "guessed" | "skipped",
  ): Promise<void> {
    const game = this.activeGames.get(lobbyId);
    if (!game) return;

    const turn = game.engine.getCurrentTurn();
    if (!turn || turn.phase !== "review" || turn.explainerId !== userId) return;

    const teamScore = game.scores.get(turn.teamId);
    if (!teamScore) return;

    const adjusted = game.engine.adjustWord(userId, word, newStatus);
    if (!adjusted) return;

    const delta = newStatus === "guessed" ? 1 : -1;
    teamScore.score += delta;

    this.socketService.broadcastGameEvent(lobbyId, "game:scoreUpdated", {
      scores: Array.from(game.scores.values()),
    });

    await this.teamRepository.incrementScore(turn.teamId, delta);

    this.socketService.broadcastGameEvent(lobbyId, "game:turnReview", {
      teamId: turn.teamId,
      explainerId: turn.explainerId,
      guessedWords: turn.guessedWords,
      skippedWords: turn.skippedWords,
      scores: Array.from(game.scores.values()),
    });
  }

  async confirmReview(lobbyId: string, userId: string): Promise<void> {
    const game = this.activeGames.get(lobbyId);
    if (!game) return;

    game.engine.confirmReview(userId);
  }

  async stopGame(lobbyId: string): Promise<void> {
    const game = this.activeGames.get(lobbyId);
    if (!game) return;

    game.engine.stop();
    this.activeGames.delete(lobbyId);

    await this.lobbyRepository.setStatus(lobbyId, "waiting");
    const lobbyState = await this.lobbyService.getLobbyState(lobbyId);
    this.socketService.broadcastLobbyUpdated(lobbyId, lobbyState);
  }

  private async finishGame(lobbyId: string): Promise<void> {
    const game = this.activeGames.get(lobbyId);
    if (!game) return;

    game.engine.stop();
    this.activeGames.delete(lobbyId);

    const finalScores = Array.from(game.scores.values());

    if (finalScores.length === 0) {
      throw new AppError("Cannot finish game: no teams found");
    }

    finalScores.sort((a, b) => b.score - a.score);
    const winnerTeamId = finalScores[0]!.id;

    await this.lobbyRepository.setStatus(lobbyId, "finished");

    this.socketService.broadcastGameEvent(lobbyId, "game:finished", {
      scores: finalScores,
      winnerTeamId,
    });

    const lobbyState = await this.lobbyService.getLobbyState(lobbyId);
    this.socketService.broadcastLobbyUpdated(lobbyId, lobbyState);
  }
}
