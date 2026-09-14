import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'danger' | 'standard';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly MAX_TOASTS = 3;
  private readonly DEFAULT_DURATION = 4000;

  private nextId = 0;

  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(message: string, duration = this.DEFAULT_DURATION): void {
    this.addToast({
      message,
      type: 'success',
      duration,
    });
  }

  danger(message: string, duration = this.DEFAULT_DURATION): void {
    this.addToast({
      message,
      type: 'danger',
      duration,
    });
  }

  standard(message: string, duration = this.DEFAULT_DURATION): void {
    this.addToast({
      message,
      type: 'standard',
      duration,
    });
  }

  show(toast: Omit<Toast, 'id'>): void {
    this.addToast(toast);
  }

  remove(id: number): void {
    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  clear(): void {
    this._toasts.set([]);
  }

  private addToast(toast: Omit<Toast, 'id'>): void {
    const newToast: Toast = {
      ...toast,
      id: ++this.nextId,
    };

    this._toasts.update((toasts) => {
      const next = [...toasts, newToast];

      if (next.length > this.MAX_TOASTS) {
        return next.slice(-this.MAX_TOASTS);
      }

      return next;
    });

    if (newToast.duration > 0) {
      setTimeout(() => {
        this.remove(newToast.id);
      }, newToast.duration);
    }
  }
}
