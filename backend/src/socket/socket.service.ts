import type { Server, Socket } from "socket.io";
import type { LobbyService } from "../services/lobbies.service.js";

interface SocketState {
  userId: string;
  lobbyId: string;
}

export class SocketService {
  private readonly socketState = new Map<string, SocketState>();
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly io: Server,
    private readonly lobbyService: LobbyService,
  ) {}

  private getRoomName(lobbyId: string): string {
    return `lobby:${lobbyId}`;
  }

  registerHandlers(socket: Socket): void {
    const userId = socket.handshake.auth.userId as string;

    if (!userId) return;

    this.trackUserSocket(userId, socket.id);

    socket.on("lobby:join", (lobbyId: string) => {
      socket.join(this.getRoomName(lobbyId));
      this.socketState.set(socket.id, { userId, lobbyId });
    });

    socket.on("lobby:leave", (lobbyId: string) => {
      socket.leave(this.getRoomName(lobbyId));
      this.socketState.delete(socket.id);
    });

    socket.on("disconnect", async () => {
      this.untrackUserSocket(userId, socket.id);
      const state = this.socketState.get(socket.id);

      if (state) {
        this.socketState.delete(socket.id);
        try {
          const lobby = await this.lobbyService.leaveLobby(
            state.lobbyId,
            state.userId,
          );
          this.broadcastLobbyUpdated(lobby.id, lobby);
        } catch (error) {
          console.warn("Failed to clean up lobby on disconnect:", error);
        }
      }
    });
  }

  private trackUserSocket(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  private untrackUserSocket(userId: string, socketId: string): void {
    this.userSockets.get(userId)?.delete(socketId);
  }

  broadcastLobbyUpdated(lobbyId: string, state: unknown): void {
    this.io.to(this.getRoomName(lobbyId)).emit("lobby:updated", state);
  }

  broadcastGameEvent(lobbyId: string, event: string, payload: unknown): void {
    this.io.to(this.getRoomName(lobbyId)).emit(event, payload);
  }

  sendToUser(userId: string, event: string, payload: unknown): void {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds) return;

    for (const socketId of socketIds) {
      this.io.to(socketId).emit(event, payload);
    }
  }
}
