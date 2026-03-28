import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MockJobRecord } from '../../vagas/data/vagas.models';
import { PanelCandidatosListComponent } from '../../panel-candidatos/panel-candidatos-list.component';
import { ProfitLossCardComponent } from '../../grafics/profit-loss-card/profit-loss-card.component';
import { EcossistemaPage } from '../../home/ecossistema/ecossistema.page';

@Component({
  standalone: true,
  selector: 'app-usuario-ecossistema-page',
  imports: [CommonModule, PanelCandidatosListComponent, ProfitLossCardComponent],
  templateUrl: './usuario-ecossistema.page.html',
  styleUrl: './usuario-ecossistema.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioEcossistemaPage extends EcossistemaPage {
  get ecoGridJobs(): MockJobRecord[] {
    return this.talentCompatibleJobs.map((view) => view.job);
  }

  override get paginatedEcoJobs(): MockJobRecord[] {
    const start = this.ecoJobsPage * this.ecoJobsPageSize;
    return this.ecoGridJobs.slice(start, start + this.ecoJobsPageSize);
  }

  override get ecoJobsPageCount(): number {
    return Math.max(1, Math.ceil(this.ecoGridJobs.length / this.ecoJobsPageSize));
  }
}
