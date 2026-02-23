import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  // Por enquanto: libera tudo (sem validação)
  // Depois a gente pluga o AuthService e bloqueia.
  return true;

  // Exemplo futuro:
  // const auth = inject(AuthService);
  // if (auth.isLoggedIn()) return true;
  // router.navigateByUrl('/login');
  // return false;
};