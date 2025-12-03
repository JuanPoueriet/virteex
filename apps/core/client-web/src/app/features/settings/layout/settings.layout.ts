import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideAngularModule,
  Building,
  Users,
  Palette,
  CreditCard,
  UserCircle,
  Landmark,
  Briefcase,
  Shield,
  Server,
  FileText,
  Lock,
  Workflow,
  Globe,
  Mail,
  Key,
  Database,
  Calculator,
  Percent,
  CalendarClock,
  ArrowRightLeft,
  Settings,
  Bell
} from 'lucide-angular';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
    HasPermissionDirective
  ],
  templateUrl: './settings.layout.html',
  styleUrls: ['./settings.layout.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsLayout {
  // Categoría: Mi Cuenta
  protected readonly MyProfileIcon = UserCircle;
  protected readonly NotificationsIcon = Bell;

  // Categoría: Organización
  protected readonly OrgProfileIcon = Building;
  protected readonly SubsidiariesIcon = Database; // O Building2 si existe
  protected readonly BrandingIcon = Palette;

  // Categoría: Finanzas
  protected readonly AccountingIcon = Calculator;
  protected readonly CurrenciesIcon = ArrowRightLeft; // Cambio
  protected readonly TaxesIcon = Percent;
  protected readonly ClosingIcon = CalendarClock;
  protected readonly IntercompanyIcon = Globe;

  // Categoría: Operaciones
  protected readonly SequencesIcon = FileText;
  protected readonly WorkflowsIcon = Workflow; // O GitBranch
  protected readonly InventoryIcon = Briefcase; // O Package

  // Categoría: Sistema
  protected readonly UsersIcon = Users;
  protected readonly RolesIcon = Shield;
  protected readonly SecurityIcon = Lock;
  protected readonly IntegrationsIcon = Server;
  protected readonly SmtpIcon = Mail;
}
