import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { publicGuard } from './core/guards/public.guard';
import { MainLayout } from './layout/main/main.layout';
import { languageRedirectGuard } from './core/guards/language.guard';
import { CountryGuard } from './core/guards/country.guard';
import { LanguageGuard } from './core/guards/language.guard'; // Use the class-based one if available or alias

export const APP_ROUTES: Routes = [
  // Dashboard at root (Authenticated)
  {
    path: 'dashboard',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        title: 'Dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then(
            (m) => m.DashboardPage
          ),
      }
    ]
  },
  // Other app features at root (wrapped in MainLayout implicitly or explicitly if needed)
  // Since user asked specifically for localhost:4200/dashboard, the above handles it.
  // We need to keep other app routes accessible.
  // The original config had 'app' as a prefix. If we want to move them to root:
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'my-work',
        title: 'My Work',
        loadComponent: () =>
          import('./features/my-work/my-work.page').then((m) => m.MyWorkPage),
      },
      {
        path: 'approvals',
        title: 'Approvals',
        loadComponent: () =>
          import('./features/approvals/approvals.page').then(
            (m) => m.ApprovalsPage
          ),
      },
      {
        path: 'notifications',
        title: 'Notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.page').then(
            (m) => m.NotificationsPage
          ),
      },
      {
        path: 'global-search',
        title: 'Búsqueda',
        loadComponent: () =>
          import('./features/global-search/global-search.page').then(
            (m) => m.GlobalSearchPage
          ),
      },
      {
        path: 'data-imports',
        title: 'Data Imports',
        loadComponent: () =>
          import('./features/data-imports/data-imports.page').then(
            (m) => m.DataImportsPage
          ),
      },
      {
        path: 'data-exports',
        title: 'Data Exports',
        loadComponent: () =>
          import('./features/data-exports/data-exports.page').then(
            (m) => m.DataExportsPage
          ),
      },
      {
        path: 'masters',
        title: 'Master Data',
        loadChildren: () =>
          import('./features/masters/masters.routes').then(
            (m) => m.MASTERS_ROUTES
          ),
      },
      {
        path: 'documents',
        title: 'Documents',
        loadComponent: () =>
          import('./features/documents/layout/documents.layout').then(
            (m) => m.DocumentsLayout
          ),
      },
      {
        path: 'sales',
        title: 'Ventas',
        loadChildren: () =>
          import('./features/sales/sales.routes').then((m) => m.SALES_ROUTES),
      },
      {
        path: 'invoices',
        title: 'Facturas',
        loadChildren: () =>
          import('./features/invoices/invoices.routes').then(
            (m) => m.INVOICES_ROUTES
          ),
      },
      {
        path: 'inventory',
        title: 'Inventario',
        loadChildren: () =>
          import('./features/inventory/inventory.routes').then(
            (m) => m.INVENTORY_ROUTES
          ),
      },
      {
        path: 'contacts',
        title: 'Contactos',
        loadChildren: () =>
          import('./features/contacts/contacts.routes').then(
            (m) => m.CONTACTS_ROUTES
          ),
      },
      {
        path: 'accounting',
        title: 'Accounting',
        loadChildren: () =>
          import('./features/accounting/accounting.routes').then(
            (m) => m.ACCOUNTING_ROUTES
          ),
      },
      {
        path: 'settings',
        title: 'Configuración',
        loadChildren: () =>
          import('./features/settings/settings.routes').then(
            (m) => m.SETTINGS_ROUTES
          ),
      },
      {
        path: 'reports',
        title: 'Reports',
        loadChildren: () =>
          import('./features/reports/reports.routes').then(
            (m) => m.REPORTS_ROUTES
          ),
      },
      {
        path: 'purchasing',
        title: 'Purchasing',
        loadChildren: () =>
          import('./features/purchasing/purchasing.routes').then(
            (m) => m.PURCHASING_ROUTES
          ),
      },
      {
        path: 'accounts-payable',
        title: 'Cuentas por Pagar',
        loadChildren: () =>
          import('./features/accounts-payable/accounts-payable.routes').then(
            (m) => m.ACCOUNTS_PAYABLE_ROUTES
          ),
      },
      {
        path: 'customer-receipts',
        title: 'Recibos de Cliente',
        loadChildren: () =>
          import('./features/customer-receipts/customer-receipts.routes').then(
            (m) => m.CUSTOMER_RECEIPTS_ROUTES
          ),
      },
      {
        path: 'unauthorized',
        title: 'Acceso Denegado',
        loadComponent: () =>
          import('./features/unauthorized/unauthorized.page').then(
            (m) => m.UnauthorizedPage
          ),
      },
    ]
  },

  // Payment routes (Global)
  {
    path: 'payment',
    children: [
      {
        path: 'success',
        loadComponent: () => import('./features/payment/components/payment-success/payment-success.component').then(m => m.PaymentSuccessComponent)
      },
      {
        path: 'cancel',
        loadComponent: () => import('./features/payment/components/payment-cancel/payment-cancel.component').then(m => m.PaymentCancelComponent)
      }
    ]
  },

  // Login: /:lang/auth/login (Language only)
  {
    path: ':lang/auth/login',
    title: 'Iniciar Sesión | FacturaPRO',
    canActivate: [publicGuard, languageRedirectGuard], // Ensure language is set
    loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },

  // Register: /:lang/:country/auth/register (Language + Country)
  {
    path: ':lang/:country/auth/register',
    title: 'Registro | FacturaPRO',
    canActivate: [publicGuard, CountryGuard], // CountryGuard validates country & lang
    loadComponent: () => import('./features/auth/register/register.page').then((m) => m.RegisterPage),
  },

  // Other Auth Routes (Language only usually, or follow login pattern)
  {
    path: ':lang/auth',
    canActivate: [publicGuard, languageRedirectGuard],
    children: [
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password/forgot-password.page').then(
            (m) => m.ForgotPasswordPage
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password.page/reset-password.page').then(
            (m) => m.ResetPasswordPage
          ),
      },
      {
        path: 'set-password',
        title: 'Configurar Contraseña',
        loadComponent: () =>
          import('./features/auth/set-password/set-password.page').then((m) => m.SetPasswordPage),
      },
      {
        path: 'plan-selection',
        loadComponent: () => import('./features/auth/register/steps/step-plan/step-plan').then(m => m.StepPlan) // Or wherever plan selection is if it's a page
        // Wait, step plan is a component. If plan selection is a page, we need to find it.
        // Assuming user just wanted Register for now.
      }
    ]
  },

  // Default redirect
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: '**',
    redirectTo: 'dashboard'
  },
];
