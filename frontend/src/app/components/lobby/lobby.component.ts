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
  private readonly hasJoined = signal(false);

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

      if (connected && lobby && !member && !this.hasJoined()) {
        this.hasJoined.set(true);
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
    if (!lobby?.code) return;

    this.isJoining.set(true);

    this.lobbyService.joinLobby(lobby.code).subscribe({
      next: () => {
        this.isJoining.set(false);
      },
      error: (err) => {
        this.isJoining.set(false);
        this.toastService.danger('Не удалось подключиться к лобби');
      },
    });
  }

  public leaveLobby(): void {
    this.lobbyService.leaveLobby().subscribe({
      next: () => this.router.navigate(['/hub']),
      error: () => {
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
    if (lobby.teams.length < 2) hints.push('нужно минимум 2 команды');
    if (!this.canStartGame() && lobby.teams.length >= 2) {
      hints.push('в каждой команде должен быть хотя бы 1 игрок');
    }
    if (!this.allPlayersReady()) hints.push('не все игроки готовы');

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
