import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LobbyService } from '../../services/lobby/lobby.service';
import { ToastService } from '../../services/toast/toast.service';

@Component({
  selector: 'app-hub',
  imports: [],
  templateUrl: './hub.component.html',
  styleUrl: './hub.component.css',
})
export class HubComponent {
  private router = inject(Router);
  private lobbyService = inject(LobbyService);
  private toastService = inject(ToastService);

  public lobbyCode = signal('');

  public onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    this.lobbyCode.set(
      value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6),
    );
  }

  public createLobby(): void {
    this.lobbyService.createLobby().subscribe({
      next: (lobby) => {
        this.router.navigate(['/lobby', lobby.id]);
      },
      error: () => {
        this.toastService.danger('Ошибка при создании лобби');
      },
    });
  }

  public joinLobby(): void {
    const code = this.lobbyCode().trim();

    if (!code) {
      return;
    }

    this.lobbyService.joinLobby(code).subscribe({
      next: (lobby) => {
        this.router.navigate(['/lobby', lobby.id]);
      },
      error: () => {
        this.toastService.danger('Ошибка при присоединении к лобби');
      },
    });
  }
}
