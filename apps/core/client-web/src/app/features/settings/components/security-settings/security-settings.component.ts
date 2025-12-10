
import { Component, OnInit, ChangeDetectionStrategy, inject, signal, DestroyRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Shield, Smartphone, QrCode, Monitor, Laptop, Globe, AlertTriangle, CheckCircle, MapPin } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth';
import { SecurityService, Session } from '../../../../core/api/security.service';
import { NotificationService } from '../../../../core/services/notification';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QRCodeComponent } from 'angularx-qrcode';
import { FormsModule } from '@angular/forms';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal.component';
import * as L from 'leaflet';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule, QRCodeComponent, FormsModule, ConfirmationModalComponent],
  templateUrl: './security-settings.component.html',
  styleUrls: ['./security-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecuritySettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private securityService = inject(SecurityService);
  private notificationService = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  // Icons
  protected readonly ShieldIcon = Shield;
  protected readonly SmartphoneIcon = Smartphone;
  protected readonly QrCodeIcon = QrCode;
  protected readonly MonitorIcon = Monitor;
  protected readonly LaptopIcon = Laptop;
  protected readonly GlobeIcon = Globe;
  protected readonly AlertTriangleIcon = AlertTriangle;
  protected readonly CheckCircleIcon = CheckCircle;
  protected readonly MapPinIcon = MapPin;

  currentUser = this.authService.currentUser;

  // 2FA State
  is2faEnabled = signal(false);
  showSetup2fa = signal(false);
  qrCodeData = signal<string>('');
  twoFactorSecret = signal<string>('');
  verificationCode = signal('');
  backupCodes = signal<string[]>([]);

  // 10/10 Improvement: Checkbox to confirm backup codes saved
  hasSavedBackupCodes = signal(false);

  // Sessions
  sessions = signal<Session[]>([]);
  expandedSessionId = signal<string | null>(null);
  private map: L.Map | undefined;

  // Confirmation Modal
  showDisableConfirmation = signal(false);

  ngOnInit() {
    this.is2faEnabled.set(!!this.currentUser()?.isTwoFactorEnabled);
    this.loadSessions();
  }

  loadSessions() {
    this.securityService.getActiveSessions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(sessions => this.sessions.set(sessions));
  }

  start2faSetup() {
    this.securityService.generate2faSecret()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.twoFactorSecret.set(res.secret);
          this.qrCodeData.set(res.otpauthUrl);
          this.showSetup2fa.set(true);
          this.backupCodes.set([]); // Reset
          this.hasSavedBackupCodes.set(false);
        },
        error: () => this.notificationService.showError('SETTINGS.SECURITY.ERRORS.SETUP_FAILED')
      });
  }

  verifyAndEnable2fa() {
    if (!this.verificationCode()) return;

    this.securityService.enable2fa(this.verificationCode())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.is2faEnabled.set(true);
          this.backupCodes.set(res.backupCodes);
          this.notificationService.showSuccess('SETTINGS.SECURITY.2FA_ENABLED');
          // Don't close immediately, show backup codes
        },
        error: () => this.notificationService.showError('SETTINGS.SECURITY.ERRORS.INVALID_CODE')
      });
  }

  finish2faSetup() {
      if (this.backupCodes().length > 0 && !this.hasSavedBackupCodes()) {
          this.notificationService.showError('SETTINGS.SECURITY.CONFIRM_BACKUP_CODES');
          return;
      }
      this.showSetup2fa.set(false);
      this.backupCodes.set([]);
      this.verificationCode.set('');
      this.authService.checkAuthStatus().subscribe();
  }

  confirmDisable2fa() {
    this.showDisableConfirmation.set(true);
  }

  onDisableConfirmed() {
    this.showDisableConfirmation.set(false);
    this.securityService.disable2fa()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.is2faEnabled.set(false);
          this.notificationService.showSuccess('SETTINGS.SECURITY.2FA_DISABLED');
          this.authService.checkAuthStatus().subscribe();
        },
        error: () => this.notificationService.showError('SETTINGS.SECURITY.ERRORS.DISABLE_FAILED')
      });
  }

  revokeSession(sessionId: string, event: Event) {
    event.stopPropagation();
    this.securityService.revokeSession(sessionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadSessions();
          this.notificationService.showSuccess('SETTINGS.SECURITY.SESSION_REVOKED');
        },
        error: () => this.notificationService.showError('SETTINGS.SECURITY.ERRORS.REVOKE_FAILED')
      });
  }

  disable2fa() {
    this.confirmDisable2fa();
  }

  toggleSessionDetails(session: Session) {
    if (this.expandedSessionId() === session.id) {
      this.expandedSessionId.set(null);
      this.destroyMap();
    } else {
      this.expandedSessionId.set(session.id);
      setTimeout(() => this.initMap(session), 100); // Wait for DOM
    }
  }

  private initMap(session: Session) {
    this.destroyMap();

    const element = document.getElementById(`map-${session.id}`);
    if (!element) return;
    
    // Default coords if none (e.g. Santo Domingo)
    const lat = session.latitude || 18.4861;
    const lng = session.longitude || -69.9312;

    this.map = L.map(element, {
        center: [lat, lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: ''
    }).addTo(this.map);

    L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: '#F97316', // Orange-500
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1
    }).addTo(this.map);
  }

  private destroyMap() {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }
}
