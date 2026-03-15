import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CandidateProfileModalComponent } from '../chat/candidate-profile-modal.component';
import { ChatCandidate, ChatJob, TailChatPanelComponent } from '../chat/tail-chat-panel.component';
import { PanelCandidatosListComponent } from '../panel-candidatos/panel-candidatos-list.component';
import { JobStatus, MockJobCandidate, MockJobRecord } from '../vagas/data/vagas.models';
import { VagasMockService } from '../vagas/data/vagas-mock.service';
import { AlcanceRadarComponent, RadarLegendItem } from '../vagas/cadastro/alcance-radar/alcance-radar.component';
import { Subscription } from 'rxjs';

interface RadarCategory {
  label: string;
  value: number;
  color: string;
  offset?: number;
}

type CandidateProfileContext = {
  job: ChatJob;
  candidate: ChatCandidate;
  initialTab: 'journey' | 'curriculum';
};

@Component({
  standalone: true,
  selector: 'app-stub-page',
  imports: [CommonModule, TailChatPanelComponent, PanelCandidatosListComponent, AlcanceRadarComponent, CandidateProfileModalComponent],
  templateUrl: './stub.page.html',
  styleUrls: ['./stub.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StubPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vagasMockService = inject(VagasMockService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();

  readonly radarTotal = 87;
  readonly radarDelta = 12;

  readonly radarCategories: RadarCategory[] = [
    { label: 'Backend', value: 92, color: 'linear-gradient(90deg, var(--primary), var(--primary-2))' },
    { label: 'Frontend', value: 81, color: 'linear-gradient(90deg, color-mix(in srgb, var(--primary) 76%, white), var(--primary))' },
    { label: 'Cloud', value: 66, color: 'rgba(176, 184, 194, 0.9)' },
    { label: 'DevOps', value: 55, color: 'rgba(198, 203, 211, 0.9)' },
  ];

  readonly stageLabels = [
    'Contratado',
    'Validando documentos',
    'Aceitou proposta',
    'Contratação Solicitada',
    'Em Processo',
    'Candidatura enviada',
    'Talento no radar',
    'Candidatura cancelada',
  ];

  activeTab: JobStatus = this.resolveInitialTab();
  flippedJobId: string | null = null;

  selectedJobPanel: ChatJob | null = null;
  selectedChatJob: ChatJob | null = null;
  selectedCandidateKey: string | null = null;
  chatStartIndex = 0;
  candidateProfileContext: CandidateProfileContext | null = null;

  constructor() {
    this.subscriptions.add(
      this.vagasMockService.jobsChanged$.subscribe(() => {
        this.refreshOpenedPanels();
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  setTab(tab: JobStatus) {
    this.activeTab = tab;
    this.flippedJobId = null;
  }

  get filteredJobs(): MockJobRecord[] {
    return this.vagasMockService.getJobs().filter((job) => job.status === this.activeTab);
  }

  findJobById(id: string): MockJobRecord {
    return this.vagasMockService.getJobById(id)!;
  }

  openPanel(job: MockJobRecord) {
    if (this.isJobRadarFlipped(job.id)) {
      return;
    }

    this.flippedJobId = null;
    this.selectedJobPanel = this.asChatJob(job);
    this.selectedChatJob = null;
    this.selectedCandidateKey = null;
    this.chatStartIndex = 0;
  }

  toggleJobRadar(jobId: string, event: Event): void {
    event.stopPropagation();
    this.flippedJobId = this.flippedJobId === jobId ? null : jobId;
  }

  isJobRadarFlipped(jobId: string): boolean {
    return this.flippedJobId === jobId;
  }

  editJob(job: MockJobRecord, event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/vagas/cadastro'], {
      queryParams: { edit: job.id },
    });
  }

  openJobChat(job: MockJobRecord, event: Event): void {
    event.stopPropagation();
    this.openPanel(job);
  }

  openCandidate(job: MockJobRecord, index: number) {
    const sortedCandidates = this.sortedCandidatesFor(job);
    const selectedCandidate = sortedCandidates[index];
    const asChatJob = this.asChatJob(job);

    this.selectedCandidateKey = selectedCandidate?.id ?? selectedCandidate?.name ?? null;
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
        return 'Talento no radar';
      case 'contratado':
        return 'Contratado';
      case 'aguardando':
        return 'Contratação Solicitada';
      case 'processo':
        return 'Em Processo';
      case 'tecnica':
        return 'Em Entrevista Técnica';
      case 'aceito':
        return 'Aceito';
      case 'proxima':
        return 'Ficou pra próxima';
      case 'documentacao':
        return 'Validando documentos';
      case 'candidatura':
        return 'Candidatura enviada';
      case 'cancelado':
        return 'Candidatura cancelada';
      default:
        return 'Talento no radar';
    }
  }

  closeChat() {
    this.selectedChatJob = null;
    this.selectedCandidateKey = null;
  }

  handleSidePanelAction(): void {
    if (this.selectedChatJob) {
      this.closeChat();
      return;
    }

    this.closePanel();
  }

  closePanel() {
    this.selectedChatJob = null;
    this.selectedJobPanel = null;
    this.selectedCandidateKey = null;
  }

  openCandidateProfile(context: { job: ChatJob; candidate: ChatCandidate; initialTab: 'journey' | 'curriculum' }): void {
    this.candidateProfileContext = context;
  }

  openCandidateProfileFromList(index: number): void {
    if (!this.selectedJobPanel) {
      return;
    }

    const sortedCandidates = this.sortedCandidatesFor(this.selectedJobPanel) as unknown as ChatCandidate[];
    const candidate = sortedCandidates[index];

    if (!candidate) {
      return;
    }

    this.openCandidateProfile({
      job: this.selectedJobPanel,
      candidate,
      initialTab: 'curriculum',
    });
  }

  openCandidateStatusFromList(index: number): void {
    if (!this.selectedJobPanel) {
      return;
    }

    const sortedCandidates = this.sortedCandidatesFor(this.selectedJobPanel) as unknown as ChatCandidate[];
    const candidate = sortedCandidates[index];

    if (!candidate) {
      return;
    }

    this.openCandidateProfile({
      job: this.selectedJobPanel,
      candidate,
      initialTab: 'journey',
    });
  }

  closeCandidateProfile(): void {
    this.candidateProfileContext = null;
  }

  sortedCandidatesFor(job: MockJobRecord | ChatJob): MockJobCandidate[] {
    const order = ['radar', 'candidatura', 'tecnica', 'processo', 'aguardando', 'aceito', 'documentacao', 'contratado', 'proxima', 'cancelado'];
    return [...job.candidates as MockJobCandidate[]].sort((left, right) => {
      const stageLeft = this.vagasMockService.getEffectiveCandidateStage(left) ?? 'radar';
      const stageRight = this.vagasMockService.getEffectiveCandidateStage(right) ?? 'radar';
      return order.indexOf(stageLeft) - order.indexOf(stageRight);
    });
  }

  jobCardOfferLine(job: MockJobRecord): string {
    const segments: string[] = [job.contractType];
    const salary = job.showSalaryRangeInCard === false ? null : this.formatJobSalary(job.salaryRange);

    if (salary) {
      segments.push(salary);
    }

    let line = segments.join(' - ');

    if (job.benefits.length > 0) {
      line = `${line} + Beneficios`;
    }

    return line;
  }

  jobRadarItems(job: MockJobRecord): RadarLegendItem[] {
    return [
      {
        label: 'Alta compatibilidade',
        tone: 'high',
        percent: Math.max(48, Math.min(94, job.match - 13)),
      },
      {
        label: 'Media de Compatibilidade',
        tone: 'medium',
        detail: '(60-85%)',
      },
      {
        label: 'Potenciais',
        tone: 'potential',
        count: Math.max(job.radarCount, job.talents),
      },
    ];
  }

  private resolveInitialTab(): JobStatus {
    const queryTab = this.route.snapshot.queryParamMap.get('tab');
    if (queryTab === 'ativas' || queryTab === 'rascunhos' || queryTab === 'pausadas' || queryTab === 'encerradas') {
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

  private asChatJob(job: MockJobRecord): ChatJob {
    return {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      workModel: job.workModel,
      hiringDocuments: [...job.hiringDocuments],
      talentSubmittedDocuments: [...(job.talentSubmittedDocuments ?? [])],
      talentDocumentsConsentAccepted: job.talentDocumentsConsentAccepted ?? false,
      techStack: job.techStack.map((item) => ({
        name: item.name,
        match: item.match,
      })),
      candidates: this.sortedCandidatesFor(job).map((candidate) => ({
        ...candidate,
        location: undefined,
      })),
    };
  }

  private refreshOpenedPanels(): void {
    if (!this.selectedJobPanel) {
      return;
    }

    const latestJob = this.vagasMockService.getJobById(this.selectedJobPanel.id);
    if (!latestJob) {
      this.closePanel();
      return;
    }

    this.selectedJobPanel = this.asChatJob(latestJob);

    if (!this.selectedChatJob) {
      return;
    }

    this.selectedChatJob = this.asChatJob(latestJob);

    if (!this.selectedCandidateKey) {
      return;
    }

    const nextIndex = this.selectedChatJob.candidates.findIndex(
      (candidate) => (candidate.id ?? candidate.name) === this.selectedCandidateKey,
    );

    if (nextIndex >= 0) {
      this.chatStartIndex = nextIndex;
    }

    if (!this.candidateProfileContext) {
      return;
    }

    const profileJobMatches = this.candidateProfileContext.job.id === latestJob.id;
    if (!profileJobMatches) {
      return;
    }

    const refreshedProfileJob = this.asChatJob(latestJob);
    const refreshedProfileCandidate = refreshedProfileJob.candidates.find(
      (candidate) => (candidate.id ?? candidate.name) === (this.candidateProfileContext?.candidate.id ?? this.candidateProfileContext?.candidate.name),
    );

    if (!refreshedProfileCandidate) {
      this.candidateProfileContext = null;
      return;
    }

    this.candidateProfileContext = {
      ...this.candidateProfileContext,
      job: refreshedProfileJob,
      candidate: refreshedProfileCandidate,
    };
  }
}
