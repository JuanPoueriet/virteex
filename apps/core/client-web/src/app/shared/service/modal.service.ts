import { Injectable, ApplicationRef, createComponent, EnvironmentInjector, signal, ComponentRef, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { ModalComponent } from '../components/modal/modal.component';

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
  private componentRef: ComponentRef<ModalComponent> | null = null;
  private readonly onClose = new Subject<boolean | null>();
  public onClose$ = this.onClose.asObservable();

  public isOpen = signal(false);
  public options = signal<ModalOptions | null>(null);

  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  public open(options: ModalOptions) {
    if (this.componentRef) {
      return this;
    }

    this.options.set(options);
    this.isOpen.set(true);

    this.componentRef = createComponent(ModalComponent, {
      environmentInjector: this.injector,
    });

    // Use setInput for Signal Inputs
    this.componentRef.setInput('options', options);

    // Subscribe to output signals
    this.componentRef.instance.onConfirm.subscribe(() => this.close(true));
    this.componentRef.instance.onCancel.subscribe(() => this.close(false));
    this.componentRef.instance.onCloseModal.subscribe(() => this.close(null));

    document.body.appendChild(this.componentRef.location.nativeElement);
    this.appRef.attachView(this.componentRef.hostView);

    return this;
  }

  public close(result: boolean | null) {
    if (this.componentRef) {
      this.appRef.detachView(this.componentRef.hostView);
      this.componentRef.destroy();
      this.componentRef = null;

      this.isOpen.set(false);
      this.options.set(null);

      this.onClose.next(result);
    }
  }
}
