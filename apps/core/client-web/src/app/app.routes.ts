import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { MainLayout } from './layout/main/main.layout';
import { RouteRedirectorComponent } from './core/components/route-redirector/route-redirector';
import { languageInitGuard } from './core/guards/language-init.guard';
import { languageRedirectGuard } from './core/guards/language-redirect.guard';

// Existing imports needed for children routes
// I will keep existing imports dynamic inside routes, but I need to make sure I don't break anything.
// I will copy the children definitions from the previous file content I read.

export const APP_ROUTES: Routes = [
  // 1. Root Redirector: Handles '/' specifically
  // It uses LanguageRedirectGuard to decide whether to go to /dashboard (if logged in) or /:lang/... (if not)
  {
    path: '',
    pathMatch: 'full',
    component: RouteRedirectorComponent,
    canActivate: [languageRedirectGuard]
  },

  // 2. Authenticated Routes (Clean URLs) - e.g. /dashboard, /settings
  // These are at the root level but protected by authGuard.
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then(
            (m) => m.DashboardPage
          ),
      },
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
        path: 'documents',
        loadChildren: () =>
          import('./features/documents/documents.routes').then(
            (m) => m.DOCUMENTS_ROUTES
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
      }
    ]
  },

  // 3. Payment Routes (Can stay at root, or be moved inside auth if needed)
  // Assuming public or hybrid
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

  // 4. Public Routes (Prefixed with :lang)
  {
    path: ':lang',
    canActivate: [languageInitGuard],
    children: [
      {
        path: 'auth',
        children: [
            {
                path: 'login',
                title: 'Iniciar Sesión | FacturaPRO',
                loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
            },
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
            // Load other auth routes that might be shared
             {
                path: '',
                loadChildren: () =>
                import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
            },
        ]
      },
      // If there was a 'home' page it would be here.
      // { path: 'home', ... }
    ]
  },

  // 5. Fallback
  {
    path: '**',
    canActivate: [languageRedirectGuard],
    component: RouteRedirectorComponent, // Or just redirectTo '' to let the guard handle it
  },
];
