import { Component, ChangeDetectionStrategy, signal, computed, input, output, viewChildren, ElementRef, OnInit, OnDestroy, effect, untracked } from '@angular/core';
import { LucideAngularModule, Shield, Clock, RefreshCw, Eraser, CheckCircle, Info, AlertCircle, AlertTriangle, Lightbulb } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-otp',
  imports: [LucideAngularModule, TranslateModule],
  templateUrl: './otp.component.html',
  styleUrls: ['./otp.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'otp-host'
  }
})
export class OtpComponent implements OnInit, OnDestroy {
  // Inputs
  otpLength = input(6);
  timerDuration = input(120); // seconds
  resendCooldown = input(30); // seconds
  title = input('Verificación de Seguridad');
  description = input('Para proteger su cuenta, hemos enviado un código de verificación a su correo electrónico registrado.');
  showLengthSelector = input(false);
  mode = input<'email' | 'app'>('email');

  // Outputs
  verify = output<string>();
  resend = output<void>();
  cancelled = output<void>();

  // State
  // Initialize synchronously with a default to prevent CLS. Effect will update if input differs.
  currentOtpLength = signal(6);
  otpValues = signal<string[]>(new Array(6).fill(''));

  timer = signal(120);
  cooldown = signal(0);
  inputError = signal(false);
  inputsDisabled = signal(false);

  status = signal<{ message: string, type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // ViewChildren using signal
  inputs = viewChildren<ElementRef<HTMLInputElement>>('otpInput');

  isExpired = computed(() => this.timer() <= 0);
  isExpiring = computed(() => this.timer() > 0 && this.timer() <= 30);
  isComplete = computed(() => this.otpValues().every(v => v !== ''));

  protected Math = Math;

  private timerInterval: ReturnType<typeof setInterval> | undefined;
  private cooldownInterval: ReturnType<typeof setInterval> | undefined;

  // Icons
  protected readonly ShieldIcon = Shield;
  protected readonly ClockIcon = Clock;
  protected readonly RefreshIcon = RefreshCw;
  protected readonly EraserIcon = Eraser;
  protected readonly CheckCircleIcon = CheckCircle;
  protected readonly InfoIcon = Info;
  protected readonly AlertCircleIcon = AlertCircle;
  protected readonly AlertTriangleIcon = AlertTriangle;
  protected readonly LightbulbIcon = Lightbulb;

  constructor() {
    // Sync input to internal state initially and when input changes
    effect(() => {
        const length = this.otpLength();
        untracked(() => {
            // Only update if different to avoid redundant resets
            if (length !== this.currentOtpLength()) {
                this.currentOtpLength.set(length);
                this.otpValues.set(new Array(length).fill(''));
                this.startTimer(true); // Force reset timer when length changes
            }
        });
    });

    // Sync timer duration changes
    effect(() => {
        const duration = this.timerDuration();
        untracked(() => {
            if (this.timer() === 120 && duration !== 120) {
                 this.timer.set(duration);
            }
        });
    });
  }

  ngOnInit() {
      // Ensure timer starts. If constructor effect hasn't run yet or input is same as default.
      if (!this.timerInterval) {
          this.startTimer(true);
      }
  }

  ngOnDestroy() {
    this.stopTimer();
    this.stopCooldown();
  }

  startTimer(forceReset = false) {
    this.stopTimer();

    if (forceReset || this.timer() <= 0) {
         this.timer.set(this.timerDuration());
    }

    this.timerInterval = setInterval(() => {
        this.timer.update(t => {
            if (t <= 1) {
                this.stopTimer();
                this.showStatus('El código OTP ha expirado. Solicite un nuevo código.', 'warning');
                this.markAsError();
                this.disableAllInputs();
                return 0;
            }
            return t - 1;
        });
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = undefined;
  }

  startCooldown() {
      this.stopCooldown();
      this.cooldown.set(this.resendCooldown());
      this.cooldownInterval = setInterval(() => {
          this.cooldown.update(c => {
              if (c <= 1) {
                  this.stopCooldown();
                  return 0;
              }
              return c - 1;
          });
      }, 1000);
  }

  stopCooldown() {
      if (this.cooldownInterval) clearInterval(this.cooldownInterval);
      this.cooldownInterval = undefined;
  }

  formatTimer(seconds: number): string {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  handleInput(event: Event, index: number) {
      const input = event.target as HTMLInputElement;
      const value = input.value.trim();

      if (!/^\d*$/.test(value)) {
          input.value = '';
          this.showStatus('Por favor, ingrese solo números', 'error');
          return;
      }

      const currentValues = [...this.otpValues()];

      if (value.length >= 1) {
          const char = value.slice(-1);
          currentValues[index] = char;
          input.value = char;

          // inputs() returns a ReadonlyArray of ElementRefs
          const inputsList = this.inputs();
          if (index < this.currentOtpLength() - 1) {
              inputsList[index + 1]?.nativeElement.focus();
          }
      } else {
          currentValues[index] = '';
      }

      this.otpValues.set(currentValues);
      this.status.set(null);
  }

  handleKeyDown(event: KeyboardEvent, index: number) {
      const key = event.key;
      const inputsList = this.inputs();

      if (key === 'ArrowRight' || key === 'ArrowDown') {
          event.preventDefault();
          if (index < this.currentOtpLength() - 1) {
              inputsList[index + 1]?.nativeElement.focus();
          }
      } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
          event.preventDefault();
          if (index > 0) {
              inputsList[index - 1]?.nativeElement.focus();
          }
      } else if (key === 'Backspace') {
           const currentValues = [...this.otpValues()];
           if (currentValues[index] === '' && index > 0) {
               event.preventDefault();
               const prevInput = inputsList[index - 1]?.nativeElement;
               if (prevInput) {
                 prevInput.focus();
                 currentValues[index - 1] = '';
                 this.otpValues.set(currentValues);
               }
           }
      } else if (key === 'Delete') {
           const currentValues = [...this.otpValues()];
           if (currentValues[index] === '' && index < this.currentOtpLength() - 1) {
               event.preventDefault();
               currentValues[index + 1] = '';
               this.otpValues.set(currentValues);
           }
      }
  }

  handlePaste(event: ClipboardEvent) {
      event.preventDefault();
      const pasteData = event.clipboardData?.getData('text').trim();
      if (!pasteData) return;

      if (!/^\d+$/.test(pasteData)) {
          this.showStatus('El código pegado contiene caracteres no válidos. Solo se permiten números.', 'error');
          return;
      }

      this.clearInputs();

      const length = this.currentOtpLength();
      const currentValues = new Array(length).fill('');
      const pasteLength = Math.min(pasteData.length, length);

      for (let i = 0; i < pasteLength; i++) {
          currentValues[i] = pasteData[i];
      }
      this.otpValues.set(currentValues);

      const focusIndex = Math.min(pasteLength, length - 1);
      const inputsList = this.inputs();
      setTimeout(() => inputsList[focusIndex]?.nativeElement.focus());

      this.showStatus('Código pegado correctamente', 'success');
  }

  handleFocus(event: FocusEvent) {
      (event.target as HTMLInputElement).select();
  }

  onResend() {
      if (this.cooldown() > 0) return;
      this.startCooldown();
      this.startTimer(true); // Force reset on resend
      this.clearInputs();
      this.enableAllInputs();
      this.showStatus('Nuevo código OTP enviado', 'info');
      this.resend.emit();
  }

  onVerify() {
      if (this.isExpired() || !this.isComplete()) return;
      const code = this.otpValues().join('');
      this.verify.emit(code);
  }

  clear() {
      this.clearInputs();
      this.enableAllInputs();
      this.showStatus('Todos los campos han sido limpiados', 'info');
      const inputsList = this.inputs();
      inputsList[0]?.nativeElement.focus();
      this.cancelled.emit();
  }

  clearInputs() {
      this.otpValues.set(new Array(this.currentOtpLength()).fill(''));
      this.status.set(null);
  }

  showStatus(message: string, type: 'success' | 'error' | 'warning' | 'info') {
      this.status.set({ message, type });
      if (type !== 'success' && type !== 'warning') {
          setTimeout(() => {
              if (this.status()?.message === message) {
                   this.status.set(null);
              }
          }, 5000);
      }
  }

  changeLength(length: number) {
      this.currentOtpLength.set(length);
      this.otpValues.set(new Array(length).fill(''));
      this.startTimer(true); // Always reset timer when changing length
      this.showStatus(`Longitud de OTP cambiada a ${length} dígitos`, 'info');
  }

  // API for Parents
  handleError(message: string) {
      this.showStatus(message, 'error');
      this.markAsError();
  }

  handleSuccess(message: string) {
      this.showStatus(message, 'success');
      this.disableAllInputs();
  }

  markAsError() {
      this.inputError.set(true);
      setTimeout(() => {
          this.inputError.set(false);
      }, 3000);
  }

  disableAllInputs() {
      this.inputsDisabled.set(true);
  }

  enableAllInputs() {
      this.inputsDisabled.set(false);
  }
}
