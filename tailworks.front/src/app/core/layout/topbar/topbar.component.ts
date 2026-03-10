import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { VagasMockService } from '../../../vagas/data/vagas-mock.service';
import { EcosystemEntryService } from '../../../usuario/home/ecosystem-entry.service';

@Component({
  standalone: true,
  selector: 'app-topbar',
  imports: [CommonModule, RouterLink],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  private readonly vagasMockService = inject(VagasMockService);
  private readonly ecosystemEntryService = inject(EcosystemEntryService);
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    effect(() => {
      const url = this.currentUrl();

      if (url === '/home' || url === '/login' || url === '/usuario/ecossistema') {
        return;
      }

      if (url.startsWith('/usuario')) {
        this.ecosystemEntryService.setMode('talent');
        return;
      }

      this.ecosystemEntryService.setMode('recruiter');
    });
  }

  get isSelectionMode(): boolean {
    const url = this.currentUrl();
    return url === '/home' || url === '/login';
  }

  get isCandidateMode(): boolean {
    return this.currentUrl().startsWith('/usuario');
  }

  get isCandidateEcosystem(): boolean {
    return this.currentUrl() === '/usuario/ecossistema';
  }

  get isRecruiterEcosystem(): boolean {
    return this.isCandidateEcosystem && this.ecosystemEntryService.mode() === 'recruiter';
  }

  clearPublishedJobsForTesting(): void {
    this.vagasMockService.clearJobs();
  }

  openCandidateEcosystem(event: Event): void {
    event.preventDefault();
    this.ecosystemEntryService.setMode('talent');
    void this.router.navigateByUrl('/usuario/ecossistema');
  }
}
