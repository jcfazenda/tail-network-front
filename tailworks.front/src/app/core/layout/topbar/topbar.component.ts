import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { VagasMockService } from '../../../vagas/data/vagas-mock.service';

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
  private readonly router = inject(Router);

  get isSelectionMode(): boolean {
    return this.router.url === '/home' || this.router.url === '/login';
  }

  get isCandidateMode(): boolean {
    return this.router.url.startsWith('/usuario');
  }

  clearPublishedJobsForTesting(): void {
    this.vagasMockService.clearJobs();
  }
}
