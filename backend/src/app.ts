import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cors from "cors";

import { UserRepository } from "./repositories/users.repository.js";
import { UserService } from "./services/users.service.js";

import type { LobbyService } from "./services/lobbies.service.js";
import type { GameService } from "./services/game.service.js";

import { setupUserRoutes } from "./routes/users.routes.js";
import { setupLobbyRoutes } from "./routes/lobbies.routes.js";

import { errorHandler } from "./middleware/errorHandler.js";
import type { SocketService } from "./socket/socket.service.js";

interface AppDependencies {
  lobbyService: LobbyService;
  gameService: GameService;
  socketService: SocketService;
}

export function createApp({
  lobbyService,
  gameService,
  socketService,
}: AppDependencies): Application {
  const app = express();

  app.use(
    cors({
      origin: "http://localhost:4200",
    }),
  );

  app.use(express.json());

  const userRepository = new UserRepository();
  const userService = new UserService(userRepository);

  setupUserRoutes(app, userService);
  setupLobbyRoutes(app, lobbyService, socketService, gameService);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use((_req, res) => {
    res.status(404).json({
      error: "Not found",
    });
  });

  app.use(errorHandler);

  return app;
}
