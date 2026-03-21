import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthFacade } from '../core/facades/auth.facade';

export const recruiterAuthGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthFacade);
  const router = inject(Router);
  authService.bootstrapFreshStart();
  if (!authService.hasSession()) {
    return router.createUrlTree(['/login'], {
      queryParams: {
        returnUrl: state.url,
      },
    });
  }

  authService.activateRecruiterWorkspace();
  return true;
};

export const talentAuthGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthFacade);
  const router = inject(Router);

  authService.bootstrapFreshStart();
  if (!authService.hasSession()) {
    return router.createUrlTree(['/login'], {
      queryParams: {
        returnUrl: state.url,
      },
    });
  }

  if (authService.canUseTalent()) {
    return true;
  }

  if (authService.canUseRecruiter() && authService.activateRecruiterWorkspace()) {
    return router.createUrlTree(['/radar']);
  }

  return router.createUrlTree(['/home']);
};

export const recruiterManageDirectoryGuard: CanActivateFn = () => {
  const authService = inject(AuthFacade);
  const router = inject(Router);
  authService.bootstrapFreshStart();
  if (!authService.hasSession()) {
    return router.createUrlTree(['/login']);
  }

  authService.activateRecruiterWorkspace();
  return true;
};

export const recruiterMasterGuard: CanActivateFn = () => {
  const authService = inject(AuthFacade);
  const router = inject(Router);
  authService.bootstrapFreshStart();
  if (!authService.hasSession()) {
    return router.createUrlTree(['/login']);
  }

  authService.activateRecruiterWorkspace();
  return true;
};
