import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CandidateProfileModalComponent } from '../chat/candidate-profile-modal.component';
import { ChatCandidate, ChatJob, TailChatPanelComponent } from '../chat/tail-chat-panel.component';
import { JobsFacade } from '../core/facades/jobs.facade';
import { BrowserStorageService } from '../core/storage/browser-storage.service';
import { PanelCandidatosListComponent } from '../panel-candidatos/panel-candidatos-list.component';
import { CandidateStage, JobStatus, MockJobCandidate, MockJobRecord, RecruiterIdentity, WorkModel } from '../vagas/data/vagas.models';
import { RadarLegendItem } from '../vagas/cadastro/alcance-radar/alcance-radar.component';
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

type RecruiterBoardView = 'radar' | 'candidaturas' | 'processo' | 'solicitada' | 'contratados';

type RecruiterOwnerFilterOption = {
  id: string;
  label: string;
  count: number;
};

type ProcessCardStep = {
  label: string;
  state: 'done' | 'active' | 'upcoming';
};

@Component({
  standalone: true,
  selector: 'app-stub-page',
  imports: [CommonModule, TailChatPanelComponent, PanelCandidatosListComponent, CandidateProfileModalComponent],
  templateUrl: './stub.page.html',
  styleUrls: [
    './stub.page.shell.scss',
    './stub.page.jobs.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StubPage implements OnDestroy {
  private static readonly radarCategoriesStorageKey = 'tailworks:recruiter-radar-categories-selection:v1';
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobsFacade = inject(JobsFacade);
  private readonly browserStorage = inject(BrowserStorageService);
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
  activeBoardView: RecruiterBoardView = 'radar';
  activeOwnerFilterId = 'all';
  flippedJobId: string | null = null;
  jobsSearchTerm = '';
  showRadarCategoryPicker = false;
  selectedRadarCategoryIds = ['backend', 'frontend', 'cloud', 'devops'];

  selectedJobPanel: ChatJob | null = null;
  selectedChatJob: ChatJob | null = null;
  selectedCandidateKey: string | null = null;
  chatStartIndex = 0;
  candidateProfileContext: CandidateProfileContext | null = null;

  // Drag-to-scroll removed from recruiter cards grid to keep interactions reliable on Safari/macOS.

  constructor() {
    this.restoreRadarCategorySelection();
    this.subscriptions.add(
      this.jobsFacade.jobsChanged$.subscribe(() => {
        this.refreshOpenedPanels();
        this.cdr.markForCheck();
      }),
    );
  }

  get recruiterGreetingName(): string {
    const fullName = this.jobsFacade.getCurrentRecruiterIdentity().name?.trim();
    if (!fullName) {
      return 'Recruiter';
    }

    const firstName = fullName.split(' ')[0]?.trim();
    return firstName || fullName;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.showRadarCategoryPicker) {
      this.closeRadarCategoryPicker();
      return;
    }

    if (this.candidateProfileContext) {
      this.closeCandidateProfile();
      this.cdr.markForCheck();
      return;
    }

    if (this.selectedChatJob) {
      this.closeChat();
      this.cdr.markForCheck();
      return;
    }

    if (this.selectedJobPanel) {
      this.closePanel();
      this.cdr.markForCheck();
    }
  }

  setTab(tab: JobStatus) {
    this.activeTab = tab;
    this.flippedJobId = null;
  }

  setBoardView(view: RecruiterBoardView): void {
    this.activeBoardView = view;
    this.flippedJobId = null;
  }

  setOwnerFilter(filterId: string): void {
    this.activeOwnerFilterId = filterId;
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

    this.browserStorage.setItem(
      StubPage.radarCategoriesStorageKey,
      JSON.stringify(this.selectedRadarCategoryIds),
    );
    this.cdr.markForCheck();
  }

  get currentRecruiter(): RecruiterIdentity {
    return this.jobsFacade.getCurrentRecruiterIdentity();
  }

  get recruiterDisplayName(): string {
    return this.currentRecruiter.name;
  }

  get recruiterDisplayRole(): string {
    return this.currentRecruiter.role;
  }

  get isCurrentRecruiterMaster(): boolean {
    return this.currentRecruiter.isMaster;
  }

  get ownerFilterOptions(): RecruiterOwnerFilterOption[] {
    if (!this.isCurrentRecruiterMaster) {
      return [];
    }

    const options = new Map<string, RecruiterOwnerFilterOption>();
    options.set('all', {
      id: 'all',
      label: 'Todos',
      count: this.accessibleJobs.length,
    });

    for (const recruiter of this.jobsFacade.getRecruitersForCompany(this.currentRecruiter.company)) {
      const count = this.accessibleJobs.filter((job) => job.createdByRecruiterId === recruiter.id).length;
      if (count === 0 && recruiter.id !== this.currentRecruiter.id) {
        continue;
      }

      options.set(recruiter.id, {
        id: recruiter.id,
        label: this.ownerFilterLabel(recruiter),
        count,
      });
    }

    return [...options.values()];
  }

  get filteredJobs(): MockJobRecord[] {
    const normalizedSearch = this.jobsSearchTerm.trim().toLocaleLowerCase('pt-BR');

    return this.scopeJobs
      .filter((job) => this.jobMatchesBoardView(job, this.activeBoardView))
      .filter((job) => {
        if (!normalizedSearch) {
          return true;
        }

        return `${job.title} ${job.company} ${job.location}`
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedSearch);
      });
  }

  get recruiterRadarJobsCount(): number {
    return this.scopeJobs.filter((job) => this.jobMatchesBoardView(job, 'radar')).length;
  }

  get recruiterCandidaturasJobsCount(): number {
    return this.scopeJobs.filter((job) => this.jobMatchesBoardView(job, 'candidaturas')).length;
  }

  get recruiterProcessJobsCount(): number {
    return this.scopeJobs.filter((job) => this.jobMatchesBoardView(job, 'processo')).length;
  }

  get recruiterHiringRequestedJobsCount(): number {
    return this.scopeJobs.filter((job) => this.jobMatchesBoardView(job, 'solicitada')).length;
  }

  get recruiterHiredJobsCount(): number {
    return this.scopeJobs.filter((job) => this.jobMatchesBoardView(job, 'contratados')).length;
  }

  get emptyStateMessage(): string {
    switch (this.activeBoardView) {
      case 'candidaturas':
        return 'Nenhuma vaga com candidaturas enviadas neste recorte.';
      case 'processo':
        return 'Nenhuma vaga com talentos em processo neste recorte.';
      case 'solicitada':
        return 'Nenhuma vaga com contratação solicitada neste recorte.';
      case 'contratados':
        return 'Nenhuma vaga com contratados neste recorte.';
      case 'radar':
      default:
        return 'Nenhuma vaga no radar neste recorte.';
    }
  }

  get emptyStateHint(): string {
    if (this.jobsSearchTerm.trim()) {
      return 'Tente buscar por outro cargo, empresa ou localidade. Você também pode limpar a busca para voltar ao recorte completo.';
    }

    if (this.activeBoardView !== 'radar') {
      return 'Volte para "No Radar" para reabrir a visão mais ampla da vaga antes das movimentações do processo.';
    }

    return 'Assim que novas vagas ou movimentações aparecerem nesse mock, elas entram aqui automaticamente.';
  }

  get shouldShowEmptyResetAction(): boolean {
    return this.activeBoardView !== 'radar' || this.activeOwnerFilterId !== 'all' || this.jobsSearchTerm.trim().length > 0;
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
    const radarTalents = Math.max(0, job.radarCount);
    return `${radarTalents} ${radarTalents === 1 ? 'talento no radar' : 'talentos no radar'}`;
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
    return job.candidates.filter((candidate) => this.jobsFacade.getEffectiveCandidateStage(candidate) !== 'radar').length;
  }

  jobCardHasTalentInteraction(job: MockJobRecord): boolean {
    const talentCandidate = this.jobsFacade.findTalentCandidate(job);
    if (!talentCandidate) {
      return false;
    }

    return this.jobsFacade.getEffectiveCandidateStage(talentCandidate) !== 'radar';
  }

  jobCardTalentAvatarUrl(job: MockJobRecord): string | null {
    if (!this.jobCardHasTalentInteraction(job)) {
      return null;
    }

    const talentCandidate = this.jobsFacade.findTalentCandidate(job);
    return talentCandidate?.avatar?.trim() || this.jobsFacade.getTalentCandidateIdentity().avatar || null;
  }

  findJobById(id: string): MockJobRecord {
    return this.jobsFacade.getJobById(id)!;
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

  forceEdit(jobId: string, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    const url = `/vagas/cadastro?edit=${encodeURIComponent(jobId)}`;

    void this.router.navigate(['/vagas/cadastro'], { queryParams: { edit: jobId } }).then((ok) => {
      if (!ok) {
        window.location.assign(url);
      }
    });

    // Safety net: if navigation is canceled by any overlay/gesture, still go.
    setTimeout(() => {
      if (this.router.url.startsWith('/vagas')) {
        window.location.assign(url);
      }
    }, 0);
  }

  openJobChat(job: MockJobRecord, event: Event): void {
    event.stopPropagation();
    this.openPanel(job);
  }

  // Card click is intentionally disabled (only action buttons trigger actions).

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
      const stageLeft = this.jobsFacade.getEffectiveCandidateStage(left) ?? 'radar';
      const stageRight = this.jobsFacade.getEffectiveCandidateStage(right) ?? 'radar';
      return order.indexOf(stageLeft) - order.indexOf(stageRight);
    });
  }

  jobCardOffer(job: MockJobRecord): { salary: string | null; rest: string } {
    const salary = job.showSalaryRangeInCard === false ? null : this.formatJobSalary(job.salaryRange);
    const benefits = job.benefits.length > 0 ? ' + Beneficios' : '';
    const rest = `${job.contractType}${benefits}.`;
    return { salary, rest };
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

  jobCardSteps(job: MockJobRecord): ProcessCardStep[] {
    const stage = this.pickStageForSteps(job);

    switch (stage) {
      case 'candidatura':
        return [
          { label: 'Candidatura enviada', state: 'active' },
          { label: 'Recruiter movimentou', state: 'upcoming' },
          { label: 'Entrevista agendada', state: 'upcoming' },
        ];
      case 'processo':
        return [
          { label: 'Candidatura enviada', state: 'done' },
          { label: 'Recruiter movimentou', state: 'active' },
          { label: 'Entrevista agendada', state: 'upcoming' },
        ];
      case 'tecnica':
        return [
          { label: 'Recruiter movimentou', state: 'done' },
          { label: 'Entrevista agendada', state: 'active' },
          { label: 'Entrevista finalizada', state: 'upcoming' },
        ];
      case 'aguardando':
        return [
          { label: 'Entrevista agendada', state: 'done' },
          { label: 'Entrevista finalizada', state: 'done' },
          { label: 'Análise', state: 'active' },
        ];
      case 'aceito':
      case 'documentacao':
      case 'contratado':
        return [
          { label: 'Entrevista agendada', state: 'done' },
          { label: 'Entrevista finalizada', state: 'done' },
          { label: 'Análise', state: 'done' },
        ];
      default:
        return [
          { label: 'Candidatura enviada', state: 'upcoming' },
          { label: 'Recruiter movimentou', state: 'upcoming' },
          { label: 'Entrevista agendada', state: 'upcoming' },
        ];
    }
  }

  private resolveInitialTab(): JobStatus {
    const queryTab = this.route.snapshot.queryParamMap.get('tab');
    if (queryTab === 'ativas' || queryTab === 'rascunhos' || queryTab === 'pausadas' || queryTab === 'encerradas') {
      return queryTab;
    }

    return 'ativas';
  }

  private get accessibleJobs(): MockJobRecord[] {
    return this.jobsFacade.getJobs().filter((job) =>
      job.status === this.activeTab && this.jobsFacade.canCurrentRecruiterAccessJob(job),
    );
  }

  private get scopeJobs(): MockJobRecord[] {
    if (!this.isCurrentRecruiterMaster || this.activeOwnerFilterId === 'all') {
      return this.accessibleJobs;
    }

    return this.accessibleJobs.filter((job) => job.createdByRecruiterId === this.activeOwnerFilterId);
  }

  private jobMatchesBoardView(job: MockJobRecord, view: RecruiterBoardView): boolean {
    const effectiveStages = job.candidates
      .map((candidate) => this.jobsFacade.getEffectiveCandidateStage(candidate))
      .filter((stage): stage is NonNullable<typeof stage> => !!stage);

    // "Em Processo" = existe qualquer interação (qualquer estágio que não seja radar).
    const hasAnyInteraction = effectiveStages.some((stage) => stage !== 'radar');

    if (view === 'candidaturas') {
      return effectiveStages.some((stage) => stage === 'candidatura');
    }

    if (view === 'solicitada') {
      return effectiveStages.some((stage) => stage === 'aguardando');
    }

    if (view === 'contratados') {
      return effectiveStages.some((stage) => stage === 'contratado');
    }

    if (view === 'processo') {
      return effectiveStages.some((stage) =>
        stage === 'processo'
        || stage === 'tecnica'
        || stage === 'aceito'
        || stage === 'documentacao',
      );
    }

    // "No meu Radar" = a vaga tem alcance/radar, mas ainda não tem candidatos avançados no status.
    if (hasAnyInteraction) {
      return false;
    }

    return job.radarCount > 0 || effectiveStages.some((stage) => stage === 'radar');
  }

  private pickStageForSteps(job: MockJobRecord): CandidateStage {
    const stages = job.candidates
      .map((candidate) => this.jobsFacade.getEffectiveCandidateStage(candidate))
      .filter((stage): stage is CandidateStage => !!stage);

    const nonRadarStages = stages.filter((stage) => stage !== 'radar');
    return this.pickMaxStage(nonRadarStages) ?? this.pickMaxStage(stages) ?? 'radar';
  }

  private pickMaxStage(stages: CandidateStage[]): CandidateStage | null {
    if (!stages.length) {
      return null;
    }

    const order: CandidateStage[] = ['radar', 'candidatura', 'processo', 'tecnica', 'aguardando', 'aceito', 'documentacao', 'contratado', 'proxima', 'cancelado'];
    let best = stages[0];
    for (const stage of stages) {
      if (order.indexOf(stage) > order.indexOf(best)) {
        best = stage;
      }
    }
    return best;
  }


  private ownerFilterLabel(recruiter: RecruiterIdentity): string {
    const firstName = recruiter.name.split(' ')[0]?.trim();
    return firstName || recruiter.name;
  }

  private formatJobSalary(value?: string): string | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    return normalized.startsWith('R$') ? normalized : `R$ ${normalized}`;
  }

  // (no-op) drag helpers removed

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
    const rawSelection = this.browserStorage.getItem(StubPage.radarCategoriesStorageKey);
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
      this.browserStorage.removeItem(StubPage.radarCategoriesStorageKey);
    }
  }

  resetRecruiterDiscoveryFilters(): void {
    this.activeBoardView = 'radar';
    this.activeOwnerFilterId = 'all';
    this.jobsSearchTerm = '';
    this.flippedJobId = null;
    this.cdr.markForCheck();
  }

  private isJobsGridInteractiveTarget(target: EventTarget | null): boolean {
    const el =
      target instanceof HTMLElement
        ? target
        : (target as { parentElement?: HTMLElement | null } | null)?.parentElement ?? null;
    return !!el?.closest('button, a, input, textarea, select');
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

    const latestJob = this.jobsFacade.getJobById(this.selectedJobPanel.id);
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
