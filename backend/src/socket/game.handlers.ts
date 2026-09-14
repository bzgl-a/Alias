import type { Socket } from "socket.io";
import type { GameService } from "../services/game.service.js";

export function registerGameHandlers(
  socket: Socket,
  gameService: GameService,
): void {
  const userId = socket.handshake.auth.userId as string;

  if (!userId) return;

  socket.on("game:toggleReady", (lobbyId: string) => {
    gameService.toggleReady(lobbyId, userId);
  });

  socket.on("game:startRound", (lobbyId: string) => {
    gameService.startRound(lobbyId, userId);
  });

  socket.on("game:correct", async (lobbyId: string) => {
    try {
      await gameService.markCorrect(lobbyId, userId);
    } catch (err) {
      console.error("Error marking correct:", err);
      socket.emit("error", { message: "Ошибка при засчитывании слова" });
    }
  });

  socket.on("game:skip", (lobbyId: string) => {
    gameService.markSkip(lobbyId, userId);
  });

  socket.on(
    "game:adjustWord",
    (lobbyId: string, word: string, newStatus: "guessed" | "skipped") => {
      void gameService.adjustWord(lobbyId, userId, word, newStatus);
    },
  );

  socket.on("game:confirmReview", (lobbyId: string) => {
    void gameService.confirmReview(lobbyId, userId);
  });
}
