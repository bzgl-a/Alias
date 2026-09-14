import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { UserService } from '../../services/user/user.service';
import { SocketService } from '../../services/socket/socket.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../services/toast/toast.service';

@Component({
  selector: 'app-game-shell',
  imports: [RouterOutlet, ModalComponent],
  templateUrl: './game-shell.component.html',
  styleUrl: './game-shell.component.css',
})
export class GameShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly socketService = inject(SocketService);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal(true);
  readonly showModal = signal(false);
  readonly playerName = signal('');
  readonly isSubmitting = signal(false);

  ngOnInit(): void {
    this.checkUser();
  }

  private checkUser(): void {
    if (this.userService.currentUser()) {
      this.connectSocket();
      this.isLoading.set(false);
      return;
    }

    const userId = this.userService.getUserId();

    if (!userId) {
      this.isLoading.set(false);
      this.showModal.set(true);
      return;
    }

    this.userService.loadUser().subscribe({
      next: () => {
        this.connectSocket();
        this.isLoading.set(false);
      },
      error: () => {
        this.userService.clearUser();
        this.isLoading.set(false);
        this.showModal.set(true);
      },
    });
  }

  private connectSocket(): void {
    this.socketService.connect();
  }

  public confirmName(): void {
    const name = this.playerName().trim();

    if (!name || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);

    this.userService.createUser(name).subscribe({
      next: () => {
        this.socketService.connect();
        this.isSubmitting.set(false);
        this.showModal.set(false);
      },
      error: () => {
        this.toastService.danger('Ошибка при создании пользователя');
        this.isSubmitting.set(false);
      },
    });
  }

  public onModalClose(): void {
    this.router.navigate(['/']);
  }
}
