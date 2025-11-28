import { Routes } from '@angular/router';
// Importa el nuevo guard que acabamos de crear.
import { publicGuard } from '../../core/guards/public.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    title: 'Iniciar Sesión | FacturaPRO',
    // Aplica el guard a esta ruta.
    canActivate: [publicGuard],
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    title: 'Crear Cuenta | FacturaPRO',
    // Aplica el guard a esta ruta.
    canActivate: [publicGuard],
    loadComponent: () =>
      import('./register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    // Aplica el guard a esta ruta.
    canActivate: [publicGuard],
    loadComponent: () =>
      import('./forgot-password/forgot-password/forgot-password.page').then(
        (m) => m.ForgotPasswordPage
      ),
  },
  {
    path: 'reset-password',
    // Aplica el guard a esta ruta.
    canActivate: [publicGuard],
    loadComponent: () =>
      import('./reset-password/reset-password.page/reset-password.page').then(
        (m) => m.ResetPasswordPage
      ),
  },
  {
    path: 'set-password',
    title: 'Configurar Contraseña',
    loadComponent: () =>
      import('./set-password/set-password.page').then((m) => m.SetPasswordPage),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
