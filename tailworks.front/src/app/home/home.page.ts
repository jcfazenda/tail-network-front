import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthFacade } from '../core/facades/auth.facade';
import { JobsFacade } from '../core/facades/jobs.facade';
import { EcosystemEntryService } from '../usuario/home/ecosystem-entry.service';

@Component({
  standalone: true,
  selector: 'app-entry-home-page',
  imports: [CommonModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthFacade);
  private readonly ecosystemEntryService = inject(EcosystemEntryService);
  private readonly jobsFacade = inject(JobsFacade);
  protected statusMessage = '';

  constructor() {
    this.authService.bootstrapFreshStart();
  }

  protected enterAsRecruiter(event: Event): void {
    event.preventDefault();
    this.statusMessage = '';

    if (!this.authService.hasSession()) {
      void this.router.navigateByUrl('/login');
      return;
    }

    if (!this.authService.canUseRecruiter()) {
      this.statusMessage = 'Este acesso ainda não tem uma estrutura recruiter vinculada. Entre com um acesso recruiter ou cadastre sua operação primeiro.';
      return;
    }

    if (!this.authService.activateRecruiterWorkspace()) {
      this.statusMessage = 'Nao encontramos um perfil recruiter vinculado a este acesso. Revise o cadastro do time recruiter.';
      return;
    }

    this.ecosystemEntryService.setMode('recruiter');
    void this.router.navigateByUrl('/home/ecossistema');
  }

  protected enterAsTalent(event: Event): void {
    event.preventDefault();
    this.statusMessage = '';

    if (!this.authService.hasSession()) {
      void this.router.navigateByUrl('/login');
      return;
    }

    const session = this.authService.getSession();
    this.ecosystemEntryService.setMode('talent');
    this.jobsFacade.signInAsTalent(session?.name ?? 'Talento', session?.location);
    void this.router.navigateByUrl('/usuario/ecossistema');
  }

  protected resetWorkspace(event: Event): void {
    event.preventDefault();
    this.authService.resetWorkspace();
    this.ecosystemEntryService.setMode('recruiter');
    void this.router.navigateByUrl('/login');
  }
}
