import { Component, inject } from '@angular/core';
import { ToastService } from '../../../services/toast/toast.service';

@Component({
  selector: 'app-toast',
  imports: [],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);
}
