import { Component, computed, inject, signal } from '@angular/core';

import { GameService } from '../../services/game/game.service';
import { LobbyService } from '../../services/lobby/lobby.service';
import { RoundTimerService } from '../../services/round-timer/round-timer.service';

@Component({
  selector: 'app-game-round',
  imports: [],
  templateUrl: './game-round.component.html',
  styleUrl: './game-round.component.css',
})
export class GameRoundComponent {
  private readonly lobbyService = inject(LobbyService);
  private readonly gameService = inject(GameService);
  private readonly roundTimerService = inject(RoundTimerService);

  readonly phase = this.gameService.phase;
  readonly isExplainer = this.gameService.isExplainer;
  readonly isMyTeamTurn = this.gameService.isMyTeamTurn;
  readonly isReady = this.gameService.isReady;
  readonly allTeammatesReady = this.gameService.allTeammatesReady;
  readonly word = this.gameService.word;
  readonly scores = this.gameService.scores;
  readonly lastTurnResult = this.gameService.lastTurnResult;
  readonly currentExplainerId = this.gameService.currentExplainerId;
  readonly teamMemberIds = this.gameService.teamMemberIds;
  readonly readyUserIds = this.gameService.readyUserIds;
  readonly secondsLeft = this.roundTimerService.secondsLeft;
  readonly guessedWords = this.gameService.guessedWords;
  readonly skippedWords = this.gameService.skippedWords;

  readonly targetScore = computed(
    () => this.lobbyService.currentLobby()?.targetScore ?? 0,
  );

  readonly leftTeams = computed(() =>
    this.scores().filter((_, index) => index % 2 === 0),
  );

  readonly rightTeams = computed(() =>
    this.scores().filter((_, index) => index % 2 !== 0),
  );

  readonly currentTeamName = computed(() => {
    const teamId = this.gameService.currentTeamId();
    return (
      this.lobbyService.currentLobby()?.teams.find((t) => t.id === teamId)
        ?.name ?? '—'
    );
  });

  public explainerName(): string {
    const id = this.currentExplainerId();
    return (
      this.lobbyService.currentLobby()?.members.find((m) => m.userId === id)
        ?.nickname ?? '—'
    );
  }

  public memberName(userId: string): string {
    return (
      this.lobbyService.currentLobby()?.members.find((m) => m.userId === userId)
        ?.nickname ?? '—'
    );
  }

  public isMemberReady(userId: string): boolean {
    return this.readyUserIds().includes(userId);
  }

  public toggleReady(): void {
    this.gameService.toggleReady();
  }

  public startRound(): void {
    this.gameService.startRound();
  }

  public markCorrect(): void {
    this.gameService.markCorrect();
  }

  public markSkip(): void {
    this.gameService.markSkip();
  }

  public adjustWord(word: string, newStatus: 'guessed' | 'skipped'): void {
    this.gameService.adjustWord(word, newStatus);
  }

  public confirmReview(): void {
    this.gameService.confirmReview();
  }

  public getTeamMembers(teamId: string): string[] {
    return (
      this.lobbyService
        .currentLobby()
        ?.members.filter((m) => m.teamId === teamId)
        .map((m) => m.nickname) ?? []
    );
  }
}
