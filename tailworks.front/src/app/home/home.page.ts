import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
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
  private readonly ecosystemEntryService = inject(EcosystemEntryService);

  protected enterAsRecruiter(event: Event): void {
    event.preventDefault();
    this.ecosystemEntryService.setMode('recruiter');
    void this.router.navigateByUrl('/vagas');
  }

  protected enterAsTalent(event: Event): void {
    event.preventDefault();
    this.ecosystemEntryService.setMode('talent');
    void this.router.navigateByUrl('/usuario/ecossistema');
  }
}
