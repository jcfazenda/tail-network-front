import { Injectable, inject } from '@angular/core';
import {
  AuthAccount,
  AuthSession,
  MockAuthService,
  RecruiterSignupDraft,
  TalentSignupDraft,
} from '../../auth/mock-auth.service';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly authService = inject(MockAuthService);

  readonly session$ = this.authService.session$;

  bootstrapFreshStart(): void {
    this.authService.bootstrapFreshStart();
  }

  getSession(): AuthSession | null {
    return this.authService.getSession();
  }

  hasSession(): boolean {
    return this.authService.hasSession();
  }

  canUseRecruiter(): boolean {
    return this.authService.canCurrentSessionUseRecruiter();
  }

  canUseTalent(): boolean {
    return this.authService.canCurrentSessionUseTalent();
  }

  activateRecruiterWorkspace(): boolean {
    return this.authService.activateRecruiterWorkspace();
  }

  login(email: string, password?: string): Promise<AuthSession | null> {
    return this.authService.login(email, password);
  }

  loginWithProvider(email: string): Promise<AuthSession | null> {
    return this.authService.loginWithProvider(email);
  }

  logout(): void {
    this.authService.logout();
  }

  registerRecruiterOrganization(draft: RecruiterSignupDraft): AuthAccount {
    return this.authService.registerRecruiterOrganization(draft);
  }

  registerTalent(draft: TalentSignupDraft): AuthAccount {
    return this.authService.registerTalent(draft);
  }

  resetWorkspace(): void {
    this.authService.resetWorkspace();
  }
}
