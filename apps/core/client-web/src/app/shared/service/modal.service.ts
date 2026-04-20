import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface ModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private readonly onClose = new Subject<boolean | null>();
  public onClose$ = this.onClose.asObservable();

  public isOpen = signal(false);
  public options = signal<ModalOptions | null>(null);

  public open(options: ModalOptions) {
    if (this.isOpen()) {
      return this;
    }

    this.options.set(options);
    this.isOpen.set(true);

    return this;
  }

  public close(result: boolean | null) {
    if (this.isOpen()) {
      this.isOpen.set(false);
      this.options.set(null);
      this.onClose.next(result);
    }
  }
}
