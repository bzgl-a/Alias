import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";

import { createApp } from "./app.js";

import { LobbyRepository } from "./repositories/lobbies.repository.js";
import { TeamRepository } from "./repositories/team.repository.js";
import { LobbyService } from "./services/lobbies.service.js";
import { GameService } from "./services/game.service.js";
import { SocketService } from "./socket/socket.service.js";
import { registerGameHandlers } from "./socket/game.handlers.js";

const PORT = Number(process.env.PORT ?? 3000);

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:4200",
  },
});

const lobbyRepository = new LobbyRepository();
const teamRepository = new TeamRepository();
const lobbyService = new LobbyService(lobbyRepository, teamRepository);

const socketService = new SocketService(io, lobbyService);
const gameService = new GameService(
  teamRepository,
  lobbyRepository,
  lobbyService,
  socketService,
);

io.on("connection", socket => {
  const userId = socket.handshake.auth.userId as string;
  console.log("Socket connected:", { socketId: socket.id, userId });

  socketService.registerHandlers(socket);

  registerGameHandlers(socket, gameService);

  socket.on("disconnect", reason => {
    console.log("Socket disconnected:", {
      socketId: socket.id,
      userId,
      reason,
    });
  });
});

const app = createApp({
  lobbyService,
  gameService,
  socketService,
});

httpServer.on("request", app);

httpServer.listen(PORT, () => {
  console.log(`Backend ready at http://localhost:${PORT}`);
});
