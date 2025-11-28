// // src/app/core/interceptors/jwt.interceptor.ts

// import { HttpInterceptorFn } from '@angular/common/http';
// import { environment } from '../../../environments/environment';
// import { inject } from '@angular/core';
// import { AuthService } from '../services/auth';

// export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
//     const authService = inject(AuthService);
//     const token = authService.getToken();
//     const isApiUrl = req.url.startsWith(environment.apiUrl);

//     if (token && isApiUrl) {
//         const clonedReq = req.clone({
//             setHeaders: {
//                 Authorization: `Bearer ${token}`,
//             },
//         });
//         return next(clonedReq);
//     }

//     return next(req);
// };