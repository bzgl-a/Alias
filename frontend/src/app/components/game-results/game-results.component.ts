import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../../services/game/game.service';
import { LobbyService } from '../../services/lobby/lobby.service';
import { UserService } from '../../services/user/user.service';
import { ToastService } from '../../services/toast/toast.service';

@Component({
  selector: 'app-game-results',
  imports: [],
  templateUrl: './game-results.component.html',
  styleUrl: './game-results.component.css',
})
export class GameResultsComponent {
  private readonly router = inject(Router);
  private readonly lobbyService = inject(LobbyService);
  private readonly userService = inject(UserService);
  private readonly gameService = inject(GameService);
  private readonly toastService = inject(ToastService);

  readonly scores = this.gameService.scores;

  readonly winnerTeamId = this.gameService.winnerTeamId;

  readonly isHost = computed(() => {
    const lobby = this.lobbyService.currentLobby();
    const user = this.userService.currentUser();

    return !!lobby && !!user && lobby.hostId === user.id;
  });

  playAgain(): void {
    this.lobbyService.playAgain().subscribe({
      next: () => this.gameService.reset(),
      error: () => {
        this.toastService.danger('Не удалось запустить игру');
      },
    });
  }

  leaveLobby(): void {
    this.gameService.reset();

    this.lobbyService.leaveLobby().subscribe({
      next: () => this.router.navigate(['/hub']),
      error: () => {
        this.toastService.danger('Не удалось покинуть лобби');
      },
    });
  }
}
