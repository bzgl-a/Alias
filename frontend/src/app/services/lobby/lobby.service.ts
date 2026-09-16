import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SocketService } from '../socket/socket.service';
import { UserService } from '../user/user.service';
import { Lobby } from '../../models/model';

@Injectable({
  providedIn: 'root',
})
export class LobbyService {
  private readonly http = inject(HttpClient);
  private readonly userService = inject(UserService);
  private readonly socketService = inject(SocketService);

  private readonly API_URL = environment.apiUrl;

  readonly currentLobby = signal<Lobby | null>(null);

  constructor() {
    this.socketService.on<Lobby>('lobby:updated').subscribe((lobby) => {
      this.currentLobby.set(lobby);
    });
  }

  getLobby(lobbyId: string): Observable<Lobby> {
    return this.http.get<Lobby>(`${this.API_URL}/lobbies/${lobbyId}`);
  }

  fetchLobby(lobbyId: string): Observable<Lobby> {
    return this.http
      .get<Lobby>(`${this.API_URL}/lobbies/${lobbyId}`)
      .pipe(tap((lobby) => this.enterLobby(lobby)));
  }

  createLobby(): Observable<Lobby> {
    const hostId = this.userService.currentUser()?.id;

    return this.http
      .post<Lobby>(`${this.API_URL}/lobbies`, { hostId })
      .pipe(tap((lobby) => this.enterLobby(lobby)));
  }

  joinLobby(code: string): Observable<Lobby> {
    const userId = this.userService.currentUser()?.id;

    return this.http
      .post<Lobby>(`${this.API_URL}/lobbies/join`, { code, userId })
      .pipe(tap((lobby) => this.enterLobby(lobby)));
  }

  setReady(isReady: boolean): Observable<Lobby> {
    const lobby = this.currentLobby();
    const userId = this.userService.currentUser()?.id;

    if (!lobby) {
      throw new Error('Not in a lobby');
    }

    return this.http.patch<Lobby>(`${this.API_URL}/lobbies/${lobby.id}/ready`, {
      userId,
      isReady,
    });
  }

  leaveLobby(): Observable<Lobby> {
    const lobby = this.currentLobby();
    const userId = this.userService.currentUser()?.id;

    if (!lobby) {
      throw new Error('Not in a lobby');
    }

    return this.http
      .post<Lobby>(`${this.API_URL}/lobbies/${lobby.id}/leave`, { userId })
      .pipe(tap(() => this.exitLobby(lobby.id)));
  }

  createTeam(name: string): Observable<Lobby> {
    const lobby = this.currentLobby();
    const hostId = this.userService.currentUser()?.id;

    if (!lobby) {
      throw new Error('Not in a lobby');
    }

    return this.http.post<Lobby>(`${this.API_URL}/lobbies/${lobby.id}/teams`, {
      name,
      hostId,
    });
  }

  renameTeam(teamId: string, name: string): Observable<Lobby> {
    const lobby = this.currentLobby();
    const hostId = this.userService.currentUser()?.id;

    if (!lobby) {
      throw new Error('Not in a lobby');
    }

    return this.http.patch<Lobby>(
      `${this.API_URL}/lobbies/${lobby.id}/teams/${teamId}`,
      { name, hostId },
    );
  }

  updateSettings(settings: {
    roundSeconds?: number;
    targetScore?: number;
  }): Observable<Lobby> {
    const lobby = this.currentLobby();
    const hostId = this.userService.currentUser()?.id;

    if (!lobby) {
      throw new Error('Not in a lobby');
    }

    return this.http.patch<Lobby>(
      `${this.API_URL}/lobbies/${lobby.id}/settings`,
      { ...settings, hostId },
    );
  }

  deleteTeam(teamId: string): Observable<Lobby> {
    const lobby = this.currentLobby();
    const hostId = this.userService.currentUser()?.id;

    if (!lobby) {
      throw new Error('Not in a lobby');
    }

    return this.http.request<Lobby>(
      'delete',
      `${this.API_URL}/lobbies/${lobby.id}/teams/${teamId}`,
      { body: { hostId } },
    );
  }

  assignTeam(teamId: string | null): Observable<Lobby> {
    const lobby = this.currentLobby();
    const userId = this.userService.currentUser()?.id;

    if (!lobby || !userId) {
      throw new Error('Not in a lobby');
    }

    return this.http.patch<Lobby>(
      `${this.API_URL}/lobbies/${lobby.id}/members/${userId}/team`,
      { teamId },
    );
  }

  startGame(): Observable<Lobby> {
    const lobby = this.currentLobby();
    const hostId = this.userService.currentUser()?.id;

    if (!lobby) {
      throw new Error('Not in a lobby');
    }

    return this.http.post<Lobby>(
      `${this.API_URL}/lobbies/${lobby.id}/game/start`,
      { hostId },
    );
  }

  playAgain(): Observable<Lobby> {
    const lobby = this.currentLobby();
    const hostId = this.userService.currentUser()?.id;

    if (!lobby) {
      throw new Error('Not in a lobby');
    }

    return this.http.post<Lobby>(`${this.API_URL}/lobbies/${lobby.id}/reset`, {
      hostId,
    });
  }

  private enterLobby(lobby: Lobby): void {
    this.currentLobby.set(lobby);
    this.socketService.emit('lobby:join', lobby.id);
  }

  private exitLobby(lobbyId: string): void {
    this.socketService.emit('lobby:leave', lobbyId);
    this.currentLobby.set(null);
  }
}
