import { Component, OnInit, ChangeDetectionStrategy, inject, signal, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Shield, Smartphone, Key, AlertTriangle, Monitor, XCircle, RefreshCw, Copy, Check } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth';
import { SecurityService, Session } from '../../../core/api/security.service';
import { NotificationService } from '../../../core/services/notification';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { parseUserAgent } from '../../../shared/utils/user-agent.util';
import * as QRCode from 'qrcode';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DatePipe, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="space-y-8">

        <!-- 2FA Section -->
        <div class="settings-section">
            <div class="section-header">
                <h3>{{ 'SETTINGS.SECURITY.2FA_TITLE' | translate }}</h3>
                <p>{{ 'SETTINGS.SECURITY.2FA_DESC' | translate }}</p>
            </div>

            <div class="card p-6">
                <div class="flex items-start justify-between">
                    <div class="flex gap-4">
                        <div class="p-3 bg-primary/10 rounded-xl text-primary">
                            <lucide-icon [img]="Shield" size="24"></lucide-icon>
                        </div>
                        <div>
                             <h4 class="text-lg font-semibold text-text-primary">{{ 'SETTINGS.SECURITY.TWO_STEP_VERIF' | translate }}</h4>
                             <p class="text-text-secondary text-sm mt-1">
                                {{ is2faEnabled() ? ('SETTINGS.SECURITY.ACCOUNT_PROTECTED' | translate) : ('SETTINGS.SECURITY.ACCOUNT_NOT_PROTECTED' | translate) }}
                             </p>
                        </div>
                    </div>

                    <button *ngIf="!is2faEnabled()" (click)="enable2fa()" class="btn btn-primary">
                        {{ 'SETTINGS.SECURITY.ACTIVATE_2FA' | translate }}
                    </button>
                    <button *ngIf="is2faEnabled()" (click)="disable2fa()" class="btn btn-danger-outline">
                        {{ 'SETTINGS.SECURITY.DEACTIVATE' | translate }}
                    </button>
                </div>

                 <!-- Backup Codes (Only if 2FA enabled) -->
                 <div *ngIf="is2faEnabled()" class="mt-6 pt-6 border-t border-border-color">
                    <div class="flex items-center justify-between">
                        <div>
                            <h5 class="font-medium text-text-primary">{{ 'SETTINGS.SECURITY.BACKUP_CODES' | translate }}</h5>
                            <p class="text-sm text-text-secondary">{{ 'SETTINGS.SECURITY.BACKUP_CODES_DESC' | translate }}</p>
                        </div>
                        <button (click)="generateBackupCodes()" class="btn btn-secondary text-sm">
                            <lucide-icon [img]="RefreshCw" size="16" class="mr-2"></lucide-icon>
                            {{ 'SETTINGS.SECURITY.GENERATE_NEW' | translate }}
                        </button>
                    </div>

                    <div *ngIf="showBackupCodes()" class="mt-4 p-4 bg-card-bg-secondary rounded-xl border border-border-color">
                        <div class="flex items-center justify-between mb-4">
                             <span class="text-yellow-500 text-sm flex items-center gap-2">
                                <lucide-icon [img]="AlertTriangle" size="16"></lucide-icon>
                                {{ 'SETTINGS.SECURITY.SAVE_CODES_WARNING' | translate }}
                             </span>
                             <button (click)="copyCodes()" class="text-primary hover:text-primary-dark text-sm flex items-center gap-1">
                                <lucide-icon [img]="copied() ? Check : Copy" size="14"></lucide-icon>
                                {{ copied() ? ('COMMON.COPIED' | translate) : ('COMMON.COPY' | translate) }}
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
                <h3>{{ 'SETTINGS.SECURITY.ACTIVE_SESSIONS' | translate }}</h3>
                <p>{{ 'SETTINGS.SECURITY.SESSIONS_DESC' | translate }}</p>
            </div>

            <div class="card divide-y divide-border-color">
                <div *ngFor="let session of sessions()" class="p-4 flex items-center justify-between hover:bg-hover-bg transition-colors">
                    <div class="flex items-center gap-4">
                        <div class="p-2 bg-secondary/10 text-secondary rounded-lg">
                            <lucide-icon [img]="Monitor" size="20"></lucide-icon>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-medium text-text-primary">{{ parseUserAgent(session.userAgent) }}</span>
                                <span *ngIf="session.isCurrent" class="px-2 py-0.5 bg-green-500/10 text-green-500 text-xs rounded-full font-medium">{{ 'SETTINGS.SECURITY.CURRENT' | translate }}</span>
                            </div>
                            <div class="text-xs text-text-secondary mt-1 flex gap-3">
                                <span>{{ session.ipAddress }}</span>
                                <span>•</span>
                                <span>{{ session.createdAt | date:'mediumDate' }}</span>
                            </div>
                        </div>
                    </div>

                    <button *ngIf="!session.isCurrent" (click)="revokeSession(session.id)" class="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-500/10 transition-colors" [title]="'SETTINGS.SECURITY.LOGOUT_SESSION' | translate">
                        <lucide-icon [img]="XCircle" size="20"></lucide-icon>
                    </button>
                </div>

                <div *ngIf="sessions().length === 0" class="p-8 text-center text-text-secondary">
                    {{ 'COMMON.LOADING' | translate }}...
                </div>
            </div>
        </div>

    </div>

    <!-- 2FA Setup Modal -->
    <div *ngIf="showSetupModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
         <div class="bg-card-bg border border-border-color rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 class="text-xl font-bold mb-4">{{ 'SETTINGS.SECURITY.SETUP_2FA' | translate }}</h3>
            <div class="space-y-4">
                <div class="bg-card-bg-secondary p-4 rounded-xl text-center">
                    <p class="text-sm font-medium text-text-primary mb-2">{{ 'SETTINGS.SECURITY.SCAN_QR' | translate }}</p>
                    <p class="text-xs text-text-secondary mb-4">{{ 'SETTINGS.SECURITY.OPEN_AUTH_APP' | translate }}</p>

                     <!-- Real QR Code -->
                     <div class="mx-auto w-48 h-48 bg-white flex items-center justify-center rounded-lg border border-border-color p-2">
                        <canvas #qrCanvas></canvas>
                     </div>
                </div>

                <div class="text-center">
                    <p class="text-xs text-text-secondary mb-1">{{ 'SETTINGS.SECURITY.ENTER_MANUALLY' | translate }}:</p>
                    <code class="block p-2 bg-input-bg rounded border border-input-border text-sm font-mono break-all select-all">
                        {{ secretKey }}
                    </code>
                </div>

                <input [formControl]="setupTokenControl" class="form-input text-center tracking-widest text-xl" placeholder="000000" maxlength="6" (keyup.enter)="confirm2fa()" />

                <div class="flex gap-3 mt-6">
                    <button (click)="showSetupModal.set(false)" class="btn btn-secondary flex-1">{{ 'COMMON.CANCEL' | translate }}</button>
                    <button (click)="confirm2fa()" class="btn btn-primary flex-1">{{ 'COMMON.VERIFY' | translate }}</button>
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
    private securityService = inject(SecurityService);
    private authService = inject(AuthService);
    private notificationService = inject(NotificationService);

    @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;

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
    otpauthUrl: string | null = null;
    setupTokenControl = new FormControl('');

    // Shared parser
    parseUserAgent = parseUserAgent;

    constructor() {
        effect(() => {
            if (this.showSetupModal() && this.otpauthUrl) {
                // Wait for view to init then draw
                setTimeout(() => this.generateQRCode(this.otpauthUrl!), 100);
            }
        });
    }

    ngOnInit() {
        this.loadSessions();
        this.check2faStatus();
    }

    check2faStatus() {
        this.is2faEnabled.set(!!this.authService.currentUser()?.isTwoFactorEnabled);
    }

    loadSessions() {
        this.securityService.getSessions().subscribe({
            next: (data) => this.sessions.set(data),
            error: () => this.notificationService.showError('SETTINGS.SECURITY.ERRORS.LOAD_SESSIONS')
        });
    }

    revokeSession(id: string) {
        this.securityService.revokeSession(id).subscribe({
            next: () => {
                this.notificationService.showSuccess('SETTINGS.SECURITY.SESSION_REVOKED');
                this.loadSessions();
            },
            error: () => this.notificationService.showError('SETTINGS.SECURITY.ERRORS.REVOKE_SESSION')
        });
    }

    enable2fa() {
        this.securityService.initiate2faSetup().subscribe({
            next: (res) => {
                this.secretKey = res.secret;
                this.otpauthUrl = res.otpauthUrl;
                this.showSetupModal.set(true);
            },
            error: () => this.notificationService.showError('SETTINGS.SECURITY.ERRORS.INIT_2FA')
        });
    }

    async generateQRCode(url: string) {
        if (!this.qrCanvas) return;
        try {
            await QRCode.toCanvas(this.qrCanvas.nativeElement, url, {
                width: 170,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
        } catch (err) {
            console.error(err);
        }
    }

    confirm2fa() {
        if (!this.setupTokenControl.value) return;
        this.securityService.verifyAndEnable2fa(this.setupTokenControl.value).subscribe({
            next: (res) => {
                this.notificationService.showSuccess('SETTINGS.SECURITY.2FA_ACTIVATED');
                this.is2faEnabled.set(true);
                this.showSetupModal.set(false);
                if (res.backupCodes) {
                    this.backupCodes = res.backupCodes;
                    this.showBackupCodes.set(true);
                }
                // Refresh auth status to update currentUser signal
                this.authService.checkAuthStatus().subscribe();
            },
            error: () => this.notificationService.showError('SETTINGS.SECURITY.ERRORS.INVALID_CODE')
        });
    }

    disable2fa() {
        if(!confirm('¿Estás seguro? Tu cuenta será menos segura.')) return;
        this.securityService.disable2fa().subscribe({
            next: () => {
                this.notificationService.showSuccess('SETTINGS.SECURITY.2FA_DEACTIVATED');
                this.is2faEnabled.set(false);
                this.showBackupCodes.set(false);
                this.authService.checkAuthStatus().subscribe();
            },
            error: () => this.notificationService.showError('SETTINGS.SECURITY.ERRORS.DISABLE_2FA')
        });
    }

    generateBackupCodes() {
        this.securityService.generateBackupCodes().subscribe({
            next: (res) => {
                this.backupCodes = res.codes;
                this.showBackupCodes.set(true);
                this.notificationService.showSuccess('SETTINGS.SECURITY.NEW_CODES_GENERATED');
            },
            error: () => this.notificationService.showError('SETTINGS.SECURITY.ERRORS.GENERATE_CODES')
        });
    }

    copyCodes() {
        navigator.clipboard.writeText(this.backupCodes.join('\\n'));
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
    }
}
