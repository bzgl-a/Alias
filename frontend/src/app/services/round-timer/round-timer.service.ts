import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { GameService } from '../game/game.service';

@Injectable({
  providedIn: 'root',
})
export class RoundTimerService {
  private readonly gameService = inject(GameService);
  private readonly destroyRef = inject(DestroyRef);

  readonly secondsLeft = signal(0);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const endsAt = this.gameService.endsAt();

      this.clearInterval();

      if (endsAt === null) {
        this.secondsLeft.set(0);
        return;
      }

      this.tick(endsAt);
      this.intervalId = setInterval(() => this.tick(endsAt), 250);
    });

    this.destroyRef.onDestroy(() => this.clearInterval());
  }

  private tick(endsAt: number): void {
    const remainingMs = endsAt - Date.now();
    this.secondsLeft.set(Math.max(0, Math.ceil(remainingMs / 1000)));
  }

  private clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
