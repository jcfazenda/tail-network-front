import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MockAuthService } from './mock-auth.service';
import { RecruiterDirectoryService } from '../recruiter/recruiter-directory.service';

export const recruiterAuthGuard: CanActivateFn = (_route, state) => {
  const authService = inject(MockAuthService);
  const router = inject(Router);

  authService.bootstrapFreshStart();
  if (!authService.hasSession()) {
    return router.createUrlTree(['/login'], {
      queryParams: {
        returnUrl: state.url,
      },
    });
  }

  if (authService.canCurrentSessionUseRecruiter() && authService.activateRecruiterWorkspace()) {
    return true;
  }

  return router.createUrlTree(['/home']);
};

export const talentAuthGuard: CanActivateFn = (_route, state) => {
  const authService = inject(MockAuthService);
  const router = inject(Router);

  authService.bootstrapFreshStart();
  if (authService.hasSession()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: state.url,
    },
  });
};

export const recruiterManageDirectoryGuard: CanActivateFn = () => {
  const authService = inject(MockAuthService);
  const recruiterDirectoryService = inject(RecruiterDirectoryService);
  const router = inject(Router);

  authService.bootstrapFreshStart();
  if (!authService.hasSession()) {
    return router.createUrlTree(['/login']);
  }

  if (!authService.activateRecruiterWorkspace()) {
    return router.createUrlTree(['/home']);
  }

  const recruiter = recruiterDirectoryService.getCurrentRecruiter();
  if (recruiter.isMaster) {
    return true;
  }

  return router.createUrlTree(['/radar']);
};

export const recruiterMasterGuard: CanActivateFn = () => {
  const authService = inject(MockAuthService);
  const recruiterDirectoryService = inject(RecruiterDirectoryService);
  const router = inject(Router);

  authService.bootstrapFreshStart();
  if (!authService.hasSession()) {
    return router.createUrlTree(['/login']);
  }

  if (!authService.activateRecruiterWorkspace()) {
    return router.createUrlTree(['/home']);
  }

  if (recruiterDirectoryService.getCurrentRecruiter().isMaster) {
    return true;
  }

  return router.createUrlTree(['/radar']);
};
