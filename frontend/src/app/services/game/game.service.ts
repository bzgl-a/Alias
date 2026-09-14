import { Injectable, inject, signal, computed } from '@angular/core';

import { LobbyService } from '../lobby/lobby.service';
import { SocketService } from '../socket/socket.service';
import { UserService } from '../user/user.service';
import {
  GameFinishedPayload,
  ReadyUpdatePayload,
  ScoreUpdatedPayload,
  TeamScore,
  TurnEndedPayload,
  TurnPhase,
  TurnReviewPayload,
  TurnStartedPayload,
  TurnWaitingPayload,
  WordPayload,
  WordsUpdatePayload,
} from '../../models/model';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private readonly socketService = inject(SocketService);
  private readonly userService = inject(UserService);
  private readonly lobbyService = inject(LobbyService);

  readonly phase = signal<TurnPhase | null>(null);
  readonly currentTeamId = signal<string | null>(null);
  readonly currentExplainerId = signal<string | null>(null);
  readonly teamMemberIds = signal<string[]>([]);
  readonly readyUserIds = signal<string[]>([]);
  readonly endsAt = signal<number | null>(null);
  readonly scores = signal<TeamScore[]>([]);
  readonly word = signal<string | null>(null);

  readonly guessedWords = signal<string[]>([]);
  readonly skippedWords = signal<string[]>([]);

  readonly lastTurnResult = signal<{ guessed: number; skipped: number } | null>(
    null,
  );
  readonly winnerTeamId = signal<string | null>(null);

  readonly isExplainer = computed(
    () => this.currentExplainerId() === this.userService.currentUser()?.id,
  );

  readonly isMyTeamTurn = computed(() => {
    const userId = this.userService.currentUser()?.id;
    return !!userId && this.teamMemberIds().includes(userId);
  });

  readonly isReady = computed(() => {
    const userId = this.userService.currentUser()?.id;
    return !!userId && this.readyUserIds().includes(userId);
  });

  readonly allTeammatesReady = computed(() => {
    const explainerId = this.currentExplainerId();
    const required = this.teamMemberIds().filter((id) => id !== explainerId);

    if (required.length === 0) return true;

    const ready = new Set(this.readyUserIds());
    return required.every((id) => ready.has(id));
  });

  constructor() {
    this.socketService
      .on<TurnWaitingPayload>('game:turnWaiting')
      .subscribe((payload) => {
        this.phase.set('waiting');
        this.currentTeamId.set(payload.teamId);
        this.currentExplainerId.set(payload.explainerId);
        this.teamMemberIds.set(payload.teamMemberIds);
        this.readyUserIds.set(payload.readyUserIds);
        this.scores.set(payload.scores);
        this.endsAt.set(null);
        this.word.set(null);
        this.guessedWords.set([]);
        this.skippedWords.set([]);
        this.winnerTeamId.set(null);
      });

    this.socketService
      .on<ReadyUpdatePayload>('game:readyUpdate')
      .subscribe((payload) => {
        this.readyUserIds.set(payload.readyUserIds);
      });

    this.socketService
      .on<TurnStartedPayload>('game:turnStarted')
      .subscribe((payload) => {
        this.phase.set('active');
        this.currentTeamId.set(payload.teamId);
        this.currentExplainerId.set(payload.explainerId);
        this.endsAt.set(payload.endsAt);
        this.lastTurnResult.set(null);
        this.guessedWords.set([]);
        this.skippedWords.set([]);
      });

    this.socketService.on<WordPayload>('game:word').subscribe((payload) => {
      this.word.set(payload.word);
    });

    this.socketService
      .on<WordsUpdatePayload>('game:wordsUpdate')
      .subscribe((payload) => {
        this.guessedWords.set(payload.guessedWords);
        this.skippedWords.set(payload.skippedWords);
      });

    this.socketService
      .on<TurnReviewPayload>('game:turnReview')
      .subscribe((payload) => {
        this.phase.set('review');
        this.currentTeamId.set(payload.teamId);
        this.currentExplainerId.set(payload.explainerId);
        this.guessedWords.set(payload.guessedWords);
        this.skippedWords.set(payload.skippedWords);
        this.scores.set(payload.scores);
        this.word.set(null);
        this.endsAt.set(null);
      });

    this.socketService
      .on<TurnEndedPayload>('game:turnEnded')
      .subscribe((payload) => {
        this.lastTurnResult.set({
          guessed: payload.guessed,
          skipped: payload.skipped,
        });
        this.word.set(null);
        this.endsAt.set(null);
        this.guessedWords.set([]);
        this.skippedWords.set([]);
      });

    this.socketService
      .on<ScoreUpdatedPayload>('game:scoreUpdated')
      .subscribe((payload) => {
        this.scores.set(payload.scores);
      });

    this.socketService
      .on<GameFinishedPayload>('game:finished')
      .subscribe((payload) => {
        this.scores.set(payload.scores);
        this.winnerTeamId.set(payload.winnerTeamId);
        this.word.set(null);
        this.endsAt.set(null);
        this.guessedWords.set([]);
        this.skippedWords.set([]);
        this.phase.set(null);
      });
  }

  toggleReady(): void {
    const lobbyId = this.lobbyService.currentLobby()?.id;
    if (!lobbyId) return;
    this.socketService.emit('game:toggleReady', lobbyId);
  }

  startRound(): void {
    const lobbyId = this.lobbyService.currentLobby()?.id;
    if (!lobbyId) return;
    this.socketService.emit('game:startRound', lobbyId);
  }

  markCorrect(): void {
    const lobbyId = this.lobbyService.currentLobby()?.id;
    if (!lobbyId) return;
    this.socketService.emit('game:correct', lobbyId);
  }

  markSkip(): void {
    const lobbyId = this.lobbyService.currentLobby()?.id;
    if (!lobbyId) return;
    this.socketService.emit('game:skip', lobbyId);
  }

  adjustWord(word: string, newStatus: 'guessed' | 'skipped'): void {
    const lobbyId = this.lobbyService.currentLobby()?.id;
    if (!lobbyId) return;
    this.socketService.emit('game:adjustWord', lobbyId, word, newStatus);
  }

  confirmReview(): void {
    const lobbyId = this.lobbyService.currentLobby()?.id;
    if (!lobbyId) return;
    this.socketService.emit('game:confirmReview', lobbyId);
  }

  reset(): void {
    this.phase.set(null);
    this.currentTeamId.set(null);
    this.currentExplainerId.set(null);
    this.teamMemberIds.set([]);
    this.readyUserIds.set([]);
    this.endsAt.set(null);
    this.scores.set([]);
    this.word.set(null);
    this.guessedWords.set([]);
    this.skippedWords.set([]);
    this.lastTurnResult.set(null);
    this.winnerTeamId.set(null);
  }
}
