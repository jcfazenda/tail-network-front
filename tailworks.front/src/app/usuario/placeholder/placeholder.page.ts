import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { JobsFacade } from '../../core/facades/jobs.facade';
import { RadarLegendItem } from '../../vagas/cadastro/alcance-radar/alcance-radar.component';
import { CandidateStage, JobResponsibilitySection, MockJobRecord, WorkModel } from '../../vagas/data/vagas.models';
import { EcosystemPanelService } from '../ecosystem-panel.service';

type CandidateView = 'applications' | 'radar' | 'declined';
type WorkModelFilter = 'all' | WorkModel;
type CandidatePanelView = 'details' | 'benefits' | 'status';
type OverviewShellView = 'applications' | 'radar' | 'process';
type ProcessCardStep = {
  label: string;
  state: 'done' | 'active' | 'upcoming';
};
type CandidateStack = {
  name: string;
  knowledge: number;
  description: string;
};
type CandidateStatusPreview = {
  label: string;
  completed: boolean;
  active: boolean;
  timeLabel?: string;
  description: string;
  ownerText: string;
};
type ProcessJobGroup = {
  label: string;
  jobs: MockJobRecord[];
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

type ConfettiPiece = {
  left: number;
  top: number;
  offsetX: number;
  offsetY: number;
  color: string;
  delay: number;
  duration: number;
};
type CompanySummaryProfile = {
  name: string;
  followers: string;
  description: string;
  linkedinCount: string;
  logoLabel: string;
  logoUrl?: string;
  monthlyHiringCount?: number;
};

type CandidateBasicProfile = {
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  location: string;
};

type CandidateBasicDraft = {
  profile?: Partial<CandidateBasicProfile>;
  photoPreviewUrl?: string;
};

type CandidateFormationCopyDraft = {
  graduation: string;
  specialization: string;
  endMonth: string;
  endYear: string;
};

@Component({
  standalone: true,
  selector: 'app-candidate-placeholder-page',
  imports: [CommonModule],
  templateUrl: './placeholder.page.html',
  styleUrls: ['./placeholder.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderPage implements OnInit, OnDestroy {
  private static readonly stacksStorageKey = 'tailworks:candidate-stacks-draft:v2';
  private static readonly radarCategoriesStorageKey = 'tailworks:radar-categories-selection:v1';
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';
  private static readonly formationLogoStorageKey = 'tailworks:candidate-experience-logo-draft:v1';

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly jobsFacade = inject(JobsFacade);
  private readonly ecosystemPanelService = inject(EcosystemPanelService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();
  private selectedJobObservedStage: CandidateStage | null = null;
  private candidateCelebrationTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly hiringTrendChartWidth = 820;
  private readonly hiringTrendChartHeight = 280;
  private readonly hiringTrendChartPadding = {
    top: 26,
    right: 24,
    bottom: 26,
    left: 10,
  };

  readonly recruiterName = 'Julio Fazenda';
  readonly recruiterRole = 'Talent Acquisition';
  readonly recruiterAvatar = '/assets/avatars/avatar-default.svg';
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
    { month: 'Mar', fullMonth: 'Março', value: 31 },
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
  readonly companyProfiles: Record<string, CompanySummaryProfile> = {
    'Banco Itaú': {
      name: 'Banco Itaú',
      followers: '5.248.921 seguidores',
      description: 'Banco e serviços financeiros',
      linkedinCount: '5.248.921 no LinkedIn',
      logoLabel: 'it',
      logoUrl: '/assets/images/logo-itau.png',
      monthlyHiringCount: 43,
    },
    Nubank: {
      name: 'Nubank',
      followers: '2.304.114 seguidores',
      description: 'Tecnologia financeira e meios de pagamento',
      linkedinCount: '2.304.114 no LinkedIn',
      logoLabel: 'nu',
      monthlyHiringCount: 31,
    },
    Stone: {
      name: 'Stone',
      followers: '1.128.440 seguidores',
      description: 'Serviços financeiros e tecnologia para negocios',
      linkedinCount: '1.128.440 no LinkedIn',
      logoLabel: 'st',
      monthlyHiringCount: 24,
    },
    'Amazon BR': {
      name: 'Amazon BR',
      followers: '3.102.000 seguidores',
      description: 'Cloud, marketplace e serviços digitais',
      linkedinCount: '3.102.000 no LinkedIn',
      logoLabel: 'am',
      monthlyHiringCount: 37,
    },
    'Magazine Luiza': {
      name: 'Magazine Luiza',
      followers: '2.780.000 seguidores',
      description: 'Varejo digital, logística e tecnologia',
      linkedinCount: '2.780.000 no LinkedIn',
      logoLabel: 'ml',
      monthlyHiringCount: 28,
    },
    'BTG Pactual': {
      name: 'BTG Pactual',
      followers: '1.964.000 seguidores',
      description: 'Banco de investimento e tecnologia financeira',
      linkedinCount: '1.964.000 no LinkedIn',
      logoLabel: 'bt',
      monthlyHiringCount: 22,
    },
    Bradesco: {
      name: 'Bradesco',
      followers: '4.118.000 seguidores',
      description: 'Serviços financeiros, seguros e canais digitais',
      linkedinCount: '4.118.000 no LinkedIn',
      logoLabel: 'br',
      monthlyHiringCount: 26,
    },
    'Stefanini Brasil': {
      name: 'Stefanini Brasil',
      followers: '1.106.000 seguidores',
      description: 'Consultoria, tecnologia e transformação digital',
      linkedinCount: '1.106.000 no LinkedIn',
      logoLabel: 'sb',
      monthlyHiringCount: 19,
    },
  };

  activeView: CandidateView = 'radar';
  workModelFilter: WorkModelFilter = 'all';
  advancedFilterOpen = false;
  activeCandidatePanelView: CandidatePanelView = 'details';
  activeOverviewShellView: OverviewShellView = 'radar';
  showRadarCategoryPicker = false;
  selectedRadarCategoryIds = ['backend', 'frontend', 'cloud', 'devops'];
  processCardsDragging = false;
  talentStacks: CandidateStack[] = [];
  expandedStackDescriptionIndex: number | null = null;
  talentName = 'Julio Fazenda';
  talentEmail = 'jfazenda@gmail.com';
  talentPhone = '(11) 1111-1111';
  talentCityState = 'Rio de Janeiro - RJ';
  talentAvatarUrl = '';
  talentFormationLogoUrl = '/assets/images/formacao-default.png';
  talentFormationHeading = 'Formado em Dez 2025';
  talentGraduation = 'Bacharelado em Sistemas de Informação';
  talentSpecialization = 'Especialização em Arquitetura de Software';
  selectedJobId: string | null = null;
  showProcessesPanel = false;
  selectedJobCheckedDocuments: string[] = [];
  selectedJobDocumentsConsentAccepted = false;
  candidateConfettiPieces: ConfettiPiece[] = [];
  candidateConfettiActive = false;
  private processCardsPointerId: number | null = null;
  private processCardsPointerStartY = 0;
  private processCardsPointerStartScrollTop = 0;
  private processCardsSuppressClick = false;
  private processCardsSuppressClickTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.restoreTalentDraft();
    this.restoreTalentFormationCopy();
    this.restoreTalentFormationLogo();
    this.restoreTalentStacks();
    this.restoreRadarCategorySelection();
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        const jobId = params.get('job');
        const panel = params.get('panel');
        const ecosystem = params.get('ecosystem');
        let shouldCleanupParams = false;

        if (ecosystem === 'open') {
          this.openProcessesPanel();
          shouldCleanupParams = true;
        }

        if (!jobId) {
          if (shouldCleanupParams) {
            void this.router.navigate([], {
              relativeTo: this.route,
              queryParams: {
                ecosystem: null,
                notice: null,
              },
              queryParamsHandling: 'merge',
              replaceUrl: true,
            });
          }
          return;
        }

        const job = this.jobsFacade.getJobById(jobId);
        if (!job) {
          return;
        }

        this.openJobPanel(jobId);
        if (panel === 'details' || panel === 'benefits' || panel === 'status') {
          this.activeCandidatePanelView = panel;
        }
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {
            ecosystem: null,
            job: null,
            panel: null,
            notice: null,
          },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        this.cdr.markForCheck();
      }),
    );
    this.subscriptions.add(
      this.ecosystemPanelService.openRequests$.subscribe(() => {
        if (!this.isApplicationsPage) {
          return;
        }

        this.openProcessesPanel();
        this.cdr.markForCheck();
      }),
    );
    this.subscriptions.add(
      this.jobsFacade.jobsChanged$.subscribe(() => {
        const previousStage = this.selectedJobObservedStage;
        this.syncSelectedJobDocumentState();
        const nextStage = this.selectedJobTalentStage ?? null;

        if (this.selectedJobId && previousStage !== 'contratado' && nextStage === 'contratado') {
          this.activeCandidatePanelView = 'status';
          this.triggerCandidateCelebration();
        }

        this.selectedJobObservedStage = nextStage;
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.clearCandidateCelebrationTimer();
    this.clearProcessCardsSuppressClickTimer();
    this.subscriptions.unsubscribe();
  }

  get title(): string {
    return this.route.snapshot.data['title'] ?? 'Área do Talento';
  }

  get isApplicationsPage(): boolean {
    return this.title === 'Minhas Candidaturas';
  }

  get talentStackScore(): number {
    if (!this.talentStacks.length) {
      return 0;
    }

    const totalKnowledge = this.talentStacks.reduce((sum, stack) => sum + stack.knowledge, 0);
    return Math.round(totalKnowledge / this.talentStacks.length);
  }

  get talentStackRadarItems(): RadarLegendItem[] {
    return [
      {
        label: 'Media de alcance no ecossistema',
        tone: 'high',
        percent: Math.max(34, Math.min(96, this.talentStackScore)),
      },
      {
        label: 'Media de Compatibilidade',
        tone: 'medium',
        detail: this.talentStacks.length ? `Top ${Math.min(this.talentStacks.length, 10)} mapeadas` : 'Sem stacks ainda',
      },
      {
        label: 'Potenciais',
        tone: 'potential',
        count: this.talentStacks.length,
      },
    ];
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

  get activeTalentJobs(): MockJobRecord[] {
    return this.jobsFacade.getJobs()
      .filter((job) => job.status === 'ativas');
  }

  get applicationsCount(): number {
    return this.applicationsShellJobs.length;
  }

  get radarCount(): number {
    return this.radarShellJobs.length;
  }

  get declinedCount(): number {
    return this.activeTalentJobs.filter((job) => this.isDeclinedJob(job)).length;
  }

  get displayedJobs(): MockJobRecord[] {
    const baseJobs =
      this.activeView === 'applications'
        ? this.activeTalentJobs.filter((job) => this.isApplicationsJob(job))
        : this.activeView === 'declined'
          ? this.activeTalentJobs.filter((job) => this.isDeclinedJob(job))
          : this.activeTalentJobs.filter((job) => this.isRadarJob(job));

    if (this.workModelFilter === 'all') {
      return baseJobs;
    }

    return baseJobs.filter((job) => job.workModel === this.workModelFilter);
  }

  get radarPanelJobs(): MockJobRecord[] {
    const baseJobs = this.activeTalentJobs.filter((job) => this.isRadarJob(job));

    if (this.workModelFilter === 'all') {
      return baseJobs;
    }

    return baseJobs.filter((job) => job.workModel === this.workModelFilter);
  }

  get applicationsShellJobs(): MockJobRecord[] {
    return this.activeTalentJobs.filter((job) => this.getTalentStage(job) === 'candidatura');
  }

  get radarShellJobs(): MockJobRecord[] {
    return this.activeTalentJobs.filter((job) => this.isRadarJob(job));
  }

  get inProcessShellJobs(): MockJobRecord[] {
    return this.activeTalentJobs.filter((job) => this.isOverviewProcessJob(job));
  }

  get overviewShellJobs(): MockJobRecord[] {
    switch (this.activeOverviewShellView) {
      case 'applications':
        return this.applicationsShellJobs;
      case 'radar':
        return this.radarShellJobs;
      case 'process':
      default:
        return this.inProcessShellJobs;
    }
  }

  get processJobs(): MockJobRecord[] {
    return this.activeTalentJobs.filter((job) => this.isApplicationsJob(job));
  }

  get processInProgressCount(): number {
    return this.inProcessShellJobs.length;
  }

  get processJobGroups(): ProcessJobGroup[] {
    const stageOrder = new Map<string, number>([
      ['Validando documentos', 0],
      ['Aceito', 1],
      ['Contratação solicitada', 2],
      ['Em processo', 3],
      ['Candidatura enviada', 4],
      ['Contratado', 5],
      ['Ficou pra próxima', 6],
      ['Candidatura cancelada', 7],
      ['Escondido', 8],
    ]);
    const grouped = new Map<string, MockJobRecord[]>();

    for (const job of this.processJobs) {
      const label = this.jobStatusLabel(job);
      const currentGroup = grouped.get(label) ?? [];
      currentGroup.push(job);
      grouped.set(label, currentGroup);
    }

    return [...grouped.entries()]
      .sort((left, right) => (stageOrder.get(left[0]) ?? 999) - (stageOrder.get(right[0]) ?? 999))
      .map(([label, jobs]) => ({ label, jobs }));
  }

  get orderedProcessJobs(): MockJobRecord[] {
    const stageOrder = new Map<string, number>([
      ['Validando documentos', 0],
      ['Aceito', 1],
      ['Contratação solicitada', 2],
      ['Em processo', 3],
      ['Candidatura enviada', 4],
      ['Contratado', 5],
      ['Ficou pra próxima', 6],
      ['Candidatura cancelada', 7],
      ['Talento no radar', 8],
      ['Escondido', 9],
    ]);

    return [...this.overviewShellJobs].sort((left, right) => {
      const stageDiff = (stageOrder.get(this.jobStatusLabel(left)) ?? 999) - (stageOrder.get(this.jobStatusLabel(right)) ?? 999);
      if (stageDiff !== 0) {
        return stageDiff;
      }

      if (right.match !== left.match) {
        return right.match - left.match;
      }

      return left.title.localeCompare(right.title, 'pt-BR');
    });
  }

  get overviewShellEmptyMessage(): string {
    switch (this.activeOverviewShellView) {
      case 'applications':
        return 'Nenhuma candidatura enviada por enquanto.';
      case 'radar':
        return 'Nenhuma vaga disponível no seu radar agora.';
      case 'process':
      default:
        return 'Nenhum processo ativo no momento.';
    }
  }

  processCompanyFollowers(job: MockJobRecord): string {
    return this.processCompanyMonthlyHiringLabel(job);
  }

  processCompanyLogoUrl(job: MockJobRecord): string {
    return job.companyLogoUrl ?? this.companyProfiles[job.company]?.logoUrl ?? '';
  }

  processCompanyLogoLabel(job: MockJobRecord): string {
    return (this.companyProfiles[job.company]?.logoLabel ?? job.company.slice(0, 2)).toUpperCase();
  }

  processCardSeniority(job: MockJobRecord): string {
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

  processCardWorkModel(job: MockJobRecord): string {
    if (job.workModel === 'Remoto') {
      return 'HOME';
    }

    return this.workModelLabel(job.workModel).toUpperCase();
  }

  processCardLocation(job: MockJobRecord): string {
    return job.location.replace(/\s*-\s*/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private processCompanyMonthlyHiringLabel(job: MockJobRecord): string {
    const monthlyHiringCount = this.companyProfiles[job.company]?.monthlyHiringCount ?? Math.max(8, job.radarCount);
    return `${monthlyHiringCount} contratações este mês`;
  }

  processCardSteps(job: MockJobRecord): ProcessCardStep[] {
    const stage = this.getTalentStage(job);

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

  radarWorkModelCount(value: WorkModel): number {
    return this.activeTalentJobs
      .filter((job) => this.isRadarJob(job) && job.workModel === value)
      .length;
  }

  processCardsHandlePointerDown(event: PointerEvent): void {
    const rail = event.currentTarget as HTMLElement | null;
    if (!rail) {
      return;
    }

    this.processCardsPointerId = event.pointerId;
    this.processCardsPointerStartY = event.clientY;
    this.processCardsPointerStartScrollTop = rail.scrollTop;
    this.processCardsDragging = false;
    rail.setPointerCapture(event.pointerId);
  }

  processCardsHandlePointerMove(event: PointerEvent): void {
    if (this.processCardsPointerId !== event.pointerId) {
      return;
    }

    const rail = event.currentTarget as HTMLElement | null;
    if (!rail) {
      return;
    }

    const delta = event.clientY - this.processCardsPointerStartY;
    if (Math.abs(delta) > 3) {
      this.processCardsDragging = true;
    }

    rail.scrollTop = this.processCardsPointerStartScrollTop - delta;
  }

  processCardsHandlePointerUp(event: PointerEvent): void {
    if (this.processCardsPointerId !== event.pointerId) {
      return;
    }

    const rail = event.currentTarget as HTMLElement | null;
    if (rail?.hasPointerCapture(event.pointerId)) {
      rail.releasePointerCapture(event.pointerId);
    }

    if (this.processCardsDragging) {
      this.processCardsSuppressClick = true;
      this.clearProcessCardsSuppressClickTimer();
      this.processCardsSuppressClickTimer = setTimeout(() => {
        this.processCardsSuppressClick = false;
      }, 80);
    }

    this.processCardsPointerId = null;
    this.processCardsDragging = false;
  }

  handleProcessCardClick(jobId: string, event: Event): void {
    if (this.processCardsSuppressClick) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.openJobPanel(jobId);
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

  private clearProcessCardsSuppressClickTimer(): void {
    if (!this.processCardsSuppressClickTimer) {
      return;
    }

    clearTimeout(this.processCardsSuppressClickTimer);
    this.processCardsSuppressClickTimer = null;
  }

  get emptyStateMessage(): string {
    if (this.activeView === 'applications') {
      return this.workModelFilter === 'all'
        ? 'Você ainda não se candidatou a nenhuma vaga.'
        : `Nenhuma candidatura encontrada em ${this.workModelLabel(this.workModelFilter)}.`;
    }

    if (this.activeView === 'declined') {
      return this.workModelFilter === 'all'
        ? 'Você ainda não declinou nenhuma proposta.'
        : `Nenhuma vaga declinada encontrada em ${this.workModelLabel(this.workModelFilter)}.`;
    }

    return this.workModelFilter === 'all'
      ? 'Nenhuma vaga disponível no seu radar agora.'
      : `Nenhuma vaga em ${this.workModelLabel(this.workModelFilter)} no seu radar.`;
  }

  get selectedJobPanel(): MockJobRecord | null {
    if (!this.selectedJobId) {
      return null;
    }

    return this.jobsFacade.getJobById(this.selectedJobId) ?? null;
  }

  get selectedJobCompanyProfile(): CompanySummaryProfile {
    const job = this.selectedJobPanel;
    if (!job) {
      return {
        name: '',
        followers: '',
        description: '',
        linkedinCount: '',
        logoLabel: '',
      };
    }

    const profile = this.companyProfiles[job.company] ?? {
      name: job.company,
      followers: '120.000 seguidores',
      description: 'Empresa em crescimento',
      linkedinCount: '120.000 no LinkedIn',
      logoLabel: job.company.slice(0, 2).toLowerCase(),
    };

    return {
      ...profile,
      followers: this.processCompanyMonthlyHiringLabel(job),
      logoUrl: job.companyLogoUrl || profile.logoUrl,
    };
  }

  get selectedJobStatusPreview(): CandidateStatusPreview[] {
    const job = this.selectedJobPanel;
    if (!job) {
      return [];
    }

    return this.buildCandidateStatusPreview(job);
  }

  get selectedJobFrontResponsibilitySections() {
    const job = this.selectedJobPanel;
    if (!job) {
      return [];
    }

    return job.responsibilitySections.filter((section) => section.pageId === 'front');
  }

  get selectedJobBackResponsibilitySections(): JobResponsibilitySection[] {
    const job = this.selectedJobPanel;
    if (!job) {
      return [];
    }

    const backSections = job.responsibilitySections.filter((section) => section.pageId === 'back');
    if (backSections.length) {
      return backSections;
    }

    if (!job.differentials.length) {
      return [];
    }

    return [
      {
        id: 'candidate-back-fallback',
        pageId: 'back',
        title: 'Diferenciais e pontos de atenção:',
        items: [...job.differentials],
      },
    ];
  }

  get selectedJobContractDescription(): string {
    const job = this.selectedJobPanel;
    if (!job) {
      return 'Não há descrição';
    }

    const parts = [
      `Contratação ${job.contractType} para atuação ${job.workModel.toLowerCase()} em ${job.location}.`,
    ];

    const salary = this.jobSalaryDisplay(job);
    if (salary !== 'Não informada') {
      parts.push(`Proposta base ${salary}.`);
    }

    if (job.allowCandidateSalarySuggestion) {
      parts.push('A empresa permite que o candidato sugira um valor durante a candidatura.');
    }

    if (job.benefits.length) {
      parts.push(`Pacote com ${job.benefits.length} benefícios vinculados a esta oportunidade.`);
    }

    return parts.join(' ').trim() || 'Não há descrição';
  }

  get selectedJobHiringDocuments(): string[] {
    return this.selectedJobPanel?.hiringDocuments ?? [];
  }

  get selectedJobSubmittedDocuments(): string[] {
    return this.selectedJobPanel?.talentSubmittedDocuments ?? [];
  }

  get selectedJobStatusCurrentLabel(): string {
    const job = this.selectedJobPanel;
    if (!job) {
      return '';
    }

    return this.selectedJobStatusPreview[this.getTalentStatusStageIndex(job)]?.label ?? 'Talento no radar';
  }

  get selectedJobStatusCurrentDescription(): string {
    const job = this.selectedJobPanel;
    if (!job) {
      return '';
    }

    if (job.talentDecision === 'hidden') {
      return 'Essa vaga foi escondida por você e não participa mais do seu radar principal.';
    }

    return this.selectedJobStatusPreview[this.getTalentStatusStageIndex(job)]?.description ?? '';
  }

  get canApplySelectedJob(): boolean {
    const job = this.selectedJobPanel;
    if (!job) {
      return false;
    }

    return this.jobsFacade.getTalentWorkflowActions(this.selectedJobTalentStage, job.talentDecision).apply;
  }

  get canCancelSelectedJob(): boolean {
    return this.jobsFacade.getTalentWorkflowActions(
      this.selectedJobTalentStage,
      this.selectedJobPanel?.talentDecision,
    ).cancelApplication;
  }

  get canRespondToProposalSelectedJob(): boolean {
    return this.jobsFacade.getTalentWorkflowActions(
      this.selectedJobTalentStage,
      this.selectedJobPanel?.talentDecision,
    ).respondToProposal;
  }

  get showSelectedJobDocumentsSection(): boolean {
    return this.selectedJobTalentStage === 'aceito';
  }

  get showSelectedJobDocumentsSubmission(): boolean {
    return this.jobsFacade.getTalentWorkflowActions(
      this.selectedJobTalentStage,
      this.selectedJobPanel?.talentDecision,
    ).submitDocuments;
  }

  get showSelectedJobDocumentsSubmittedState(): boolean {
    return false;
  }

  get canSubmitSelectedJobDocuments(): boolean {
    return this.showSelectedJobDocumentsSubmission
      && this.selectedJobHiringDocuments.length > 0
      && this.selectedJobCheckedDocuments.length > 0
      && this.selectedJobDocumentsConsentAccepted;
  }

  get showContractedWelcomeMessage(): boolean {
    return this.selectedJobTalentStage === 'contratado';
  }

  get candidateSalarySuggestionDisplay(): string {
    return this.selectedJobPanel?.allowCandidateSalarySuggestion
      ? 'Candidato pode sugerir um valor'
      : 'Candidato nao pode sugerir valor';
  }

  shouldShowJobStatus(job: MockJobRecord): boolean {
    if (job.talentDecision === 'hidden') {
      return true;
    }

    return this.getTalentStatusStageIndex(job) > 0;
  }

  jobStatusLabel(job: MockJobRecord): string {
    if (job.talentDecision === 'hidden') {
      return 'Escondido';
    }

    switch (this.getTalentStage(job)) {
      case 'candidatura':
        return 'Candidatura enviada';
      case 'processo':
      case 'tecnica':
        return 'Em processo';
      case 'aguardando':
        return 'Contratação solicitada';
      case 'aceito':
        return 'Aceito';
      case 'proxima':
        return 'Ficou pra próxima';
      case 'documentacao':
        return 'Validando documentos';
      case 'contratado':
        return 'Contratado';
      case 'cancelado':
        return 'Candidatura cancelada';
      default:
        return 'Talento no radar';
    }
  }

  processJobBarFill(job: MockJobRecord): string {
    return 'linear-gradient(90deg, rgba(225, 138, 39, 0.98), rgba(242, 179, 26, 0.92) 46%, rgba(252, 237, 204, 0.98))';
  }

  jobCardPrimaryActionLabel(job: MockJobRecord): string {
    const status = this.jobStatusLabel(job);
    return status === 'Talento no radar' ? 'Candidatar-se' : status;
  }

  applyToJob(jobId: string): void {
    this.jobsFacade.applyAsTalent(jobId);
  }

  hideJob(jobId: string): void {
    this.jobsFacade.hideFromTalent(jobId);
  }

  openJobPanel(jobId: string): void {
    this.showProcessesPanel = false;
    this.selectedJobId = jobId;
    this.activeCandidatePanelView = 'details';
    this.syncSelectedJobDocumentState();
    this.selectedJobObservedStage = this.selectedJobTalentStage ?? null;
  }

  closeJobPanel(): void {
    this.selectedJobId = null;
    this.selectedJobCheckedDocuments = [];
    this.selectedJobDocumentsConsentAccepted = false;
    this.selectedJobObservedStage = null;
    this.candidateConfettiActive = false;
    this.clearCandidateCelebrationTimer();
  }

  openProcessesPanel(): void {
    this.activeView = 'radar';
    this.closeJobPanel();
    this.showProcessesPanel = true;
  }

  closeProcessesPanel(): void {
    this.showProcessesPanel = false;
  }

  selectCandidatePanelView(view: CandidatePanelView): void {
    this.activeCandidatePanelView = view;
  }

  applyToSelectedJob(): void {
    if (!this.selectedJobId) {
      return;
    }

    this.jobsFacade.applyAsTalent(this.selectedJobId);
    this.activeCandidatePanelView = 'status';
  }

  acceptSelectedJobProposal(): void {
    if (!this.selectedJobId) {
      return;
    }

    this.jobsFacade.acceptOfferAsTalent(this.selectedJobId);
    this.activeCandidatePanelView = 'status';
    this.syncSelectedJobDocumentState();
  }

  keepSelectedJobForNextOpportunity(): void {
    if (!this.selectedJobId) {
      return;
    }

    this.jobsFacade.keepJobForNextOpportunity(this.selectedJobId);
    this.activeCandidatePanelView = 'status';
  }

  cancelSelectedJobApplication(): void {
    if (!this.selectedJobId) {
      return;
    }

    this.jobsFacade.cancelTalentApplication(this.selectedJobId);
    this.activeCandidatePanelView = 'status';
  }

  toggleSelectedJobHiringDocument(label: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    this.selectedJobCheckedDocuments = checked
      ? Array.from(new Set([...this.selectedJobCheckedDocuments, label]))
      : this.selectedJobCheckedDocuments.filter((item) => item !== label);
  }

  toggleSelectedJobDocumentsConsent(event: Event): void {
    this.selectedJobDocumentsConsentAccepted = (event.target as HTMLInputElement).checked;
  }

  isSelectedJobHiringDocumentChecked(label: string): boolean {
    if (this.showSelectedJobDocumentsSubmission) {
      return this.selectedJobCheckedDocuments.includes(label);
    }

    return this.selectedJobSubmittedDocuments.includes(label);
  }

  submitSelectedJobDocuments(): void {
    if (!this.selectedJobId || !this.canSubmitSelectedJobDocuments) {
      return;
    }

    this.jobsFacade.submitTalentDocuments(
      this.selectedJobId,
      this.selectedJobCheckedDocuments,
      this.selectedJobDocumentsConsentAccepted,
    );
    this.activeCandidatePanelView = 'status';
  }

  setView(view: CandidateView): void {
    this.activeView = view;
  }

  setWorkModelFilter(value: string): void {
    this.workModelFilter = this.isWorkModel(value) ? value : 'all';
  }

  selectAdvancedWorkModelFilter(value: string): void {
    this.setWorkModelFilter(this.workModelFilter === value ? 'all' : value);
    this.advancedFilterOpen = false;
  }

  toggleAdvancedFilter(): void {
    this.advancedFilterOpen = !this.advancedFilterOpen;
  }

  closeAdvancedFilter(): void {
    this.advancedFilterOpen = false;
  }

  setOverviewShellView(view: OverviewShellView): void {
    this.activeOverviewShellView = view;
  }

  get workModelFilterLabel(): string {
    return this.workModelFilter === 'all' ? 'Todos os formatos' : this.workModelLabel(this.workModelFilter);
  }

  toggleStackDescription(index: number): void {
    const current = this.talentStacks[index];

    if (!current?.description.trim()) {
      return;
    }

    this.expandedStackDescriptionIndex = this.expandedStackDescriptionIndex === index ? null : index;
  }

  editTalentStacks(): void {
    void this.router.navigate(['/usuario/stacks']);
  }

  openRadarCategoryPicker(): void {
    this.showRadarCategoryPicker = true;
  }

  closeRadarCategoryPicker(): void {
    this.showRadarCategoryPicker = false;
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
      PlaceholderPage.radarCategoriesStorageKey,
      JSON.stringify(this.selectedRadarCategoryIds),
    );
    this.cdr.markForCheck();
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

  jobSalaryDisplay(job: MockJobRecord): string {
    if (job.showSalaryRangeInCard === false) {
      return 'Não informada';
    }

    return this.formatJobSalary(job.salaryRange) ?? 'Não informada';
  }

  jobCardSalary(job: MockJobRecord): string | null {
    const salary = this.jobSalaryDisplay(job);
    return salary === 'Não informada' ? null : salary;
  }

  private formatJobSalary(value?: string): string | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    return normalized.startsWith('R$') ? normalized : `R$ ${normalized}`;
  }

  private get hasAppliedJobs(): boolean {
    return this.jobsFacade.getJobs()
      .some((job) => job.status === 'ativas' && job.talentDecision === 'applied');
  }

  private buildCandidateStatusPreview(job: MockJobRecord): CandidateStatusPreview[] {
    const stage = this.getTalentStage(job);
    const activeIndex = this.getTalentStatusStageIndex(job);
    const statuses: Array<Pick<CandidateStatusPreview, 'label' | 'timeLabel' | 'description' | 'ownerText'>> = [
      {
        label: 'Talento no radar',
        timeLabel: 'Semana passada',
        description: 'Fui encontrado pelo sistema no radar desta vaga.',
        ownerText: 'Movido pelo sistema',
      },
      {
        label: 'Candidatura enviada',
        timeLabel: 'Agora',
        description: 'Enviei minha candidatura e ela já aparece para o recruiter.',
        ownerText: 'Ação do talento',
      },
      {
        label: 'Em processo',
        timeLabel: 'Em atualização',
        description: 'Meu perfil avançou para as próximas análises do processo.',
        ownerText: 'Ação do recruiter',
      },
      {
        label: 'Contratação Solicitada',
        timeLabel: 'Em atualização',
        description: 'Recebi o avanço para a etapa final de contratação.',
        ownerText: 'Ação do recruiter',
      },
      {
        label:
          stage === 'aceito'
            ? 'Aceito'
            : stage === 'proxima'
              ? 'Ficou pra próxima'
              : 'Aceito / Ficou pra próxima',
        timeLabel: 'Em atualização',
        description:
          stage === 'aceito'
            ? 'Aceitei a proposta e agora posso enviar os documentos da contratação.'
            : stage === 'proxima'
              ? 'Preferi não seguir agora e pedi para continuar disponível para próximas oportunidades.'
              : 'Aqui eu avalio a proposta e decido se aceito ou se prefiro ficar para a próxima.',
        ownerText: 'Ação do talento',
      },
      {
        label: 'Validando documentos',
        timeLabel: 'Em atualização',
        description: 'Depois que enviei meus documentos, o recruiter revisa tudo e dá o ok para seguir.',
        ownerText: 'Ação do recruiter',
      },
      {
        label:
          stage === 'proxima'
            ? 'Não foi desta vez (ou Continua no Radar)'
            : stage === 'contratado'
              ? 'Parabéns Contratado'
              : 'Contratado / Não foi desta vez (ou Continua no Radar)',
        timeLabel: 'Em atualização',
        description:
          stage === 'proxima'
            ? 'Meu ciclo nesta vaga foi encerrado, mas ainda posso ser reencontrado no radar para novas oportunidades.'
            : stage === 'contratado'
              ? 'Minha contratação foi confirmada e o processo foi concluído com sucesso.'
              : 'Com a validação concluída, minha contratação pode ser confirmada ou eu posso voltar ao radar para próximas oportunidades.',
        ownerText: 'Ação do recruiter',
      },
    ];

    return statuses.map((item, index) => ({
      ...item,
      completed: this.isTalentStatusStepCompleted(index, stage),
      active: index === activeIndex,
      timeLabel: this.isTalentStatusStepCompleted(index, stage) ? item.timeLabel : undefined,
    }));
  }

  private getTalentStatusStageIndex(job: MockJobRecord): number {
    if (job.talentDecision === 'hidden') {
      return 0;
    }

    const stage = this.getTalentStage(job);

    switch (stage) {
      case 'candidatura':
        return 1;
      case 'processo':
      case 'tecnica':
        return 2;
      case 'aguardando':
        return 3;
      case 'aceito':
        return 4;
      case 'proxima':
        return 6;
      case 'documentacao':
        return 5;
      case 'contratado':
      case 'cancelado':
        return 6;
      default:
        return 0;
    }
  }

  private get selectedJobTalentStage(): CandidateStage | undefined {
    const job = this.selectedJobPanel;
    if (!job) {
      return undefined;
    }

    return this.getTalentStage(job);
  }

  private getTalentStage(job: MockJobRecord): CandidateStage | undefined {
    return this.jobsFacade.getEffectiveCandidateStage(this.jobsFacade.findTalentCandidate(job));
  }

  private syncSelectedJobDocumentState(): void {
    const job = this.selectedJobPanel;

    if (!job) {
      this.selectedJobCheckedDocuments = [];
      this.selectedJobDocumentsConsentAccepted = false;
      return;
    }

    const allowedDocuments = job.hiringDocuments ?? [];
    const submittedDocuments = (job.talentSubmittedDocuments ?? [])
      .filter((item) => allowedDocuments.includes(item));

    this.selectedJobCheckedDocuments = [...submittedDocuments];
    this.selectedJobDocumentsConsentAccepted = job.talentDocumentsConsentAccepted ?? false;
  }

  private buildCandidateCelebration(): void {
    const colors = ['#f2b31a', '#f8c73c', '#ffd66b', '#3f9170', '#62b290', '#8ecfb4'];
    this.candidateConfettiPieces = Array.from({ length: 420 }, (): ConfettiPiece => {
      const dx = -320 + Math.random() * 640;
      const dy = 360 + Math.random() * 620;

      return {
        left: Math.random() * 100,
        top: -4 + Math.random() * 18,
        offsetX: dx,
        offsetY: dy,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 520,
        duration: 2200 + Math.random() * 1400,
      };
    });
  }

  private triggerCandidateCelebration(): void {
    this.clearCandidateCelebrationTimer();
    this.buildCandidateCelebration();
    this.candidateConfettiActive = true;
    this.cdr.markForCheck();
    this.candidateCelebrationTimer = setTimeout(() => {
      this.candidateConfettiActive = false;
      this.cdr.markForCheck();
      this.candidateCelebrationTimer = null;
    }, 2600);
  }

  private clearCandidateCelebrationTimer(): void {
    if (this.candidateCelebrationTimer !== null) {
      clearTimeout(this.candidateCelebrationTimer);
      this.candidateCelebrationTimer = null;
    }
  }

  private isApplicationsJob(job: MockJobRecord): boolean {
    return job.talentDecision === 'applied' && !this.isDeclinedJob(job);
  }

  private isRadarJob(job: MockJobRecord): boolean {
    return !this.isApplicationsJob(job) && !this.isDeclinedJob(job);
  }

  private isDeclinedJob(job: MockJobRecord): boolean {
    const stage = this.getTalentStage(job);
    return stage === 'proxima' || stage === 'cancelado';
  }

  private isOverviewProcessJob(job: MockJobRecord): boolean {
    const stage = this.getTalentStage(job);
    return stage === 'processo'
      || stage === 'tecnica'
      || stage === 'aguardando'
      || stage === 'aceito'
      || stage === 'documentacao'
      || stage === 'contratado';
  }

  private isTalentStatusStepCompleted(index: number, stage: CandidateStage | undefined): boolean {
    if (stage === 'proxima') {
      return index <= 4 || index === 6;
    }

    switch (stage) {
      case 'candidatura':
        return index <= 1;
      case 'processo':
      case 'tecnica':
        return index <= 2;
      case 'aguardando':
        return index <= 3;
      case 'aceito':
        return index <= 4;
      case 'documentacao':
        return index <= 5;
      case 'contratado':
      case 'cancelado':
        return index <= 6;
      default:
        return index === 0;
    }
  }

  private restoreTalentDraft(): void {
    const rawDraft = localStorage.getItem(PlaceholderPage.basicDraftStorageKey);

    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as CandidateBasicDraft;
      this.talentName = draft.profile?.name?.trim() || this.talentName;
      this.talentEmail = draft.profile?.email?.trim() || this.talentEmail;
      this.talentPhone = draft.profile?.phone?.trim() || this.talentPhone;
      this.talentCityState = this.composeCityState(
        draft.profile?.city,
        draft.profile?.state,
        draft.profile?.location,
      );
      this.talentAvatarUrl = draft.photoPreviewUrl ?? '';
    } catch {
      localStorage.removeItem(PlaceholderPage.basicDraftStorageKey);
    }
  }

  private restoreTalentFormationCopy(): void {
    const rawDraft = localStorage.getItem(PlaceholderPage.formationCopyStorageKey);

    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as Partial<CandidateFormationCopyDraft>;
      const endMonth = draft.endMonth?.trim() || 'Dez';
      const endYear = draft.endYear?.trim() || '2025';
      this.talentFormationHeading = `Formado em ${endMonth} ${endYear}`;
      this.talentGraduation = draft.graduation?.trim() || this.talentGraduation;
      this.talentSpecialization = draft.specialization?.trim() || this.talentSpecialization;
    } catch {
      localStorage.removeItem(PlaceholderPage.formationCopyStorageKey);
    }
  }

  private restoreTalentFormationLogo(): void {
    const savedLogo = localStorage.getItem(PlaceholderPage.formationLogoStorageKey);
    if (savedLogo?.trim()) {
      this.talentFormationLogoUrl = savedLogo.trim();
    }
  }

  private restoreTalentStacks(): void {
    const rawDraft = localStorage.getItem(PlaceholderPage.stacksStorageKey);

    if (!rawDraft) {
      this.talentStacks = this.defaultStacks();
      return;
    }

    try {
      const parsedStacks = JSON.parse(rawDraft) as Array<Partial<CandidateStack> & { name?: string }>;
      const stacks = parsedStacks
        .filter((item) => typeof item.name === 'string' && item.name.trim().length > 0)
        .map((item) => ({
          name: item.name!.trim(),
          knowledge: Math.max(0, Math.min(100, Number(item.knowledge ?? 0) || 0)),
          description: typeof item.description === 'string' ? item.description.trim() : '',
        }));

      this.talentStacks = stacks.length ? stacks : this.defaultStacks();
    } catch {
      localStorage.removeItem(PlaceholderPage.stacksStorageKey);
      this.talentStacks = this.defaultStacks();
    }
  }

  private restoreRadarCategorySelection(): void {
    const rawSelection = localStorage.getItem(PlaceholderPage.radarCategoriesStorageKey);

    if (!rawSelection) {
      return;
    }

    try {
      const parsedSelection = JSON.parse(rawSelection) as unknown;
      const validSelection = Array.isArray(parsedSelection)
        ? parsedSelection.filter(
            (value): value is string =>
              typeof value === 'string' && this.allRadarCategories.some((category) => category.id === value),
          )
        : [];

      if (!validSelection.length) {
        return;
      }

      this.selectedRadarCategoryIds = this.allRadarCategories
        .filter((category) => validSelection.includes(category.id))
        .map((category) => category.id);
    } catch {
      localStorage.removeItem(PlaceholderPage.radarCategoriesStorageKey);
    }
  }

  private composeCityState(city?: string, state?: string, location?: string): string {
    const cityLabel = city?.trim();
    const stateLabel = state?.trim();

    if (cityLabel && stateLabel) {
      return `${cityLabel} - ${stateLabel}`;
    }

    const locationLabel = location?.trim();
    return locationLabel || this.talentCityState;
  }

  private isWorkModel(value: string): value is WorkModel {
    return value === 'Remoto' || value === 'Hibrido' || value === 'Presencial';
  }

  private workModelLabel(value: WorkModel): string {
    if (value === 'Hibrido') {
      return 'Híbrido';
    }

    return value;
  }

  private defaultStacks(): CandidateStack[] {
    return [
      { name: '.NET / C#', knowledge: 80, description: '' },
      { name: 'Entity Framework', knowledge: 65, description: '' },
      { name: 'REST API', knowledge: 75, description: '' },
      { name: 'SQL Server', knowledge: 70, description: '' },
      { name: 'Azure', knowledge: 40, description: '' },
    ];
  }
}
