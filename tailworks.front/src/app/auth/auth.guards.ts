import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthFacade } from '../core/facades/auth.facade';
import { RecruitersFacade } from '../core/facades/recruiters.facade';

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

  if (authService.canUseRecruiter() && authService.activateRecruiterWorkspace()) {
    return true;
  }

  return router.createUrlTree(['/home']);
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
  const recruitersFacade = inject(RecruitersFacade);
  const router = inject(Router);

  authService.bootstrapFreshStart();
  if (!authService.hasSession()) {
    return router.createUrlTree(['/login']);
  }

  if (!authService.activateRecruiterWorkspace()) {
    return router.createUrlTree(['/home']);
  }

  const recruiter = recruitersFacade.getCurrentRecruiter();
  if (recruiter.isMaster) {
    return true;
  }

  return router.createUrlTree(['/radar']);
};

export const recruiterMasterGuard: CanActivateFn = () => {
  const authService = inject(AuthFacade);
  const recruitersFacade = inject(RecruitersFacade);
  const router = inject(Router);

  authService.bootstrapFreshStart();
  if (!authService.hasSession()) {
    return router.createUrlTree(['/login']);
  }

  if (!authService.activateRecruiterWorkspace()) {
    return router.createUrlTree(['/home']);
  }

  if (recruitersFacade.getCurrentRecruiter().isMaster) {
    return true;
  }

  return router.createUrlTree(['/radar']);
};
