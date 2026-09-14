import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../models/model';

const USER_ID_KEY = 'alias:userId';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  readonly currentUser = signal<User | null>(null);

  getUserId(): string | null {
    return localStorage.getItem(USER_ID_KEY);
  }

  private saveUserId(userId: string): void {
    localStorage.setItem(USER_ID_KEY, userId);
  }

  // getAllUsers(): Observable<User[]> {
  //   return this.http.get<User[]>(`${this.API_URL}/users`).pipe();
  // }

  loadUser(): Observable<User> {
    const userId = this.getUserId();

    if (!userId) {
      throw new Error('User ID is not available');
    }

    return this.http.get<User>(`${this.API_URL}/users/${userId}`).pipe(
      tap((user) => {
        this.currentUser.set(user);
      }),
    );
  }

  createUser(nickname: string): Observable<User> {
    return this.http
      .post<User>(`${this.API_URL}/users`, {
        nickname,
      })
      .pipe(
        tap((user) => {
          this.saveUserId(user.id);
          this.currentUser.set(user);
        }),
      );
  }

  clearUser(): void {
    localStorage.removeItem(USER_ID_KEY);
    this.currentUser.set(null);
  }
}
