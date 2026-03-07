import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatJob, TailChatPanelComponent } from '../chat/tail-chat-panel.component';
import { PanelCandidatosListComponent } from '../panel-candidatos/panel-candidatos-list.component';
import { JobStatus, MockJobCandidate, MockJobRecord } from '../vagas/data/vagas.models';
import { VagasMockService } from '../vagas/data/vagas-mock.service';

interface RadarCategory {
  label: string;
  value: number;
  color: string;
  offset?: number;
}

@Component({
  standalone: true,
  selector: 'app-stub-page',
  imports: [CommonModule, TailChatPanelComponent, PanelCandidatosListComponent],
  templateUrl: './stub.page.html',
  styleUrls: ['./stub.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StubPage {
  private readonly route = inject(ActivatedRoute);
  private readonly vagasMockService = inject(VagasMockService);

  readonly radarTotal = 87;
  readonly radarDelta = 12;

  readonly radarCategories: RadarCategory[] = [
    { label: 'Backend', value: 92, color: 'linear-gradient(90deg, #f5b300, #f59e0b)' },
    { label: 'Frontend', value: 81, color: 'linear-gradient(90deg, #f6c340, #f5b300)' },
    { label: 'Cloud', value: 66, color: '#d5d9e6' },
    { label: 'DevOps', value: 55, color: '#cacedc' },
  ];

  readonly stageLabels = [
    'Contratação Solicitada',
    'Em Entrevista Técnica',
    'Em Processo',
    'Documentação recebida',
    'Candidatura',
    'Cancelado',
  ];

  activeTab: JobStatus = this.resolveInitialTab();

  selectedJobPanel: ChatJob | null = null;
  selectedChatJob: ChatJob | null = null;
  chatStartIndex = 0;

  setTab(tab: JobStatus) {
    this.activeTab = tab;
  }

  get filteredJobs(): MockJobRecord[] {
    return this.vagasMockService.getJobs().filter((job) => job.status === this.activeTab);
  }

  findJobById(id: string): MockJobRecord {
    return this.vagasMockService.getJobById(id)!;
  }

  openPanel(job: MockJobRecord) {
    const asChatJob: ChatJob = {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      workModel: job.workModel,
      candidates: job.candidates,
    };

    this.selectedJobPanel = asChatJob;
    this.selectedChatJob = null;
    this.chatStartIndex = 0;
  }

  openCandidate(job: MockJobRecord, index: number) {
    const asChatJob: ChatJob = {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      workModel: job.workModel,
      candidates: this.sortedCandidatesFor(job),
    };

    this.selectedJobPanel = asChatJob;
    this.selectedChatJob = asChatJob;
    this.chatStartIndex = index;
  }

  getStageLabel(index: number): string {
    if (index >= 0 && index < this.stageLabels.length) {
      return this.stageLabels[index];
    }

    return this.stageLabels[this.stageLabels.length - 1];
  }

  stageLabel(stage?: MockJobCandidate['stage']): string {
    switch (stage) {
      case 'radar':
        return 'No Radar';
      case 'aguardando':
        return 'Contratação Solicitada';
      case 'processo':
        return 'Em Processo';
      case 'tecnica':
        return 'Em Entrevista Técnica';
      case 'cancelado':
        return 'Cancelado';
      default:
        return 'Em Processo';
    }
  }

  closeChat() {
    this.selectedChatJob = null;
  }

  closePanel() {
    this.selectedChatJob = null;
    this.selectedJobPanel = null;
  }

  sortedCandidatesFor(job: MockJobRecord | ChatJob): MockJobCandidate[] {
    const order = ['radar', 'aguardando', 'tecnica', 'processo', 'documentacao', 'candidatura', 'cancelado'];
    return [...job.candidates as MockJobCandidate[]].sort((left, right) => {
      const stageLeft = left.radarOnly ? 'radar' : (left.stage ?? 'processo');
      const stageRight = right.radarOnly ? 'radar' : (right.stage ?? 'processo');
      return order.indexOf(stageLeft) - order.indexOf(stageRight);
    });
  }

  jobCardOfferLine(job: MockJobRecord): string {
    const segments: string[] = [job.contractType];
    const salary = this.formatJobSalary(job.salaryRange);

    if (salary) {
      segments.push(salary);
    }

    let line = segments.join(' - ');

    if (job.benefits.length > 0) {
      line = `${line} + Beneficios`;
    }

    return line;
  }

  private resolveInitialTab(): JobStatus {
    const queryTab = this.route.snapshot.queryParamMap.get('tab');
    if (queryTab === 'ativas' || queryTab === 'rascunhos' || queryTab === 'encerradas') {
      return queryTab;
    }

    return 'ativas';
  }

  private formatJobSalary(value?: string): string | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    return normalized.startsWith('R$') ? normalized : `R$ ${normalized}`;
  }
}
