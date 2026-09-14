import express, {
  type Application,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import type { LobbyService } from "../services/lobbies.service.js";
import type { SocketService } from "../socket/socket.service.js";
import { ValidationError } from "../errors/ValidationError.js";
import type { GameService } from "../services/game.service.js";

export function setupLobbyRoutes(
  app: Application,
  lobbyService: LobbyService,
  socketService: SocketService,
  gameService: GameService,
): void {
  const router = express.Router();

  router.post("/", createLobby);
  router.post("/join", joinLobby);
  router.get("/:id", getLobbyById);
  router.post("/:id/leave", leaveLobbyByUserId);
  router.patch("/:id/ready", changeReadyByUserId);
  router.post("/:id/teams", createTeam);
  router.patch("/:id/members/:userId/team", assignTeam);
  router.delete("/:id/teams/:teamId", deleteTeam);
  router.post("/:id/reset", resetLobby);
  router.post("/:id/game/start", startGame);

  // +
  async function createLobby(req: Request, res: Response, next: NextFunction) {
    try {
      const { hostId } = req.body;

      if (typeof hostId !== "string") {
        throw new ValidationError("HostId is required");
      }

      const lobby = await lobbyService.createLobby(hostId);

      res.status(201).json(lobby);
    } catch (err) {
      next(err);
    }
  }

  // +
  async function joinLobby(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, userId } = req.body;

      if (typeof code !== "string" || typeof userId !== "string") {
        throw new ValidationError("code and userId are required");
      }

      const lobby = await lobbyService.joinLobby(code, userId);

      socketService.broadcastLobbyUpdated(lobby.id, lobby);

      res.json(lobby);
    } catch (err) {
      next(err);
    }
  }

  async function getLobbyById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (typeof id !== "string") {
        throw new ValidationError("Invalid user id");
      }

      const lobby = await lobbyService.getLobbyState(id);
      res.json(lobby);
    } catch (err) {
      next(err);
    }
  }

  // +
  async function leaveLobbyByUserId(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (typeof id !== "string") {
        throw new ValidationError("Invalid lobby id");
      }

      if (typeof userId !== "string") {
        throw new ValidationError("User id is required");
      }

      const lobby = await lobbyService.leaveLobby(id, userId);

      socketService.broadcastLobbyUpdated(lobby.id, lobby);

      res.json(lobby);
    } catch (err) {
      next(err);
    }
  }

  // +
  async function changeReadyByUserId(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const { userId, isReady } = req.body;

      if (typeof id !== "string") {
        throw new ValidationError("Invalid lobby id");
      }

      if (typeof userId !== "string" || typeof isReady !== "boolean") {
        throw new ValidationError("UserId and isReady are required");
      }

      const lobby = await lobbyService.setReady(id, userId, isReady);

      socketService.broadcastLobbyUpdated(lobby.id, lobby);

      res.json(lobby);
    } catch (err) {
      next(err);
    }
  }

  // +
  async function createTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, hostId } = req.body;

      if (typeof id !== "string") {
        throw new ValidationError("Invalid lobby id");
      }

      if (typeof name !== "string" || !name.trim()) {
        throw new ValidationError("name is required");
      }

      if (typeof hostId !== "string") {
        throw new ValidationError("hostId is required");
      }

      const lobby = await lobbyService.createTeam(id, hostId, name.trim());

      socketService.broadcastLobbyUpdated(lobby.id, lobby);

      res.status(201).json(lobby);
    } catch (err) {
      next(err);
    }
  }

  // +
  async function assignTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, userId } = req.params;
      const { teamId } = req.body;

      if (typeof id !== "string" || typeof userId !== "string") {
        throw new ValidationError("Invalid lobby or user id");
      }

      if (teamId !== null && typeof teamId !== "string") {
        throw new ValidationError("teamId must be a string or null");
      }

      const lobby = await lobbyService.assignTeam(id, userId, teamId);

      socketService.broadcastLobbyUpdated(lobby.id, lobby);

      res.json(lobby);
    } catch (err) {
      next(err);
    }
  }

  // +
  async function deleteTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, teamId } = req.params;
      const { hostId } = req.body;

      if (typeof id !== "string" || typeof teamId !== "string") {
        throw new ValidationError("Invalid lobby or team id");
      }

      if (typeof hostId !== "string") {
        throw new ValidationError("hostId is required");
      }

      const lobby = await lobbyService.deleteTeam(id, hostId, teamId);

      socketService.broadcastLobbyUpdated(lobby.id, lobby);

      res.json(lobby);
    } catch (err) {
      next(err);
    }
  }

  // +
  async function resetLobby(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { hostId } = req.body;

      if (typeof id !== "string") {
        throw new ValidationError("Invalid lobby id");
      }

      if (typeof hostId !== "string") {
        throw new ValidationError("hostId is required");
      }

      const lobby = await lobbyService.resetToWaiting(id, hostId);

      socketService.broadcastLobbyUpdated(lobby.id, lobby);

      res.json(lobby);
    } catch (err) {
      next(err);
    }
  }

  async function startGame(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { hostId } = req.body;

      if (typeof id !== "string") {
        throw new ValidationError("Invalid lobby id");
      }

      if (typeof hostId !== "string") {
        throw new ValidationError("hostId is required");
      }

      await gameService.startGame(id, hostId);

      const lobby = await lobbyService.getLobbyState(id);

      socketService.broadcastLobbyUpdated(lobby.id, lobby);

      res.status(200).json(lobby);
    } catch (err) {
      next(err);
    }
  }

  app.use("/api/lobbies", router);
}
