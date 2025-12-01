import { Routes } from '@angular/router';
import { SettingsLayout } from './layout/settings.layout';
// ✅ CORREGIDO: Se importa el guard
import { permissionsGuard } from '../../core/guards/permissions-guard';

export const SETTINGS_ROUTES: Routes = [
    {
        path: '',
        component: SettingsLayout,
        children: [

             {
                path: 'my-profile',
                title: 'Mi Perfil',
                loadComponent: () => import('./my-profile/my-profile.page').then(m => m.MyProfilePage)
            },
            {
                path: 'profile',
                title: 'Perfil de la Empresa',
                loadComponent: () => import('./company-profile/company-profile.page').then(m => m.CompanyProfilePage)
            },
            {
                path: 'users',
                title: 'Gestión de Usuarios',
                loadComponent: () => import('./user-management/user-management.page').then(m => m.UserManagementPage),
                canActivate: [permissionsGuard],
                data: { permissions: ['users:view'] } // ✅ CORREGIDO: 'permissions' en plural
            },
            {
                path: 'branding',
                title: 'Personalización',
                loadComponent: () => import('./branding/branding.page').then(m => m.BrandingPage)
            },
            {
                path: 'billing',
                title: 'Facturación y Plan',
                loadComponent: () => import('./billing/billing.page').then(m => m.BillingPage)
            },
            {
                path: 'roles',
                title: 'Roles y Permisos',
                // ✅ CORREGIDO: Ruta de importación correcta
                loadComponent: () => import('./roles/roles.page').then(m => m.RolesManagementPage),
                canActivate: [permissionsGuard],
                data: { permissions: ['roles:view'] } // ✅ CORREGIDO: 'permissions' en plural
            },
            { path: '', redirectTo: 'profile', pathMatch: 'full' }
        ]
    }
];