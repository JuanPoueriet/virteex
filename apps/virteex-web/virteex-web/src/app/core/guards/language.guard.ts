// app/core/guards/language.guard.ts (Esta versión es la correcta)

import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { LanguageService } from '../services/language';

export const languageRedirectGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean | UrlTree => {
  const router = inject(Router);
  const languageService = inject(LanguageService);
  const supportedLangs = ['en', 'es'];
  const defaultLang = languageService.getInitialLanguage() || 'es';

  const activatingRoutePath = route.routeConfig?.path;

  // Lógica para la ruta ':lang'
  if (activatingRoutePath === ':lang') {
    const langParam = route.params['lang'];

    if (supportedLangs.includes(langParam)) {
      languageService.setLanguage(langParam);
      return true;
    } else {
      const urlSegments = state.url.split('/').filter(Boolean);
      urlSegments[0] = defaultLang;
      const correctedUrl = `/${urlSegments.join('/')}`;
      return router.createUrlTree([correctedUrl]);
    }
  }

  // Lógica para la ruta comodín '**'
  if (activatingRoutePath === '**') {
    const correctedUrl = `/${defaultLang}${state.url === '/' ? '' : state.url}`;
    return router.createUrlTree([correctedUrl]);
  }

  // Caso de respaldo
  return router.createUrlTree([`/${defaultLang}`]);
};