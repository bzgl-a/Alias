import {
  Component,
  computed,
  effect,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { GameRoundComponent } from '../game-round/game-round.component';
import { GameResultsComponent } from '../game-results/game-results.component';
import { LobbyService } from '../../services/lobby/lobby.service';
import { UserService } from '../../services/user/user.service';
import { SocketService } from '../../services/socket/socket.service';
import { ToastService } from '../../services/toast/toast.service';

@Component({
  selector: 'app-lobby',
  imports: [GameRoundComponent, GameResultsComponent],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.css',
})
export class LobbyComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly lobbyService = inject(LobbyService);
  private readonly userService = inject(UserService);
  private readonly socketService = inject(SocketService);
  private readonly toastService = inject(ToastService);

  readonly currentUser = this.userService.currentUser;
  readonly currentLobby = this.lobbyService.currentLobby;

  readonly newTeamName = signal('');
  readonly isJoining = signal(false);

  private readonly hasLeftLobby = signal(false);

  readonly editingTeamId = signal<string | null>(null);
  readonly editingTeamName = signal('');

  private readonly roundSecondsDraft = signal<number | null>(null);
  private readonly targetScoreDraft = signal<number | null>(null);

  readonly displayRoundSeconds = computed(
    () => this.roundSecondsDraft() ?? this.currentLobby()?.roundSeconds ?? 60,
  );

  readonly displayTargetScore = computed(
    () => this.targetScoreDraft() ?? this.currentLobby()?.targetScore ?? 30,
  );

  readonly isMember = computed(() => {
    const lobby = this.currentLobby();
    const userId = this.currentUser()?.id;

    if (!lobby || !userId) return false;

    return lobby.members.some((m) => m.userId === userId);
  });

  readonly isWaiting = computed(
    () => this.currentLobby()?.status === 'waiting',
  );

  readonly isInProgress = computed(
    () => this.currentLobby()?.status === 'in_progress',
  );

  readonly isFinished = computed(
    () => this.currentLobby()?.status === 'finished',
  );

  readonly readyPlayersCount = computed(() => {
    return (
      this.currentLobby()?.members.filter((player) => player.isReady).length ??
      0
    );
  });

  readonly allPlayersReady = computed(() => {
    const members = this.currentLobby()?.members ?? [];

    return members.length > 0 && members.every((player) => player.isReady);
  });

  readonly isHost = computed(() => {
    const lobby = this.currentLobby();
    const user = this.currentUser();

    return !!(lobby && user && lobby.hostId === user.id);
  });

  readonly isCurrentUserReady = computed(() => {
    const lobby = this.currentLobby();
    const userId = this.currentUser()?.id;

    if (!lobby || !userId) return false;

    return (
      lobby.members.find((member) => member.userId === userId)?.isReady ?? false
    );
  });

  readonly myTeamId = computed(() => {
    const lobby = this.currentLobby();
    const userId = this.currentUser()?.id;

    if (!lobby || !userId) return null;

    return lobby.members.find((m) => m.userId === userId)?.teamId ?? null;
  });

  readonly unassignedMembers = computed(() => {
    return this.currentLobby()?.members.filter((m) => !m.teamId) ?? [];
  });

  readonly canStartGame = computed(() => {
    const lobby = this.currentLobby();

    if (!lobby || lobby.teams.length < 2) return false;

    return lobby.teams.every((team) =>
      lobby.members.some((m) => m.teamId === team.id),
    );
  });

  constructor() {
    effect(() => {
      const connected = this.socketService.connected();
      const lobby = this.currentLobby();
      const member = this.isMember();

      if (
        connected &&
        lobby &&
        !member &&
        !this.hasLeftLobby() &&
        !this.isJoining()
      ) {
        this.joinCurrentLobby();
      }
    });
  }

  ngOnInit(): void {
    const lobbyId = this.route.snapshot.paramMap.get('id');

    if (!lobbyId) {
      this.router.navigate(['/hub']);
      return;
    }

    if (!this.currentLobby()) {
      this.lobbyService.fetchLobby(lobbyId).subscribe({
        next: () => {},
        error: () => {
          this.toastService.danger('Не удалось найти лобби');
          this.router.navigate(['/hub']);
        },
      });
    }
  }

  public joinCurrentLobby(): void {
    const lobby = this.currentLobby();

    if (!lobby?.code || this.isJoining() || this.hasLeftLobby()) {
      return;
    }

    this.isJoining.set(true);

    this.lobbyService.joinLobby(lobby.code).subscribe({
      next: () => {
        this.isJoining.set(false);
      },
      error: () => {
        this.isJoining.set(false);
        this.toastService.danger('Не удалось подключиться к лобби');
      },
    });
  }

  public leaveLobby(): void {
    this.hasLeftLobby.set(true);

    this.lobbyService.leaveLobby().subscribe({
      next: () => {
        this.router.navigate(['/hub']);
      },
      error: () => {
        this.hasLeftLobby.set(false);

        this.toastService.danger('Ошибка при выходе из лобби');
      },
    });
  }

  public toggleReady(): void {
    const lobby = this.currentLobby();
    const userId = this.currentUser()?.id;

    if (!lobby || !userId) return;

    const me = lobby.members.find((member) => member.userId === userId);
    const nextReady = !me?.isReady;

    this.lobbyService.setReady(nextReady).subscribe({
      next: () => {},
      error: () => {
        this.toastService.danger('Не удалось сменить готовность');
      },
    });
  }

  public isMe(userId: string): boolean {
    return this.currentUser()?.id === userId;
  }

  public copyCode(): void {
    const code = this.currentLobby()?.code;

    if (!code) return;

    navigator.clipboard.writeText(code);
  }

  public onTeamNameChange(value: string): void {
    this.newTeamName.set(value);
  }

  public createTeam(): void {
    const name = this.newTeamName().trim();

    if (!name) return;

    this.lobbyService.createTeam(name).subscribe({
      next: () => this.newTeamName.set(''),
      error: () => {
        this.toastService.danger('Не удалось создать команду');
      },
    });
  }

  public onRoundSecondsChange(value: string): void {
    const num = Number(value);

    if (!Number.isNaN(num)) {
      this.roundSecondsDraft.set(num);
    }
  }

  public onTargetScoreChange(value: string): void {
    const num = Number(value);

    if (!Number.isNaN(num)) {
      this.targetScoreDraft.set(num);
    }
  }

  public saveRoundSeconds(): void {
    const value = this.roundSecondsDraft();

    if (value === null || value === this.currentLobby()?.roundSeconds) {
      this.roundSecondsDraft.set(null);
      return;
    }

    if (value < 10 || value > 300) {
      this.toastService.danger('Время на раунд должно быть от 10 до 300');

      this.roundSecondsDraft.set(null);
      return;
    }

    this.lobbyService
      .updateSettings({
        roundSeconds: value,
      })
      .subscribe({
        next: () => this.roundSecondsDraft.set(null),
        error: () => {
          this.toastService.danger('Не удалось изменить время раунда');

          this.roundSecondsDraft.set(null);
        },
      });
  }

  public saveTargetScore(): void {
    const value = this.targetScoreDraft();

    if (value === null || value === this.currentLobby()?.targetScore) {
      this.targetScoreDraft.set(null);
      return;
    }

    if (value < 5 || value > 500) {
      this.toastService.danger('Количество очков должно быть от 5 до 500');

      this.targetScoreDraft.set(null);
      return;
    }

    this.lobbyService
      .updateSettings({
        targetScore: value,
      })
      .subscribe({
        next: () => this.targetScoreDraft.set(null),
        error: () => {
          this.toastService.danger('Не удалось изменить количество очков');

          this.targetScoreDraft.set(null);
        },
      });
  }

  public startRenameTeam(teamId: string, currentName: string): void {
    this.editingTeamId.set(teamId);
    this.editingTeamName.set(currentName);
  }

  public onEditingTeamNameChange(value: string): void {
    this.editingTeamName.set(value);
  }

  public confirmRenameTeam(teamId: string): void {
    const name = this.editingTeamName().trim();

    this.editingTeamId.set(null);

    const currentName = this.currentLobby()?.teams.find(
      (t) => t.id === teamId,
    )?.name;

    if (!name || name === currentName) return;

    this.lobbyService.renameTeam(teamId, name).subscribe({
      next: () => {},
      error: () => {
        this.toastService.danger('Не удалось переименовать команду');
      },
    });
  }

  public cancelRenameTeam(): void {
    this.editingTeamId.set(null);
  }

  public deleteTeam(teamId: string): void {
    this.lobbyService.deleteTeam(teamId).subscribe({
      next: () => {},
      error: () => {
        this.toastService.danger('Не удалось удалить команду');
      },
    });
  }

  public joinTeam(teamId: string): void {
    if (this.myTeamId() === teamId) return;

    this.lobbyService.assignTeam(teamId).subscribe({
      next: () => {},
      error: () => {
        this.toastService.danger('Не удалось присоединиться к команде');
      },
    });
  }

  public leaveTeam(): void {
    this.lobbyService.assignTeam(null).subscribe({
      next: () => {},
      error: () => {
        this.toastService.danger('Не удалось покинуть команду');
      },
    });
  }

  public membersInTeam(teamId: string) {
    return (
      this.currentLobby()?.members.filter((m) => m.teamId === teamId) ?? []
    );
  }

  public getStartHint(): string {
    const lobby = this.currentLobby();

    if (!lobby) return '';

    const hints: string[] = [];

    if (lobby.teams.length < 2) {
      hints.push('нужно минимум 2 команды');
    }

    if (!this.canStartGame() && lobby.teams.length >= 2) {
      hints.push('в каждой команде должен быть хотя бы 1 игрок');
    }

    if (!this.allPlayersReady()) {
      hints.push('не все игроки готовы');
    }

    return hints.join(', ');
  }

  public startGame(): void {
    this.lobbyService.startGame().subscribe({
      next: () => {},
      error: () => {
        this.toastService.danger('Ошибка при старте игры');
      },
    });
  }
}
