import { Injectable, inject, signal } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { UserService } from '../user/user.service';

const SOCKET_URL = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly userService = inject(UserService);
  private socket: Socket | null = null;
  private readonly eventSubjects = new Map<string, ReplaySubject<unknown>>();
  readonly connected = signal(false);

  connect(): void {
    const user = this.userService.currentUser();
    if (!user) throw new Error('Cannot connect socket: user is not available');
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { userId: user.id },
    });

    this.socket.on('connect', () => {
      this.connected.set(true);
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      this.connected.set(false);
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    this.socket.onAny((event, ...args) => {
      this.getSubject(event).next(args[0]);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
    this.eventSubjects.clear();
  }

  emit(event: string, ...args: unknown[]): void {
    if (!this.socket) {
      console.warn(`Cannot emit "${event}": socket is not connected`);
      return;
    }
    this.socket.emit(event, ...args);
  }

  on<T>(event: string): Observable<T> {
    return this.getSubject(event).asObservable() as Observable<T>;
  }

  private getSubject(event: string): ReplaySubject<unknown> {
    let subject = this.eventSubjects.get(event);
    if (!subject) {
      subject = new ReplaySubject<unknown>(1);
      this.eventSubjects.set(event, subject);
    }
    return subject;
  }
}
