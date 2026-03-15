import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CandidateProfileModalComponent } from '../chat/candidate-profile-modal.component';
import { ChatCandidate, ChatJob, TailChatPanelComponent } from '../chat/tail-chat-panel.component';
import { PanelCandidatosListComponent } from '../panel-candidatos/panel-candidatos-list.component';
import { JobStatus, MockJobCandidate, MockJobRecord, WorkModel } from '../vagas/data/vagas.models';
import { VagasMockService } from '../vagas/data/vagas-mock.service';
import { AlcanceRadarComponent, RadarLegendItem } from '../vagas/cadastro/alcance-radar/alcance-radar.component';
import { Subscription } from 'rxjs';

type CandidateProfileContext = {
  job: ChatJob;
  candidate: ChatCandidate;
  initialTab: 'journey' | 'curriculum';
};

type RadarCategory = {
  id: string;
  label: string;
  value: number;
  color: string;
};

type HiringTrendPoint = {
  month: string;
  fullMonth: string;
  value: number;
};

type HiringTrendChartPoint = HiringTrendPoint & {
  x: number;
  y: number;
  xPercent: number;
  yPercent: number;
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
  private static readonly radarCategoriesStorageKey = 'tailworks:recruiter-radar-categories-selection:v1';
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vagasMockService = inject(VagasMockService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();
  private readonly hiringTrendChartWidth = 820;
  private readonly hiringTrendChartHeight = 280;
  private readonly hiringTrendChartPadding = {
    top: 26,
    right: 24,
    bottom: 26,
    left: 10,
  };

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
  readonly radarTotal = 87;
  readonly radarDelta = 12;
  readonly allRadarCategories: RadarCategory[] = [
    { id: 'backend', label: 'Backend', value: 92, color: 'linear-gradient(90deg, var(--primary), var(--primary-2))' },
    { id: 'frontend', label: 'Frontend', value: 81, color: 'linear-gradient(90deg, color-mix(in srgb, var(--primary) 76%, white), var(--primary))' },
    { id: 'cloud', label: 'Cloud', value: 66, color: 'rgba(176, 184, 194, 0.9)' },
    { id: 'devops', label: 'DevOps', value: 55, color: 'rgba(198, 203, 211, 0.9)' },
    { id: 'dados', label: 'Dados', value: 78, color: 'linear-gradient(90deg, rgba(231, 111, 81, 0.96), rgba(244, 162, 97, 0.92))' },
    { id: 'mobile', label: 'Mobile', value: 64, color: 'linear-gradient(90deg, rgba(94, 96, 206, 0.96), rgba(116, 198, 157, 0.9))' },
    { id: 'ia', label: 'IA', value: 73, color: 'linear-gradient(90deg, rgba(239, 71, 111, 0.96), rgba(255, 209, 102, 0.9))' },
    { id: 'seguranca', label: 'Segurança', value: 61, color: 'linear-gradient(90deg, rgba(67, 97, 238, 0.92), rgba(76, 201, 240, 0.88))' },
  ];
  readonly hiringTrendSeries: HiringTrendPoint[] = [
    { month: 'Jan', fullMonth: 'Janeiro', value: 26 },
    { month: 'Fev', fullMonth: 'Fevereiro', value: 21 },
    { month: 'Mar', fullMonth: 'Marco', value: 31 },
    { month: 'Abr', fullMonth: 'Abril', value: 27 },
    { month: 'Mai', fullMonth: 'Maio', value: 35 },
    { month: 'Jun', fullMonth: 'Junho', value: 29 },
    { month: 'Jul', fullMonth: 'Julho', value: 33 },
    { month: 'Ago', fullMonth: 'Agosto', value: 30 },
    { month: 'Set', fullMonth: 'Setembro', value: 41 },
    { month: 'Out', fullMonth: 'Outubro', value: 28 },
    { month: 'Nov', fullMonth: 'Novembro', value: 25 },
    { month: 'Dez', fullMonth: 'Dezembro', value: 16 },
  ];
  readonly hiringTrendScaleValues = [50, 40, 30, 20, 10, 0];

  activeTab: JobStatus = this.resolveInitialTab();
  flippedJobId: string | null = null;
  jobsGridDragging = false;
  showRadarCategoryPicker = false;
  selectedRadarCategoryIds = ['backend', 'frontend', 'cloud', 'devops'];

  selectedJobPanel: ChatJob | null = null;
  selectedChatJob: ChatJob | null = null;
  selectedCandidateKey: string | null = null;
  chatStartIndex = 0;
  candidateProfileContext: CandidateProfileContext | null = null;

  private jobsGridPointerId: number | null = null;
  private jobsGridPointerStartY = 0;
  private jobsGridPointerStartScrollTop = 0;
  private jobsGridSuppressClick = false;
  private jobsGridSuppressClickTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.restoreRadarCategorySelection();
    this.subscriptions.add(
      this.vagasMockService.jobsChanged$.subscribe(() => {
        this.refreshOpenedPanels();
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.clearJobsGridSuppressClickTimer();
  }

  setTab(tab: JobStatus) {
    this.activeTab = tab;
    this.flippedJobId = null;
  }

  openRadarCategoryPicker(): void {
    this.showRadarCategoryPicker = true;
    this.cdr.markForCheck();
  }

  closeRadarCategoryPicker(): void {
    this.showRadarCategoryPicker = false;
    this.cdr.markForCheck();
  }

  isRadarCategorySelected(categoryId: string): boolean {
    return this.selectedRadarCategoryIds.includes(categoryId);
  }

  toggleRadarCategory(categoryId: string): void {
    const alreadySelected = this.isRadarCategorySelected(categoryId);

    if (alreadySelected && this.selectedRadarCategoryIds.length === 1) {
      return;
    }

    const nextSelection = alreadySelected
      ? this.selectedRadarCategoryIds.filter((id) => id !== categoryId)
      : [...this.selectedRadarCategoryIds, categoryId];

    this.selectedRadarCategoryIds = this.allRadarCategories
      .filter((category) => nextSelection.includes(category.id))
      .map((category) => category.id);

    localStorage.setItem(
      StubPage.radarCategoriesStorageKey,
      JSON.stringify(this.selectedRadarCategoryIds),
    );
    this.cdr.markForCheck();
  }

  get filteredJobs(): MockJobRecord[] {
    return this.vagasMockService.getJobs().filter((job) => job.status === this.activeTab);
  }

  get radarCategories(): RadarCategory[] {
    const selectedIds = new Set(this.selectedRadarCategoryIds);

    return this.allRadarCategories
      .filter((category) => selectedIds.has(category.id))
      .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label, 'pt-BR'));
  }

  get hiringTrendChartPoints(): HiringTrendChartPoint[] {
    const { top, right, bottom, left } = this.hiringTrendChartPadding;
    const plotWidth = this.hiringTrendChartWidth - left - right;
    const plotHeight = this.hiringTrendChartHeight - top - bottom;
    const maxValue = this.hiringTrendScaleValues[0];
    const lastIndex = Math.max(this.hiringTrendSeries.length - 1, 1);

    return this.hiringTrendSeries.map((point, index) => {
      const x = left + (plotWidth / lastIndex) * index;
      const y = top + ((maxValue - point.value) / maxValue) * plotHeight;

      return {
        ...point,
        x,
        y,
        xPercent: (x / this.hiringTrendChartWidth) * 100,
        yPercent: (y / this.hiringTrendChartHeight) * 100,
      };
    });
  }

  get hiringTrendLinePath(): string {
    return this.buildSmoothChartPath(this.hiringTrendChartPoints);
  }

  get hiringTrendAreaPath(): string {
    const points = this.hiringTrendChartPoints;
    if (!points.length) {
      return '';
    }

    const linePath = this.buildSmoothChartPath(points);
    const last = points[points.length - 1];
    const first = points[0];
    const baseline = this.hiringTrendChartHeight - this.hiringTrendChartPadding.bottom;

    return `${linePath} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
  }

  get hiringTrendActivePoint(): HiringTrendChartPoint | null {
    return this.hiringTrendChartPoints.find((point) => point.month === 'Jun') ?? this.hiringTrendChartPoints[0] ?? null;
  }

  hiringTrendGridY(value: number): number {
    const { top, bottom } = this.hiringTrendChartPadding;
    const plotHeight = this.hiringTrendChartHeight - top - bottom;
    const maxValue = this.hiringTrendScaleValues[0];

    return top + ((maxValue - value) / maxValue) * plotHeight;
  }

  jobCompanyLogoUrl(job: MockJobRecord): string {
    return job.companyLogoUrl?.trim() ?? '';
  }

  jobCompanyLogoLabel(job: MockJobRecord): string {
    const initials = job.company
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('');

    return (initials || job.company.slice(0, 2)).toUpperCase();
  }

  jobCompanySignal(job: MockJobRecord): string {
    const mappedTalents = Math.max(job.radarCount, job.talents, job.candidates.length);
    return `${mappedTalents} ${mappedTalents === 1 ? 'talento mapeado' : 'talentos mapeados'}`;
  }

  jobCardWorkModel(job: MockJobRecord): string {
    if (job.workModel === 'Remoto') {
      return 'HOME';
    }

    return this.workModelLabel(job.workModel).toUpperCase();
  }

  jobCardLocation(job: MockJobRecord): string {
    return job.location.replace(/\s*-\s*/g, ' ').replace(/\s+/g, ' ').trim();
  }

  jobCardSeniority(job: MockJobRecord): string {
    const seniority = job.seniority?.trim();
    if (seniority) {
      return seniority;
    }

    const normalizedTitle = job.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normalizedTitle.includes('senior')) {
      return 'Senior';
    }

    if (normalizedTitle.includes('pleno')) {
      return 'Pleno';
    }

    if (normalizedTitle.includes('junior')) {
      return 'Junior';
    }

    return 'Especialista';
  }

  jobCardSalary(job: MockJobRecord): string | null {
    return job.showSalaryRangeInCard === false ? null : this.formatJobSalary(job.salaryRange);
  }

  jobCardInteractionCount(job: MockJobRecord): number {
    return job.candidates.filter((candidate) => this.vagasMockService.getEffectiveCandidateStage(candidate) !== 'radar').length;
  }

  jobCardHasTalentInteraction(job: MockJobRecord): boolean {
    const talentCandidate = this.vagasMockService.findTalentCandidate(job);
    if (!talentCandidate) {
      return false;
    }

    return this.vagasMockService.getEffectiveCandidateStage(talentCandidate) !== 'radar';
  }

  jobCardTalentAvatarUrl(job: MockJobRecord): string | null {
    if (!this.jobCardHasTalentInteraction(job)) {
      return null;
    }

    const talentCandidate = this.vagasMockService.findTalentCandidate(job);
    return talentCandidate?.avatar?.trim() || this.vagasMockService.getTalentCandidateIdentity().avatar || null;
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

  jobsGridHandlePointerDown(event: PointerEvent): void {
    const rail = event.currentTarget as HTMLElement | null;
    if (!rail || this.isJobsGridInteractiveTarget(event.target)) {
      return;
    }

    this.jobsGridPointerId = event.pointerId;
    this.jobsGridPointerStartY = event.clientY;
    this.jobsGridPointerStartScrollTop = rail.scrollTop;
    this.jobsGridDragging = false;
    rail.setPointerCapture(event.pointerId);
  }

  jobsGridHandlePointerMove(event: PointerEvent): void {
    if (this.jobsGridPointerId !== event.pointerId) {
      return;
    }

    const rail = event.currentTarget as HTMLElement | null;
    if (!rail) {
      return;
    }

    const delta = event.clientY - this.jobsGridPointerStartY;
    if (Math.abs(delta) > 3) {
      this.jobsGridDragging = true;
    }

    rail.scrollTop = this.jobsGridPointerStartScrollTop - delta;
  }

  jobsGridHandlePointerUp(event: PointerEvent): void {
    if (this.jobsGridPointerId !== event.pointerId) {
      return;
    }

    const rail = event.currentTarget as HTMLElement | null;
    if (rail?.hasPointerCapture(event.pointerId)) {
      rail.releasePointerCapture(event.pointerId);
    }

    if (this.jobsGridDragging) {
      this.jobsGridSuppressClick = true;
      this.clearJobsGridSuppressClickTimer();
      this.jobsGridSuppressClickTimer = setTimeout(() => {
        this.jobsGridSuppressClick = false;
      }, 80);
    }

    this.jobsGridPointerId = null;
    this.jobsGridDragging = false;
  }

  handleJobCardClick(job: MockJobRecord, event: Event): void {
    if (this.jobsGridSuppressClick) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

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

  private clearJobsGridSuppressClickTimer(): void {
    if (!this.jobsGridSuppressClickTimer) {
      return;
    }

    clearTimeout(this.jobsGridSuppressClickTimer);
    this.jobsGridSuppressClickTimer = null;
  }

  private buildSmoothChartPath(points: Array<{ x: number; y: number }>): string {
    if (!points.length) {
      return '';
    }

    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      const midpointX = (current.x + next.x) / 2;
      const midpointY = (current.y + next.y) / 2;

      path += ` Q ${current.x} ${current.y} ${midpointX} ${midpointY}`;
    }

    const last = points[points.length - 1];
    path += ` T ${last.x} ${last.y}`;
    return path;
  }

  private restoreRadarCategorySelection(): void {
    const rawSelection = localStorage.getItem(StubPage.radarCategoriesStorageKey);
    if (!rawSelection) {
      return;
    }

    try {
      const parsedSelection = JSON.parse(rawSelection);
      if (!Array.isArray(parsedSelection)) {
        return;
      }

      const availableIds = new Set(this.allRadarCategories.map((category) => category.id));
      const nextSelection = parsedSelection
        .filter((categoryId): categoryId is string => typeof categoryId === 'string')
        .filter((categoryId) => availableIds.has(categoryId));

      if (nextSelection.length) {
        this.selectedRadarCategoryIds = this.allRadarCategories
          .filter((category) => nextSelection.includes(category.id))
          .map((category) => category.id);
      }
    } catch {
      localStorage.removeItem(StubPage.radarCategoriesStorageKey);
    }
  }

  private isJobsGridInteractiveTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && !!target.closest('button, a, input, textarea, select');
  }

  private workModelLabel(value: WorkModel): string {
    switch (value) {
      case 'Remoto':
        return 'Remoto';
      case 'Hibrido':
        return 'Hibrido';
      case 'Presencial':
      default:
        return 'Presencial';
    }
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
