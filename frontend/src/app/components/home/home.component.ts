import { Component, inject, signal } from '@angular/core';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [ModalComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private readonly router = inject(Router);

  public rulesOpen = signal(false);

  public onPlayClick(): void {
    this.router.navigate(['/hub']);
  }
}
