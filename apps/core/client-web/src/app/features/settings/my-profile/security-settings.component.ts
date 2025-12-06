import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Shield, Smartphone, Key, AlertTriangle, Monitor, XCircle, RefreshCw, Copy, Check } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../../core/services/notification';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

interface Session {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DatePipe, ReactiveFormsModule],
  template: `
    <div class="space-y-8">

        <!-- 2FA Section -->
        <div class="settings-section">
            <div class="section-header">
                <h3>Autenticación de Dos Factores (2FA)</h3>
                <p>Protege tu cuenta con una capa extra de seguridad.</p>
            </div>

            <div class="card p-6">
                <div class="flex items-start justify-between">
                    <div class="flex gap-4">
                        <div class="p-3 bg-primary/10 rounded-xl text-primary">
                            <lucide-icon [img]="Shield" size="24"></lucide-icon>
                        </div>
                        <div>
                             <h4 class="text-lg font-semibold text-text-primary">Verificación en dos pasos</h4>
                             <p class="text-text-secondary text-sm mt-1">
                                {{ is2faEnabled() ? 'Tu cuenta está protegida.' : 'Tu cuenta no está protegida.' }}
                             </p>
                        </div>
                    </div>

                    <button *ngIf="!is2faEnabled()" (click)="enable2fa()" class="btn btn-primary">
                        Activar 2FA
                    </button>
                    <button *ngIf="is2faEnabled()" (click)="disable2fa()" class="btn btn-danger-outline">
                        Desactivar
                    </button>
                </div>

                 <!-- Backup Codes (Only if 2FA enabled) -->
                 <div *ngIf="is2faEnabled()" class="mt-6 pt-6 border-t border-border-color">
                    <div class="flex items-center justify-between">
                        <div>
                            <h5 class="font-medium text-text-primary">Códigos de Recuperación</h5>
                            <p class="text-sm text-text-secondary">Úsalos si pierdes acceso a tu dispositivo.</p>
                        </div>
                        <button (click)="generateBackupCodes()" class="btn btn-secondary text-sm">
                            <lucide-icon [img]="RefreshCw" size="16" class="mr-2"></lucide-icon>
                            Generar Nuevos
                        </button>
                    </div>

                    <div *ngIf="showBackupCodes()" class="mt-4 p-4 bg-card-bg-secondary rounded-xl border border-border-color">
                        <div class="flex items-center justify-between mb-4">
                             <span class="text-yellow-500 text-sm flex items-center gap-2">
                                <lucide-icon [img]="AlertTriangle" size="16"></lucide-icon>
                                Guarda estos códigos en un lugar seguro.
                             </span>
                             <button (click)="copyCodes()" class="text-primary hover:text-primary-dark text-sm flex items-center gap-1">
                                <lucide-icon [img]="copied() ? Check : Copy" size="14"></lucide-icon>
                                {{ copied() ? 'Copiado' : 'Copiar' }}
                             </button>
                        </div>
                        <div class="grid grid-cols-2 gap-2 font-mono text-sm text-text-primary">
                            <div *ngFor="let code of backupCodes" class="bg-card-bg p-2 rounded text-center border border-border-color">
                                {{ code }}
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
        </div>

        <!-- Sessions Section -->
        <div class="settings-section">
            <div class="section-header">
                <h3>Sesiones Activas</h3>
                <p>Gestiona los dispositivos donde has iniciado sesión.</p>
            </div>

            <div class="card divide-y divide-border-color">
                <div *ngFor="let session of sessions()" class="p-4 flex items-center justify-between hover:bg-hover-bg transition-colors">
                    <div class="flex items-center gap-4">
                        <div class="p-2 bg-secondary/10 text-secondary rounded-lg">
                            <lucide-icon [img]="Monitor" size="20"></lucide-icon>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-medium text-text-primary">{{ parseUA(session.userAgent) }}</span>
                                <span *ngIf="session.isCurrent" class="px-2 py-0.5 bg-green-500/10 text-green-500 text-xs rounded-full font-medium">Actual</span>
                            </div>
                            <div class="text-xs text-text-secondary mt-1 flex gap-3">
                                <span>{{ session.ipAddress }}</span>
                                <span>•</span>
                                <span>{{ session.createdAt | date:'mediumDate' }}</span>
                            </div>
                        </div>
                    </div>

                    <button *ngIf="!session.isCurrent" (click)="revokeSession(session.id)" class="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-500/10 transition-colors" title="Cerrar sesión">
                        <lucide-icon [img]="XCircle" size="20"></lucide-icon>
                    </button>
                </div>

                <div *ngIf="sessions().length === 0" class="p-8 text-center text-text-secondary">
                    Cargando sesiones...
                </div>
            </div>
        </div>

    </div>

    <!-- 2FA Setup Modal -->
    <div *ngIf="showSetupModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
         <div class="bg-card-bg border border-border-color rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 class="text-xl font-bold mb-4">Configurar 2FA</h3>
            <div class="space-y-4">
                <div class="bg-card-bg-secondary p-4 rounded-xl text-center">
                    <p class="text-sm font-medium text-text-primary mb-2">Escanea el código QR</p>
                    <p class="text-xs text-text-secondary mb-4">(Abre tu App de Autenticación)</p>

                     <!-- Placeholder for QR Code (Use a library like angularx-qrcode in real app) -->
                     <div class="mx-auto w-48 h-48 bg-white flex items-center justify-center rounded-lg border border-border-color">
                        <span class="text-xs text-center text-gray-500 p-2">
                            QR Code Library Required<br>
                            Install 'angularx-qrcode'
                        </span>
                     </div>
                </div>

                <div class="text-center">
                    <p class="text-xs text-text-secondary mb-1">O ingresa esta clave manualmente:</p>
                    <code class="block p-2 bg-input-bg rounded border border-input-border text-sm font-mono break-all select-all">
                        {{ secretKey }}
                    </code>
                </div>

                <input [formControl]="setupTokenControl" class="form-input text-center tracking-widest text-xl" placeholder="000000" maxlength="6" />

                <div class="flex gap-3 mt-6">
                    <button (click)="showSetupModal.set(false)" class="btn btn-secondary flex-1">Cancelar</button>
                    <button (click)="confirm2fa()" class="btn btn-primary flex-1">Verificar</button>
                </div>
            </div>
         </div>
    </div>
  `,
  styles: [`
    .settings-section { @apply space-y-4; }
    .section-header h3 { @apply text-lg font-semibold text-text-primary; }
    .section-header p { @apply text-sm text-text-secondary; }
    .card { @apply bg-card-bg border border-border-color rounded-xl overflow-hidden shadow-sm; }
    .btn { @apply px-4 py-2 rounded-xl font-medium transition-colors flex items-center justify-center; }
    .btn-primary { @apply bg-primary text-white hover:bg-primary-dark; }
    .btn-secondary { @apply bg-card-bg border border-border-color text-text-primary hover:bg-hover-bg; }
    .btn-danger-outline { @apply border border-red-500/30 text-red-500 hover:bg-red-500/10; }
    .form-input { @apply w-full px-4 py-2 bg-input-bg border border-input-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SecuritySettingsComponent implements OnInit {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private notificationService = inject(NotificationService);

    // Icons
    protected readonly Shield = Shield;
    protected readonly Smartphone = Smartphone;
    protected readonly Key = Key;
    protected readonly AlertTriangle = AlertTriangle;
    protected readonly Monitor = Monitor;
    protected readonly XCircle = XCircle;
    protected readonly RefreshCw = RefreshCw;
    protected readonly Copy = Copy;
    protected readonly Check = Check;

    sessions = signal<Session[]>([]);
    is2faEnabled = signal(false);

    // Backup Codes
    backupCodes: string[] = [];
    showBackupCodes = signal(false);
    copied = signal(false);

    // Setup 2FA
    showSetupModal = signal(false);
    secretKey: string | null = null;
    setupTokenControl = new FormControl('');

    ngOnInit() {
        this.loadSessions();
        this.check2faStatus();
    }

    check2faStatus() {
        // Fallback to user status or fetch dedicated
        this.is2faEnabled.set(!!this.authService.currentUser()?.isTwoFactorEnabled);
    }

    loadSessions() {
        this.http.get<Session[]>('/api/v1/auth/sessions').subscribe({
            next: (data) => this.sessions.set(data),
            error: () => this.notificationService.showError('Error al cargar sesiones.')
        });
    }

    revokeSession(id: string) {
        this.http.post(`/api/v1/auth/sessions/${id}/revoke`, {}).subscribe({
            next: () => {
                this.notificationService.showSuccess('Sesión cerrada.');
                this.loadSessions();
            },
            error: () => this.notificationService.showError('Error al cerrar sesión.')
        });
    }

    enable2fa() {
        this.http.post<any>('/api/v1/auth/2fa/generate', {}).subscribe({
            next: (res) => {
                this.secretKey = res.secret; // Only use the secret for display
                // res.otpauthUrl is ignored to prevent external API leak
                this.showSetupModal.set(true);
            },
            error: () => this.notificationService.showError('Error al iniciar configuración 2FA.')
        });
    }

    confirm2fa() {
        if (!this.setupTokenControl.value) return;
        this.http.post<any>('/api/v1/auth/2fa/enable', { token: this.setupTokenControl.value }).subscribe({
            next: (res) => {
                this.notificationService.showSuccess('2FA Activado exitosamente.');
                this.is2faEnabled.set(true);
                this.showSetupModal.set(false);
                if (res.backupCodes) {
                    this.backupCodes = res.backupCodes;
                    this.showBackupCodes.set(true);
                }
            },
            error: () => this.notificationService.showError('Código incorrecto.')
        });
    }

    disable2fa() {
        if(!confirm('¿Estás seguro? Tu cuenta será menos segura.')) return;
        this.http.post('/api/v1/auth/2fa/disable', {}).subscribe({
            next: () => {
                this.notificationService.showSuccess('2FA Desactivado.');
                this.is2faEnabled.set(false);
                this.showBackupCodes.set(false);
            },
            error: () => this.notificationService.showError('Error al desactivar.')
        });
    }

    generateBackupCodes() {
        this.http.post<any>('/api/v1/auth/2fa/backup-codes/generate', {}).subscribe({
            next: (res) => {
                this.backupCodes = res.codes;
                this.showBackupCodes.set(true);
                this.notificationService.showSuccess('Nuevos códigos generados.');
            },
            error: () => this.notificationService.showError('Error al generar códigos.')
        });
    }

    copyCodes() {
        navigator.clipboard.writeText(this.backupCodes.join('\n'));
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
    }

    parseUA(ua: string): string {
        if (ua.includes('Windows')) return 'Windows PC';
        if (ua.includes('Mac')) return 'Mac';
        if (ua.includes('Linux')) return 'Linux';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iPhone')) return 'iPhone';
        return 'Dispositivo Desconocido';
    }
}
