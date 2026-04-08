import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { JobsFacade } from '../../core/facades/jobs.facade';
import { AuthFacade } from '../../core/facades/auth.facade';
import { SidebarVisibilityService } from '../../core/layout/sidebar/sidebar-visibility.service';
import { CandidateStage, MockJobCandidate, MockJobRecord, TechStackItem, WorkModel } from '../../vagas/data/vagas.models';
import { Subscription } from 'rxjs';
import { EcosystemEntryService } from '../../usuario/home/ecosystem-entry.service';
import { EcosystemSearchService } from '../../core/layout/ecosystem-search.service';
import { BrowserStorageService } from '../../core/storage/browser-storage.service';
import { MatchExperienceSignal, MatchScoreBreakdown, MatchTalentProfile } from '../../core/matching/match-domain.models';
import { MatchDomainService } from '../../core/matching/match-domain.service';
import { TalentDirectoryService } from '../../talent/talent-directory.service';
import { MatchingLabService } from '../../core/matching-lab/matching-lab.service';
import { EcosystemJobFiltersService } from '../../core/layout/ecosystem-job-filters.service';
import { EcosystemFilterModalService } from '../../core/layout/ecosystem-filter-modal.service';
import { EcosystemViewFilterService } from '../../core/layout/ecosystem-view-filter.service';
import { MatchLabJobResult, MatchLabRankingEntry } from '../../core/matching-lab/matching-lab.models';
import { TalentProfileStoreService } from '../../talent/talent-profile-store.service';
import { PanelCandidatosListComponent } from '../../panel-candidatos/panel-candidatos-list.component';
import { ChatCandidate, ChatJob } from '../../chat/domain/chat.models';
import { ProfitLossCardComponent } from '../../grafics/profit-loss-card/profit-loss-card.component';

type TalentEcoFilter = 'radar' | 'applications' | 'processo';
type RecruiterEcoFilter = 'radar' | 'candidaturas' | 'processo' | 'solicitada' | 'contratados';
type EcoFilter = TalentEcoFilter | RecruiterEcoFilter;
type OverviewRange = 'week' | 'month' | 'year';

type EcoKpiItem = {
  icon: string;
  value: string;
  suffix: string;
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

type HiredSpotlightStack = {
  label: string;
  tone?: 'dark' | 'light' | 'accent';
};

type HiredSpotlightCard = {
  isNew: boolean;
  name: string;
  roleTitle: string;
  company: string;
  companyLogoUrl: string;
  avatarUrl: string;
  stacks: HiredSpotlightStack[];
};

type StoredCandidateStackChip = {
  id?: string;
  name?: string;
  knowledge?: number;
};

type StoredCandidateStacksDraft = {
  primary?: StoredCandidateStackChip[];
  extra?: StoredCandidateStackChip[];
};

type StoredCandidateExperienceStack = {
  name?: string;
};

type StoredCandidateExperience = {
  role?: string;
  positionLevel?: string;
  companySegment?: string;
  appliedStacks?: StoredCandidateExperienceStack[];
};

type TalentCompatibleJobView = {
  job: MockJobRecord;
  score: MatchScoreBreakdown;
  matchedStacks: TechStackItem[];
  missingStacks: TechStackItem[];
};

type JobCardTalentRow = {
  name: string;
  location: string;
  topStacks: string[];
  avatar: string;
  match: number;
};

type SideRailCandidateCard = {
  id: string;
  name: string;
  role: string;
  status: string;
  isHired: boolean;
  adherence: number;
  adherenceTone: 'high' | 'medium' | 'low';
  summary: string;
  stacks: string[];
  standoutStacks: Array<{
    label: string;
    score: number;
  }>;
  avatarUrl: string;
};

type SideRailCandidateSource = 'ecosystem' | 'job' | 'processo';

@Component({
  standalone: true,
  selector: 'app-ecossistema-page',
  imports: [CommonModule, RouterLink, PanelCandidatosListComponent, ProfitLossCardComponent],
  templateUrl: './ecossistema.page.html',
  styleUrls: ['./ecossistema.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EcossistemaPage implements AfterViewInit, OnDestroy {
  readonly fallbackAvatarUrl = '/assets/avatars/john-doe.jpeg';

  private readonly avatarBadgeCache = new Map<string, Array<{ src: string; label: string }>>();
  private readonly authFacade = inject(AuthFacade);
  private readonly sidebarVisibilityService = inject(SidebarVisibilityService);
  private readonly jobsFacade = inject(JobsFacade);
  private readonly ngZone = inject(NgZone);
  private readonly ecosystemEntryService = inject(EcosystemEntryService);
  private readonly ecosystemSearchService = inject(EcosystemSearchService);
  private readonly browserStorage = inject(BrowserStorageService);
  private readonly matchDomainService = inject(MatchDomainService);
  private readonly talentDirectoryService = inject(TalentDirectoryService);
  private readonly talentProfileStore = inject(TalentProfileStoreService);
  private readonly matchingLabService = inject(MatchingLabService);
  private readonly ecosystemJobFiltersService = inject(EcosystemJobFiltersService);
  private readonly ecosystemFilterModalService = inject(EcosystemFilterModalService);
  private readonly ecosystemViewFilterService = inject(EcosystemViewFilterService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();

  private copyRotationTimer: number | null = null;
  private hiredRotationTimer: number | null = null;
  private hiredAutoScrollInFlight = false;
  private lastManualHiredInteractionAt = 0;
  private resizeListener?: () => void;

  private readonly flippedJobCardIds = new Set<string>();
  private readonly brokenCompanyLogoJobIds = new Set<string>();

  private static readonly radarCategoriesStorageKey = 'tailworks:template-radar-categories-selection:v1';
  private static readonly candidateStacksStorageKey = 'tailworks:candidate-stacks-draft:v5';
  private static readonly candidateExperiencesStorageKey = 'tailworks:candidate-experiences-draft:v1';

  private readonly warmGray = { r: 170, g: 174, b: 180 };
  private readonly brandOrangeDark = { r: 140, g: 76, b: 18 };
  private readonly brandOrangeMid = { r: 188, g: 109, b: 24 };
  private readonly brandOrangeLight = { r: 242, g: 179, b: 26 };

  private jobsSnapshot: MockJobRecord[] = [];
  private copyIndex = 0;

  copyIsFading = false;
  selectedJobPanel: ChatJob | null = null;
  openingRecruiterPanelJobId: string | null = null;
  recruiterPanelProgressCurrent = 0;
  recruiterPanelProgressTotal = 0;

  private recruiterPanelWatchdogTimer: number | null = null;
  private recruiterPanelCountdownTimer: number | null = null;

  readonly hiringCopy = [
    {
      title: 'Olha só quem acabou de ser contratado',
      body:
        'Esses cards mostram, em tempo real, quem acabou de entrar no mercado — cargos, stacks e perfis que indicam para onde as oportunidades estão se movendo. Observe os padrões. É aqui que nascem as próximas vagas.',
    },
    {
      title: 'Enquanto você está aqui… novas contratações estão acontecendo',
      body:
        'Cada contratação aqui não é só um nome — é um sinal. Stacks, cargos e combinações de habilidades que revelam o comportamento do mercado em tempo real e ajudam a antecipar onde estarão as próximas oportunidades.',
    },
    {
      title: 'O mercado não para',
      body:
        'Profissionais sendo contratados agora, mostrando exatamente o que está em alta: tecnologias, cargos e perfis que estão sendo disputados. Se você quer se posicionar melhor, comece observando quem já foi escolhido.',
    },
    {
      title: 'Dá uma olhada nos novos talentos',
      body:
        'Esses são os profissionais que acabaram de ser contratados — e que ajudam a revelar, na prática, o que o mercado está valorizando hoje. Repare nos padrões… eles dizem mais do que qualquer tendência.',
    },
  ] as const;

  @ViewChild('hiredTrack', { static: false }) hiredTrack?: ElementRef<HTMLDivElement>;
  @ViewChild('sideCandidatesScroller', { static: false }) sideCandidatesScroller?: ElementRef<HTMLDivElement>;

  activeHiredIndex = 0;
  readonly showHiringTrendFooter = false;
  hiredPageCount = 1;
  hiredPages: number[] = [0];
  sideRailCandidateSource: SideRailCandidateSource = 'ecosystem';
  ecoFilter: EcoFilter = 'radar';
  ecoJobsPage = 0;
  readonly ecoJobsPageSize = 6;
  selectedSideRailRecentJobId: string | null = null;
  overviewRange: OverviewRange = 'week';
  private hiredSpotlightDeck: HiredSpotlightCard[] = [];
  sideCandidatesDragging = false;
  private sideCandidatesPointerId: number | null = null;
  private sideCandidatesDragStartY = 0;
  private sideCandidatesDragStartScrollTop = 0;

  readonly hiredSpotlights: HiredSpotlightCard[] = [
    {
      isNew: true,
      name: 'Gabriela Lima',
      roleTitle: 'Backend .NET',
      company: 'XP Inc.',
      companyLogoUrl: '/assets/images/logo-itau.png',
      avatarUrl: '/assets/images/polaroid/gabriela-lima.png',
      stacks: [
        { label: 'C#', tone: 'dark' },
        { label: '.NET', tone: 'dark' },
      ],
    },
    {
      isNew: true,
      name: 'Lucas Pereira',
      roleTitle: 'Frontend',
      company: 'iFood',
      companyLogoUrl: '/assets/images/logo-nubank.png',
      avatarUrl: '/assets/images/polaroid/lucas-pereira.png',
      stacks: [
        { label: 'React', tone: 'accent' },
        { label: 'TypeScript', tone: 'dark' },
      ],
    },
    {
      isNew: true,
      name: 'Daniela Costa',
      roleTitle: 'Backend Java',
      company: 'Nubank',
      companyLogoUrl: '/assets/images/logo-nubank.png',
      avatarUrl: '/assets/images/polaroid/daniela-costa.png',
      stacks: [
        { label: 'Java', tone: 'accent' },
        { label: 'Spring Boot', tone: 'light' },
      ],
    },
    {
      isNew: true,
      name: 'Marcos Oliveira',
      roleTitle: 'Data Scientist',
      company: 'Creditas',
      companyLogoUrl: '/assets/images/logo-itau.png',
      avatarUrl: '/assets/images/polaroid/marcos-oliveira.png',
      stacks: [
        { label: 'Python', tone: 'accent' },
        { label: 'AWS', tone: 'dark' },
      ],
    },
    {
      isNew: false,
      name: 'Cintia Norma',
      roleTitle: 'Backend Go',
      company: 'Stone',
      companyLogoUrl: '/assets/images/logo-itau.png',
      avatarUrl: '/assets/images/polaroid/cintia-norma.png',
      stacks: [
        { label: 'Go', tone: 'accent' },
        { label: 'Google Cloud', tone: 'light' },
      ],
    },
    {
      isNew: false,
      name: 'Juliana Oliveira',
      roleTitle: 'Mobile',
      company: 'Mercado Livre',
      companyLogoUrl: '/assets/images/logo-nubank.png',
      avatarUrl: '/assets/images/polaroid/juliana-oliveira.png',
      stacks: [
        { label: 'Kotlin', tone: 'accent' },
        { label: 'Flutter', tone: 'dark' },
      ],
    },
    {
      isNew: false,
      name: 'Mario Solaro',
      roleTitle: 'DevOps',
      company: 'Globo',
      companyLogoUrl: '/assets/images/logo-nubank.png',
      avatarUrl: '/assets/images/polaroid/mario-solaro.png',
      stacks: [
        { label: 'AWS', tone: 'accent' },
        { label: 'Terraform', tone: 'dark' },
      ],
    },
  ];

  readonly radarTotal = 87;
  readonly radarDelta = 12;
  readonly allRadarCategories: RadarCategory[] = [
    {
      id: 'backend',
      label: 'Backend',
      value: 92,
      color: 'linear-gradient(90deg, rgba(188, 109, 24, 0.98), rgba(225, 138, 39, 0.96) 58%, rgba(242, 179, 26, 0.96))',
    },
    {
      id: 'frontend',
      label: 'Frontend',
      value: 81,
      color: 'linear-gradient(90deg, rgba(170, 94, 18, 0.98), rgba(214, 122, 32, 0.96) 54%, rgba(242, 179, 26, 0.9))',
    },
    {
      id: 'dados',
      label: 'Dados',
      value: 78,
      color: 'linear-gradient(90deg, rgba(140, 76, 18, 0.98), rgba(188, 109, 24, 0.96) 54%, rgba(225, 138, 39, 0.92))',
    },
    {
      id: 'cloud',
      label: 'Cloud',
      value: 66,
      color: 'linear-gradient(90deg, rgba(188, 109, 24, 0.72), rgba(225, 138, 39, 0.62) 58%, rgba(242, 179, 26, 0.58))',
    },
    {
      id: 'devops',
      label: 'DevOps',
      value: 55,
      color: 'linear-gradient(90deg, rgba(140, 76, 18, 0.66), rgba(188, 109, 24, 0.58) 58%, rgba(225, 138, 39, 0.54))',
    },
    {
      id: 'mobile',
      label: 'Mobile',
      value: 64,
      color: 'linear-gradient(90deg, rgba(188, 109, 24, 0.86), rgba(242, 179, 26, 0.82) 58%, rgba(225, 138, 39, 0.84))',
    },
    {
      id: 'ia',
      label: 'IA',
      value: 73,
      color: 'linear-gradient(90deg, rgba(170, 94, 18, 0.92), rgba(225, 138, 39, 0.86) 52%, rgba(140, 76, 18, 0.92))',
    },
    {
      id: 'seguranca',
      label: 'Segurança',
      value: 61,
      color: 'linear-gradient(90deg, rgba(140, 76, 18, 0.86), rgba(188, 109, 24, 0.84) 58%, rgba(242, 179, 26, 0.72))',
    },
  ];

  private readonly defaultRadarCategoryIds = [
    'backend',
    'frontend',
    'ia',
    'cloud',
    'mobile',
    'seguranca',
    'devops',
  ];

  showRadarCategoryPicker = false;
  selectedRadarCategoryIds = [...this.defaultRadarCategoryIds];
  readonly sidebarOpen = this.sidebarVisibilityService.isOpen;

  constructor() {
    this.preloadHiredSpotlightAssets();
    this.refreshHiredDeck();
    this.restoreRadarCategorySelection();
    this.refreshJobs();
    void this.ensureSyncedJobs();
    void this.ensureSyncedTalentProfiles();

    this.subscriptions.add(
      this.jobsFacade.jobsChanged$.subscribe(() => {
        this.refreshJobs();
        this.cdr.markForCheck();
      }),
    );

    if (typeof window !== 'undefined') {
      this.copyRotationTimer = window.setInterval(() => this.rotateHiringCopy(), 9000);
      this.hiredRotationTimer = window.setInterval(() => this.autoAdvanceHired(), 16000);
      this.resizeListener = () => this.syncHiredPagination(true);
      window.addEventListener('resize', this.resizeListener, { passive: true });
    }

    effect(() => {
      this.ecosystemSearchService.query();
      this.cdr.markForCheck();
    });

    effect(() => {
      this.ecosystemEntryService.mode();
      if (!this.ecoFilters.some((item) => item.id === this.ecoFilter)) {
        this.ecoFilter = 'radar';
        this.ecosystemViewFilterService.setSelected(this.ecoFilter);
        this.cdr.markForCheck();
      }
    });

    effect(() => {
      const selected = this.ecosystemViewFilterService.selected() as EcoFilter;
      if (this.ecoFilters.some((item) => item.id === selected) && this.ecoFilter !== selected) {
        this.ecoFilter = selected;
        this.cdr.markForCheck();
      }
    });
  }

  get desktopVisibleHiredCards(): HiredSpotlightCard[] {
    const cards = this.hiredSpotlightDeck;
    if (!cards.length) {
      return [];
    }

    const visibleCount = typeof window !== 'undefined' && window.innerWidth >= 1180 ? 3 : 2;
    const startIndex = this.activeHiredIndex % cards.length;

    return Array.from({ length: Math.min(visibleCount, cards.length) }, (_item, index) => (
      cards[(startIndex + index) % cards.length]
    ));
  }

  get activeHiringCopy() {
    return this.hiringCopy[this.copyIndex];
  }

  get isTalentEcosystemMode(): boolean {
    return this.ecosystemEntryService.getMode() === 'talent';
  }

  get ecoFilters(): Array<{ id: EcoFilter; label: string }> {
    if (this.isTalentEcosystemMode) {
      return [
        { id: 'radar', label: 'Vagas no Radar' },
        { id: 'applications', label: 'Minhas Candidaturas' },
        { id: 'processo', label: 'Em Progresso' },
      ];
    }

    return [
      { id: 'radar', label: 'No Radar' },
      { id: 'candidaturas', label: 'Candidaturas' },
      { id: 'processo', label: 'Em Progresso' },
      { id: 'solicitada', label: 'Contratação solicitada' },
      { id: 'contratados', label: 'Contratados' },
    ];
  }

  get ecoTopFilters(): Array<{ id: EcoFilter; label: string }> {
    if (this.isTalentEcosystemMode) {
      return this.ecoFilters;
    }

    return this.ecoFilters.filter((item) =>
      item.id === 'radar' || item.id === 'candidaturas' || item.id === 'processo' || item.id === 'contratados'
    );
  }

  ecoFilterIcon(filter: EcoFilter): string | null {
    if (filter === 'processo') {
      return 'autorenew';
    }

    if (filter === 'contratados') {
      return 'star';
    }

    return null;
  }

  get ecoKpisLeft(): EcoKpiItem[] {
    const jobs = this.ecoFilteredJobs;
    const jobCount = jobs.length;
    const talents = jobs.reduce((sum, job) => sum + (job.talents ?? 0), 0);
    const avgSalary = this.computeAverageSalary(jobs);

    return [
      { icon: 'work', value: `${jobCount}`, suffix: 'vagas abertas' },
      { icon: 'payments', value: avgSalary ? `R$ ${avgSalary}` : 'R$ --', suffix: 'média' },
      { icon: 'groups', value: `${talents}`, suffix: 'talentos' },
    ];
  }

  get ecoAderenciaKpi(): EcoKpiItem {
    const jobs = this.ecoFilteredJobs;
    const jobCount = jobs.length;
    const avgMatch = jobCount
      ? Math.round(jobs.reduce((sum, job) => sum + (job.match ?? 0), 0) / jobCount)
      : 0;

    return { icon: 'trending_up', value: `${avgMatch}%`, suffix: 'aderência' };
  }

  get recruiterBoardSummary(): EcoKpiItem[] {
    const jobs = this.ecoFilteredJobs;
    const avgSalary = this.computeAverageSalary(jobs);
    const stageLabel = this.recruiterSummaryStageLabel;
    const stageTotal = jobs.reduce((sum, job) => {
      if (this.ecoFilter === 'radar') {
        return sum + (job.radarCount ?? 0);
      }

      return sum + this.jobStageCount(job, this.ecoFilter as RecruiterEcoFilter);
    }, 0);

    return [
      { icon: 'payments', value: avgSalary ? `R$ ${avgSalary}` : 'R$ --', suffix: 'total de R$' },
      { icon: 'work', value: `${jobs.length}`, suffix: 'total de cards' },
      { icon: 'group', value: `${stageTotal}`, suffix: stageLabel },
    ];
  }

  get recruiterPanelDisplayName(): string {
    return this.jobsFacade.getCurrentRecruiterIdentity().name;
  }

  get recruiterPanelDisplayRole(): string {
    return this.jobsFacade.getCurrentRecruiterIdentity().role;
  }

  get selectedJobPanelCompanyLogoUrl(): string | null {
    if (!this.selectedJobPanel) {
      return null;
    }

    const job = this.jobsFacade.getJobById(this.selectedJobPanel.id);
    return job ? this.jobCompanyLogoUrl(job) : null;
  }

  get selectedJobPanelCompanyLogoLabel(): string {
    if (!this.selectedJobPanel) {
      return '';
    }

    const job = this.jobsFacade.getJobById(this.selectedJobPanel.id);
    return job ? this.jobCompanyLogoLabel(job) : this.selectedJobPanel.company.slice(0, 2).toUpperCase();
  }

  get selectedJobPanelDisplayTitle(): string {
    if (!this.selectedJobPanel) {
      return '';
    }

    const job = this.jobsFacade.getJobById(this.selectedJobPanel.id);
    if (!job) {
      return this.selectedJobPanel.title;
    }

    return job.title;
  }

  get selectedJobPanelCode(): string {
    if (!this.selectedJobPanel) {
      return '';
    }

    return this.jobsFacade.getJobById(this.selectedJobPanel.id)?.code?.trim() ?? '';
  }

  get selectedJobPanelWorkModel(): string {
    if (!this.selectedJobPanel) {
      return '';
    }

    const job = this.jobsFacade.getJobById(this.selectedJobPanel.id);
    return job ? this.jobCardWorkModel(job) : (this.selectedJobPanel.workModel ?? '');
  }

  get selectedJobPanelTopStacks(): Array<{ name: string }> {
    if (!this.selectedJobPanel) {
      return [];
    }

    const job = this.jobsFacade.getJobById(this.selectedJobPanel.id);
    return job ? this.topJobTechStacks(job) : this.selectedJobPanel.techStack.slice(0, 2);
  }

  get selectedJobPanelSalary(): string | null {
    if (!this.selectedJobPanel) {
      return null;
    }

    const job = this.jobsFacade.getJobById(this.selectedJobPanel.id);
    return job ? this.jobCardSalary(job) : null;
  }

  get recruiterSummaryStageLabel(): string {
    if (this.ecoFilter === 'candidaturas') {
      return 'total de candidatos';
    }

    if (this.ecoFilter === 'processo') {
      return 'em andamento';
    }

    if (this.ecoFilter === 'contratados') {
      return 'contratados';
    }

    return 'total no radar';
  }

  setEcoFilter(filter: EcoFilter): void {
    this.ecoFilter = filter;
    if (!this.isTalentEcosystemMode) {
      this.sideRailCandidateSource = this.preferredSideRailCandidateSource(filter as RecruiterEcoFilter);
    }
    this.ecoJobsPage = 0;
    this.ecosystemViewFilterService.setSelected(filter);
    this.cdr.markForCheck();
  }

  setOverviewRange(range: OverviewRange): void {
    if (this.overviewRange === range) {
      return;
    }

    this.overviewRange = range;
    this.cdr.markForCheck();
  }

  openEcosystemFilters(): void {
    this.ecosystemFilterModalService.open();
  }

  openCandidateCurriculum(candidate: SideRailCandidateCard): void {
    const focusedJob = this.sideRailRecentJobs[0];
    void this.router.navigate(['/talent/curriculum'], {
      queryParams: {
        candidate: candidate.id,
        name: candidate.name,
        jobId: focusedJob?.id ?? '',
        jobTitle: focusedJob?.title ?? '',
        jobCompany: focusedJob?.company ?? '',
        jobLocation: focusedJob ? this.jobCardLocation(focusedJob) : '',
        jobWorkModel: focusedJob ? this.jobCardWorkModel(focusedJob) : '',
        jobSalary: focusedJob ? (this.jobCardSalary(focusedJob) ?? '') : '',
        jobContractType: focusedJob?.contractType ?? '',
        jobLogo: focusedJob ? this.jobCompanyLogoUrl(focusedJob) : '',
      },
    });
  }

  get ecoFilteredJobs(): MockJobRecord[] {
    return this.buildFilteredJobs(this.ecoFilter, true);
  }

  get talentCompatibleJobs(): TalentCompatibleJobView[] {
    const talentProfile = this.readTalentProfile();

    return this.ecoFilteredJobs
      .map((job) => {
        const score = this.scoreTalentForJob(job, talentProfile);
        const matchedStacks = this.pickStacksByRepoIds(job.techStack, score.matchedRepoIds);
        const missingStacks = this.pickStacksByRepoIds(job.techStack, score.missingRepoIds);

        return {
          job,
          score,
          matchedStacks: matchedStacks.slice(0, 3),
          missingStacks: missingStacks.slice(0, 2),
        };
      })
      .filter((view) => this.ecoFilter !== 'radar' || (
        view.score.overallScore >= this.jobRadarAdherenceThreshold(view.job)
        && view.score.matchedRepoIds.length > 0
      ))
      .sort((left, right) =>
        right.score.overallScore - left.score.overallScore
        || right.score.stackScore - left.score.stackScore
        || left.job.title.localeCompare(right.job.title, 'pt-BR'),
      );
  }

  get hasEcoSearch(): boolean {
    return this.ecosystemSearchService.query().trim().length > 0;
  }

  get ecoSearchValue(): string {
    return this.ecosystemSearchService.query();
  }

  updateEcoSearch(value: string): void {
    this.ecosystemSearchService.setQuery(value);
    this.ecoJobsPage = 0;
    this.cdr.markForCheck();
  }

  get paginatedEcoJobs(): MockJobRecord[] {
    const start = this.ecoJobsPage * this.ecoJobsPageSize;
    return this.ecoFilteredJobs.slice(start, start + this.ecoJobsPageSize);
  }

  get ecoJobsPageCount(): number {
    return Math.max(1, Math.ceil(this.ecoFilteredJobs.length / this.ecoJobsPageSize));
  }

  get ecoJobsPageWindow(): number[] {
    const pageCount = this.ecoJobsPageCount;
    const current = Math.min(this.ecoJobsPage, pageCount - 1);
    const start = Math.max(0, Math.min(current - 1, pageCount - 3));
    const end = Math.min(pageCount, start + 3);
    return Array.from({ length: end - start }, (_, index) => start + index);
  }

  get radarJobsCount(): number {
    if (this.isTalentEcosystemMode) {
      return this.countTalentJobsForFilter('radar');
    }

    return this.countJobsForFilter('radar');
  }

  get candidaturasJobsCount(): number {
    if (this.isTalentEcosystemMode) {
      return this.countTalentJobsForFilter('applications');
    }

    return this.countJobsForFilter('candidaturas');
  }

  get processoJobsCount(): number {
    if (this.isTalentEcosystemMode) {
      return this.countTalentJobsForFilter('processo');
    }

    return this.countJobsForFilter('processo');
  }

  get sideRailContractedCount(): number {
    return this.countJobsForFilter('contratados');
  }

  get sideRailRecentJobs(): MockJobRecord[] {
    const jobs = this.ecoFilteredJobs
      .filter((job) => job.status === 'ativas')
      .sort((left, right) => {
        const rightTime = Date.parse(right.createdAt || right.updatedAt || '') || 0;
        const leftTime = Date.parse(left.createdAt || left.updatedAt || '') || 0;
        return rightTime - leftTime || (right.match ?? 0) - (left.match ?? 0);
      });

    if (!this.selectedSideRailRecentJobId) {
      return jobs.slice(0, 3);
    }

    const selectedJob = jobs.find((job) => job.id === this.selectedSideRailRecentJobId);
    if (!selectedJob) {
      return jobs.slice(0, 3);
    }

    return [selectedJob, ...jobs.filter((job) => job.id !== selectedJob.id)].slice(0, 3);
  }

  get sideRailCandidateCards(): SideRailCandidateCard[] {
    const job = this.sideRailRecentJobs[0];
    if (!job) {
      return [];
    }

    const preferred = this.buildSideRailCandidateCards(job, this.sideRailCandidateSource);
    if (preferred.length) {
      return preferred;
    }

    const fallbackSource: SideRailCandidateSource = this.sideRailCandidateSource === 'ecosystem'
      ? 'job'
      : 'ecosystem';
    return this.buildSideRailCandidateCards(job, fallbackSource);
  }

  get sideRailCandidateSources(): Array<{ id: SideRailCandidateSource; label: string; count: number }> {
    const job = this.sideRailRecentJobs[0];

    if (!this.isTalentEcosystemMode && this.ecoFilter === 'contratados') {
      const hiredCount = job
        ? this.sideRailCandidatesBySource(job, 'job').filter((candidate) => (
            (this.jobsFacade.getEffectiveCandidateStage(candidate) ?? candidate.stage ?? 'radar') === 'contratado'
          )).length
        : 0;

      return [
        { id: 'job', label: 'Contratado', count: hiredCount },
      ];
    }

    const ecosystemCount = job ? this.sideRailCandidatesBySource(job, 'ecosystem').length : 0;
    const jobCount = job ? this.sideRailCandidatesBySource(job, 'job').length : 0;
    const inProgressCount = job ? this.sideRailCandidatesBySource(job, 'processo').length : 0;

    return [
      { id: 'ecosystem', label: 'Ecossistema', count: ecosystemCount },
      { id: 'job', label: 'Candidatos', count: jobCount },
      { id: 'processo', label: 'Andamento', count: inProgressCount },
    ];
  }

  get sideRailJobAvatarBadges(): Array<{ src: string; label: string }> {
    const job = this.sideRailRecentJobs[0];
    return job ? this.jobInteractionAvatarBadges(job) : [];
  }

  get sideRailJobAvatarExtraCount(): number {
    const job = this.sideRailRecentJobs[0];
    return job ? this.jobBoardRadarExtraCount(job) : 0;
  }

  get sideRailCandidatesCount(): number {
    return this.sideRailCandidateCards.length;
  }

  get sideRailCandidatesTitle(): string {
    return !this.isTalentEcosystemMode && this.ecoFilter === 'contratados'
      ? 'Contratação Fechada'
      : 'Aderentes';
  }

  get sideRailCandidatesCountLabel(): string {
    return !this.isTalentEcosystemMode && this.ecoFilter === 'contratados'
      ? `${this.sideRailCandidatesCount} contratado`
      : `${this.sideRailCandidatesCount} avatares`;
  }

  get sideRailCandidatesCopy(): string {
    return !this.isTalentEcosystemMode && this.ecoFilter === 'contratados'
      ? 'talento que concluiu a jornada desta vaga e representa o fechamento final da contratação'
      : 'talentos que cruzam a meta atual da vaga em foco e merecem prioridade no radar de abordagem';
  }

  setSideRailCandidateSource(source: SideRailCandidateSource): void {
    if (this.sideRailCandidateSource === source) {
      return;
    }

    this.sideRailCandidateSource = source;
    this.cdr.markForCheck();
  }

  private preferredSideRailCandidateSource(filter: RecruiterEcoFilter): SideRailCandidateSource {
    if (filter === 'radar') {
      return 'ecosystem';
    }

    if (filter === 'processo' || filter === 'solicitada') {
      return 'processo';
    }

    return 'job';
  }

  get sideRailInProgressCandidatesCount(): number {
    const activeStages: CandidateStage[] = ['aguardando', 'tecnica', 'processo', 'documentacao'];
    return this.jobsSnapshot
      .filter((job) => job.status === 'ativas')
      .filter((job) => this.jobsFacade.canCurrentRecruiterAccessJob(job))
      .reduce((sum, job) => sum + (job.candidates ?? [])
        .filter((candidate) => activeStages.includes(this.jobsFacade.getEffectiveCandidateStage(candidate) ?? 'radar'))
        .length, 0);
  }

  setEcoJobsPage(page: number): void {
    const nextPage = Math.max(0, Math.min(page, this.ecoJobsPageCount - 1));
    if (nextPage === this.ecoJobsPage) {
      return;
    }

    this.ecoJobsPage = nextPage;
    this.cdr.markForCheck();
  }

  get ecoEmptyTitle(): string {
    if (this.hasEcoSearch) {
      return 'Nenhuma vaga encontrada para essa busca.';
    }

    if (this.isTalentEcosystemMode) {
      if (this.ecoFilter === 'applications') {
        return 'Você ainda nao tem candidaturas nesse recorte.';
      }

      if (this.ecoFilter === 'processo') {
        return 'Nenhuma vaga sua está em progresso agora.';
      }

      return 'Nenhuma vaga apareceu nesse radar agora.';
    }

    if (this.ecoFilter === 'contratados') {
      return 'Ainda nao ha contratacoes fechadas nesse recorte.';
    }

    if (this.ecoFilter === 'processo') {
      return 'Nao existem vagas em andamento nesse momento.';
    }

    if (this.ecoFilter === 'candidaturas') {
      return 'Nenhuma candidatura chegou nesse recorte.';
    }

    return 'Nenhuma vaga encontrada com esse filtro.';
  }

  get ecoEmptyHint(): string {
    if (this.hasEcoSearch) {
      return 'Tente buscar por cargo, empresa, código, stack ou localidade. Você também pode limpar a busca e voltar para a visão completa.';
    }

    if (this.ecoFilter !== 'radar') {
      return 'Volte para "No Radar" para reabrir a visão mais ampla do ecossistema.';
    }

    return 'Assim que novos movimentos aparecerem no mock do ecossistema, eles entram aqui automaticamente.';
  }

  get shouldShowEmptyResetAction(): boolean {
    return this.hasEcoSearch || this.ecoFilter !== 'radar';
  }

  ecoJobMeta(job: MockJobRecord): string {
    if (this.isTalentEcosystemMode) {
      const stage = this.getTalentStage(job);
      if (this.ecoFilter === 'applications') {
        return stage === 'candidatura' ? 'Candidatura enviada' : 'Em andamento';
      }
      return this.jobCardWorkModel(job) || 'Radar';
    }

    const view = this.ecoFilter as RecruiterEcoFilter;
    if (view === 'candidaturas') return 'Candidaturas';
    if (view === 'processo') return 'Em Processo';
    if (view === 'solicitada') return 'Contratação solicitada';
    if (view === 'contratados') return 'Contratados';
    return `${job.radarCount ?? 0} no radar`;
  }

  private talentJobMatchesFilter(job: MockJobRecord, filter: TalentEcoFilter): boolean {
    if (filter === 'applications') {
      return this.isApplicationsJob(job);
    }

    if (filter === 'processo') {
      return this.isInProgressJob(job);
    }

    return this.isRadarJob(job);
  }

  private countJobsForFilter(filter: RecruiterEcoFilter): number {
    return this.buildFilteredJobs(filter, true).length;
  }

  private countTalentJobsForFilter(filter: TalentEcoFilter): number {
    const talentProfile = this.readTalentProfile();
    const base = this.buildFilteredJobs(filter, true);

    if (filter !== 'radar') {
      return base.length;
    }

    return base.filter((job) => {
      const score = this.scoreTalentForJob(job, talentProfile);
      return score.overallScore >= this.jobRadarAdherenceThreshold(job) && score.matchedRepoIds.length > 0;
    }).length;
  }

  private buildFilteredJobs(filter: EcoFilter, applyQuery: boolean): MockJobRecord[] {
    const filters = this.ecosystemJobFiltersService.filters();

    let jobs = this.jobsSnapshot.filter((job) => job.status === 'ativas');

    if (!this.isTalentEcosystemMode) {
      jobs = jobs.filter((job) => this.jobsFacade.canCurrentRecruiterAccessJob(job));
    }

    jobs = this.isTalentEcosystemMode
      ? jobs.filter((job) => this.talentJobMatchesFilter(job, filter as TalentEcoFilter))
      : this.recruiterBoardJobs(jobs, filter as RecruiterEcoFilter);

    jobs = jobs.filter((job) => this.matchesSavedFilters(job, filters));

    if (!applyQuery) {
      return jobs;
    }

    const query = this.normalizeSearchText(this.ecosystemSearchService.query());
    if (!query) {
      return jobs;
    }

    return jobs.filter((job) => this.jobMatchesSearch(job, query));
  }

  private normalizeSearchText(value: string | null | undefined): string {
    return (value ?? '')
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildJobSearchIndex(job: MockJobRecord): string {
    const techNames = (job.techStack ?? []).map((stack) => stack.name);
    const candidateNames = (job.candidates ?? []).map((candidate) => candidate.name);
    const candidateRoles = (job.candidates ?? []).map((candidate) => candidate.role ?? '');
    const code = job.code ?? '';
    const salaryRange = job.salaryRange ?? '';
    const workModel = job.workModel ?? '';
    const seniority = job.seniority ?? '';
    const contractType = job.contractType ?? '';

    return this.normalizeSearchText([
      job.title,
      job.company,
      job.location,
      code,
      seniority,
      workModel,
      contractType,
      salaryRange,
      ...techNames,
      ...candidateNames,
      ...candidateRoles,
    ].join(' '));
  }

  private jobMatchesSearch(job: MockJobRecord, normalizedQuery: string): boolean {
    if (!normalizedQuery) {
      return true;
    }

    const haystack = this.buildJobSearchIndex(job);
    return haystack.includes(normalizedQuery);
  }

  private get sideRailSpotlightSourceFilter(): RecruiterEcoFilter {
    return this.ecoFilter === 'candidaturas' ? 'candidaturas' : 'radar';
  }

  private recruiterBoardJobs(jobs: MockJobRecord[], filter: RecruiterEcoFilter): MockJobRecord[] {
    return jobs.filter((job) => this.jobsFacade.getRecruiterBoardStatusId(job) === filter);
  }

  private jobStageCount(job: MockJobRecord, view: RecruiterEcoFilter): number {
    const effectiveStages = job.candidates
      .map((candidate) => this.jobsFacade.getEffectiveCandidateStage(candidate))
      .filter((stage): stage is NonNullable<typeof stage> => !!stage);

    if (view === 'candidaturas') {
      return effectiveStages.filter((stage) => stage === 'candidatura').length;
    }

    if (view === 'contratados') {
      return effectiveStages.filter((stage) => stage === 'contratado').length;
    }

    if (view === 'processo') {
      return effectiveStages.filter((stage) =>
        stage === 'processo'
        || stage === 'tecnica'
        || stage === 'aceito'
        || stage === 'documentacao'
      ).length;
    }

    if (view === 'solicitada') {
      return effectiveStages.filter((stage) => stage === 'aguardando').length;
    }

    return job.radarCount ?? 0;
  }

  private getTalentStage(job: MockJobRecord): CandidateStage | undefined {
    return this.jobsFacade.getEffectiveCandidateStage(this.jobsFacade.findTalentCandidate(job));
  }

  private isApplicationsJob(job: MockJobRecord): boolean {
    const stage = this.getTalentStage(job);
    return job.talentDecision === 'applied' && stage === 'candidatura' && !this.isDeclinedJob(job);
  }

  private isInProgressJob(job: MockJobRecord): boolean {
    const stage = this.getTalentStage(job);
    return stage === 'processo' || stage === 'tecnica' || stage === 'aceito' || stage === 'documentacao';
  }

  private isRadarJob(job: MockJobRecord): boolean {
    return !this.isApplicationsJob(job) && !this.isDeclinedJob(job);
  }

  private isDeclinedJob(job: MockJobRecord): boolean {
    const stage = this.getTalentStage(job);
    return stage === 'proxima' || stage === 'cancelado';
  }

  private computeAverageSalary(jobs: MockJobRecord[]): string | null {
    const values = jobs
      .map((job) => this.parseSalaryValue(job.salaryRange))
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    if (!values.length) {
      return null;
    }

    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return this.formatCompactMoney(Math.round(avg));
  }

  private parseSalaryValue(raw?: string): number | null {
    const value = raw?.trim();
    if (!value) {
      return null;
    }

    const match = value.match(/(\d[\d.\s]*,\d{2}|\d[\d.\s]*)/);
    if (!match) {
      return null;
    }

    const token = match[1] ?? '';
    const normalized = token.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private formatCompactMoney(value: number): string {
    if (value >= 1_000_000) {
      return `${Math.round(value / 100_000) / 10}M`;
    }

    if (value >= 10_000) {
      return `${Math.round(value / 100) / 10}K`;
    }

    if (value >= 1000) {
      return `${Math.round(value / 100) / 10}K`;
    }

    return `${value}`;
  }

  private buildSideRailCandidateCards(job: MockJobRecord, source: SideRailCandidateSource): SideRailCandidateCard[] {
    const candidates = this.sideRailCandidatesBySource(job, source);
    const hiredCandidates = this.ecoFilter === 'contratados'
      ? candidates.filter((candidate) => (
          (this.jobsFacade.getEffectiveCandidateStage(candidate) ?? candidate.stage ?? 'radar') === 'contratado'
        ))
      : [];

    return (hiredCandidates.length ? hiredCandidates : candidates)
      .slice(0, 6)
      .map((candidate, index) => this.mapSideRailCandidateCard(job, candidate, index));
  }

  private sideRailCandidatesBySource(job: MockJobRecord, source: SideRailCandidateSource): MockJobCandidate[] {
    if (source === 'job') {
      return this.sortedCandidatesForSideRailJob(job);
    }

    if (source === 'processo') {
      return this.sortedInProgressCandidatesForSideRailJob(job);
    }

    if (!this.isTalentEcosystemMode && this.ecoFilter === 'radar') {
      return this.buildRadarPanelCandidates(job);
    }

    return this.sideRailCompatibleCandidates(job);
  }

  private sortedCandidatesForSideRailJob(job: MockJobRecord): MockJobCandidate[] {
    const order: CandidateStage[] = ['radar', 'candidatura', 'tecnica', 'processo', 'aguardando', 'aceito', 'documentacao', 'contratado', 'proxima', 'cancelado'];

    return [...(job.candidates ?? [])]
      .filter((candidate) => {
        const stage = this.jobsFacade.getEffectiveCandidateStage(candidate) ?? candidate.stage ?? 'radar';
        return stage !== 'cancelado' && stage !== 'proxima';
      })
      .sort((left, right) => {
        const stageLeft = this.jobsFacade.getEffectiveCandidateStage(left) ?? left.stage ?? 'radar';
        const stageRight = this.jobsFacade.getEffectiveCandidateStage(right) ?? right.stage ?? 'radar';
        return order.indexOf(stageLeft) - order.indexOf(stageRight) || right.match - left.match;
      });
  }

  private sortedInProgressCandidatesForSideRailJob(job: MockJobRecord): MockJobCandidate[] {
    const activeStages: CandidateStage[] = ['tecnica', 'processo', 'aguardando', 'aceito', 'documentacao'];
    const order: CandidateStage[] = ['tecnica', 'processo', 'aguardando', 'aceito', 'documentacao', 'contratado', 'proxima', 'cancelado'];

    return [...(job.candidates ?? [])]
      .filter((candidate) => {
        const stage = this.jobsFacade.getEffectiveCandidateStage(candidate) ?? candidate.stage ?? 'radar';
        return activeStages.includes(stage);
      })
      .sort((left, right) => {
        const stageLeft = this.jobsFacade.getEffectiveCandidateStage(left) ?? left.stage ?? 'radar';
        const stageRight = this.jobsFacade.getEffectiveCandidateStage(right) ?? right.stage ?? 'radar';
        return order.indexOf(stageLeft) - order.indexOf(stageRight) || right.match - left.match;
      });
  }

  private sideRailCompatibleCandidates(job: MockJobRecord): MockJobCandidate[] {
    const threshold = this.jobRadarAdherenceThreshold(job);
    const seen = new Set<string>();
    const allCandidates = [
      ...this.jobCompatibleManagedCandidates(job, threshold),
      ...this.buildRadarPanelCandidates(job),
    ];

    return allCandidates.filter((candidate) => {
      const normalizedName = candidate.name.trim().toLocaleLowerCase('pt-BR');
      if (!normalizedName || seen.has(normalizedName) || candidate.match < threshold) {
        return false;
      }

      seen.add(normalizedName);
      return true;
    });
  }

  private jobCompatibleManagedCandidates(job: MockJobRecord, threshold: number): MockJobCandidate[] {
    return [...(job.candidates ?? [])]
      .filter((candidate) => {
        const stage = this.jobsFacade.getEffectiveCandidateStage(candidate) ?? 'radar';
        return stage !== 'cancelado' && stage !== 'proxima' && candidate.match >= threshold;
      })
      .sort((left, right) => {
        const stageLeft = this.jobsFacade.getEffectiveCandidateStage(left) ?? 'radar';
        const stageRight = this.jobsFacade.getEffectiveCandidateStage(right) ?? 'radar';
        const leftIsManaged = stageLeft !== 'radar';
        const rightIsManaged = stageRight !== 'radar';
        return Number(rightIsManaged) - Number(leftIsManaged)
          || right.match - left.match
          || left.name.localeCompare(right.name, 'pt-BR');
      });
  }

  private mapSideRailCandidateCard(job: MockJobRecord, candidate: MockJobCandidate, index: number): SideRailCandidateCard {
    const stage = this.jobsFacade.getEffectiveCandidateStage(candidate) ?? candidate.stage ?? 'radar';
    const stacks = this.sideRailCandidateStacks(job, candidate);
    const standoutStacks = this.sideRailCandidateStandoutStacks(job, candidate, stacks);
    const summary = this.sideRailCandidateSummary(job, candidate, stacks);

    return {
      id: candidate.id?.trim() || `${job.id}:${candidate.name}:${index}`,
      name: candidate.name,
      role: this.sideRailCandidateRole(job, candidate),
      status: this.recruiterPanelStageLabel(stage),
      isHired: stage === 'contratado',
      adherence: this.matchDomainService.clampScore(candidate.match),
      adherenceTone: this.getCandidateAdherenceTone(candidate.match),
      summary,
      stacks,
      standoutStacks,
      avatarUrl: this.resolveAvatar(candidate.avatar),
    };
  }

  private sideRailCandidateRole(job: MockJobRecord, candidate: MockJobCandidate): string {
    const rawRole = candidate.role?.trim();
    if (!rawRole) {
      return job.title;
    }

    const escapedCompany = job.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const withoutCompany = rawRole
      .replace(new RegExp(`\\s*(?:[-|/@]|na|no|em|at)?\\s*${escapedCompany}`, 'ig'), '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s*[-|/@]\s*$/g, '')
      .trim();

    return withoutCompany || job.title;
  }

  private sideRailCandidateStandoutStacks(
    job: MockJobRecord,
    candidate: MockJobCandidate,
    fallbackStacks: string[],
  ): Array<{ label: string; score: number }> {
    const candidateName = candidate.name.trim().toLocaleLowerCase('pt-BR');
    const candidateProfile = this.talentProfileStore.listRankableCandidates().find((entry) =>
      entry.candidate.name.trim().toLocaleLowerCase('pt-BR') === candidateName,
    )?.talentProfile;

    if (!candidateProfile) {
      return fallbackStacks.slice(0, 2).map((label) => ({
        label,
        score: this.matchDomainService.clampScore(candidate.match),
      }));
    }

    const jobRepoIds = this.matchDomainService.mapTechLabelsToRepoIds(job.techStack.map((stack) => stack.name));
    const stackSignals = job.techStack
      .map((stack, index) => {
        const repoId = jobRepoIds[index];
        const candidateKnowledge = repoId ? (candidateProfile.stackScores[repoId] ?? 0) : 0;
        const requiredKnowledge = Math.max(1, stack.match || 0);
        const score = candidateKnowledge > 0
          ? this.matchDomainService.clampScore(
              Math.round((Math.min(candidateKnowledge, requiredKnowledge) / requiredKnowledge) * 100),
            )
          : 0;

        return {
          label: stack.name.trim(),
          score,
          weight: stack.match || 0,
          candidateKnowledge,
        };
      })
      .filter((stack) => stack.label && stack.score > 0)
      .sort((left, right) =>
        right.weight - left.weight
        || right.score - left.score
        || right.candidateKnowledge - left.candidateKnowledge
        || left.label.localeCompare(right.label, 'pt-BR'),
      )
      .slice(0, 2)
      .map(({ label, score }) => ({ label, score }));

    if (stackSignals.length) {
      return stackSignals;
    }

    return fallbackStacks.slice(0, 2).map((label) => ({
      label,
      score: this.matchDomainService.clampScore(candidate.match),
    }));
  }

  private sideRailCandidateStacks(job: MockJobRecord, candidate: MockJobCandidate): string[] {
    const normalizedRole = candidate.role?.trim();
    const roleStacks = normalizedRole
      ? normalizedRole.split('/').map((item) => item.trim()).filter(Boolean)
      : [];

    if (roleStacks.length) {
      return roleStacks.slice(0, 2);
    }

    return this.topJobTechStacks(job).slice(0, 2).map((stack) => stack.name);
  }

  private sideRailCandidateSummary(job: MockJobRecord, candidate: MockJobCandidate, stacks: string[]): string {
    const location = candidate.location?.trim();
    const availability = candidate.availabilityLabel?.trim();
    const stackCopy = stacks.length ? '' : `aderencia alinhada a ${job.title}`;

    if (location && availability) {
      return `${location}. ${availability}. ${stackCopy}.`;
    }

    if (location) {
      return `${location}. Perfil com ${stackCopy}.`;
    }

    if (availability) {
      return `${availability}. Perfil com ${stackCopy}.`;
    }

    return `Perfil com ${stackCopy}.`;
  }

  private getCandidateAdherenceTone(adherence: number): SideRailCandidateCard['adherenceTone'] {
    if (adherence >= 85) {
      return 'high';
    }

    if (adherence >= 65) {
      return 'medium';
    }

    return 'low';
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.setTimeout(() => this.syncHiredPagination(true), 0);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();

    if (this.copyRotationTimer) {
      window.clearInterval(this.copyRotationTimer);
      this.copyRotationTimer = null;
    }

    if (this.hiredRotationTimer) {
      window.clearInterval(this.hiredRotationTimer);
      this.hiredRotationTimer = null;
    }

    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = undefined;
    }
  }

  startSideCandidatesDrag(event: PointerEvent): void {
    const container = this.sideCandidatesScroller?.nativeElement;
    if (!container || container.scrollHeight <= container.clientHeight) {
      return;
    }

    this.sideCandidatesDragging = true;
    this.sideCandidatesPointerId = event.pointerId;
    this.sideCandidatesDragStartY = event.clientY;
    this.sideCandidatesDragStartScrollTop = container.scrollTop;
    container.setPointerCapture?.(event.pointerId);
    this.cdr.markForCheck();
  }

  moveSideCandidatesDrag(event: PointerEvent): void {
    const container = this.sideCandidatesScroller?.nativeElement;
    if (!container || !this.sideCandidatesDragging || this.sideCandidatesPointerId !== event.pointerId) {
      return;
    }

    const deltaY = event.clientY - this.sideCandidatesDragStartY;
    container.scrollTop = this.sideCandidatesDragStartScrollTop - deltaY;
    event.preventDefault();
  }

  stopSideCandidatesDrag(event?: PointerEvent): void {
    const container = this.sideCandidatesScroller?.nativeElement;
    if (container && this.sideCandidatesPointerId !== null) {
      container.releasePointerCapture?.(this.sideCandidatesPointerId);
    }

    if (event && this.sideCandidatesPointerId !== null && this.sideCandidatesPointerId !== event.pointerId) {
      return;
    }

    if (!this.sideCandidatesDragging && this.sideCandidatesPointerId === null) {
      return;
    }

    this.sideCandidatesDragging = false;
    this.sideCandidatesPointerId = null;
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.showRadarCategoryPicker) {
      this.closeRadarCategoryPicker();
      return;
    }

    if (this.sidebarVisibilityService.isOpen()) {
      this.sidebarVisibilityService.hide();
    }
  }

  polaroidTilt(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }

    if (hash % 5 === 0) {
      return '0deg';
    }

    const tiltSteps = [-3.2, -2.4, -1.6, -0.9, 0.9, 1.6, 2.4, 3.2];
    const tilt = tiltSteps[hash % tiltSteps.length] ?? 0;
    return `${tilt}deg`;
  }

  hiredPolaroidTilt(cardIndex: number, seed: string): string {
    const base = this.polaroidTilt(seed);
    const numeric = Number.parseFloat(base.replace('deg', ''));

    if (!Number.isFinite(numeric) || numeric === 0) {
      return cardIndex % 2 === 0 ? '-2deg' : '2deg';
    }

    const magnitude = Math.abs(numeric);
    return cardIndex % 2 === 0 ? `-${magnitude}deg` : `${magnitude}deg`;
  }

  hiredTapeTilt(pageIndex: number, cardIndex: number, seed: string): string {
    let hash = 0;
    const compositeSeed = `${pageIndex}:${cardIndex}:${seed}:tape`;

    for (let i = 0; i < compositeSeed.length; i += 1) {
      hash = (hash * 33 + compositeSeed.charCodeAt(i)) >>> 0;
    }

    const tiltSteps = [-13, -11, -9, -7, 7, 9, 11, 13];
    const tilt = tiltSteps[hash % tiltSteps.length] ?? (cardIndex % 2 === 0 ? -9 : 9);
    return `${tilt}deg`;
  }

  hiredMatch(seed: string): number {
    let hash = 0;
    const compositeSeed = `${seed}:match`;

    for (let i = 0; i < compositeSeed.length; i += 1) {
      hash = (hash * 37 + compositeSeed.charCodeAt(i)) >>> 0;
    }

    return 84 + (hash % 15);
  }

  scrollHired(direction: -1 | 1): void {
    const el = this.hiredTrack?.nativeElement;
    if (!el) {
      return;
    }

    this.syncHiredPagination();
    const pageWidth = Math.max(1, el.clientWidth);
    const nextPage = Math.min(this.hiredPageCount - 1, Math.max(0, this.activeHiredIndex + direction));
    this.lastManualHiredInteractionAt = Date.now();
    el.scrollTo({ left: nextPage * pageWidth, behavior: 'smooth' });

    if (nextPage !== this.activeHiredIndex) {
      this.activeHiredIndex = nextPage;
      this.cdr.markForCheck();
    }
  }

  onHiredScroll(): void {}

  private autoAdvanceHired(): void {
    this.syncHiredPagination();
    const now = Date.now();

    if (now - this.lastManualHiredInteractionAt < 7000) {
      return;
    }

    const nextPage = (this.activeHiredIndex + 1) % this.hiredPageCount;

    this.hiredAutoScrollInFlight = true;
    this.activeHiredIndex = nextPage;
    this.cdr.markForCheck();

    window.setTimeout(() => {
      this.hiredAutoScrollInFlight = false;
    }, 1200);
  }

  private syncHiredPagination(force = false): void {
    const nextPageCount = Math.max(1, Math.ceil(this.hiredSpotlightDeck.length / 2));
    if (!force && nextPageCount === this.hiredPageCount) {
      return;
    }

    this.hiredPageCount = nextPageCount;
    this.hiredPages = Array.from({ length: nextPageCount }, (_, i) => i);

    if (this.activeHiredIndex > nextPageCount - 1) {
      this.activeHiredIndex = nextPageCount - 1;
    }

    this.cdr.markForCheck();
  }

  private refreshHiredDeck(): void {
    const pool = [...this.hiredSpotlights];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.hiredSpotlightDeck = pool;
  }

  private preloadHiredSpotlightAssets(): void {
    if (typeof Image === 'undefined') {
      return;
    }

    const sources = new Set<string>();
    for (const card of this.hiredSpotlights) {
      if (card.avatarUrl) {
        sources.add(card.avatarUrl);
      }
      if (card.companyLogoUrl) {
        sources.add(card.companyLogoUrl);
      }
    }

    sources.forEach((src) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
    });
  }

  toggleSidebar(): void {
    this.sidebarVisibilityService.toggle();
  }

  get currentHiringCopy(): { title: string; body: string } {
    return this.hiringCopy[this.copyIndex % this.hiringCopy.length];
  }

  get featuredJob(): MockJobRecord | null {
    const accessibleActive = this.jobsSnapshot
      .filter((job) => job.status === 'ativas' && this.jobsFacade.canCurrentRecruiterAccessJob(job));

    if (accessibleActive.length) {
      return accessibleActive[0];
    }

    const accessibleAny = this.jobsSnapshot
      .filter((job) => this.jobsFacade.canCurrentRecruiterAccessJob(job));

    return accessibleAny[0] ?? this.jobsSnapshot[0] ?? null;
  }

  jobCompanyLogoUrl(job: MockJobRecord): string {
    if (this.brokenCompanyLogoJobIds.has(job.id)) {
      return '';
    }

    return job.companyLogoUrl?.trim() ?? '';
  }

  markCompanyLogoAsBroken(jobId: string): void {
    if (!jobId || this.brokenCompanyLogoJobIds.has(jobId)) {
      return;
    }

    this.brokenCompanyLogoJobIds.add(jobId);
    this.cdr.markForCheck();
  }

  jobCompanyLogoLabel(job: MockJobRecord): string {
    const initial = job.company
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .find(Boolean);

    return (initial || job.company.slice(0, 1)).toUpperCase();
  }

  personInitials(name: string): string {
    const initial = name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .find(Boolean);

    return (initial || name.slice(0, 1)).toUpperCase();
  }

  jobCardWorkModel(job: MockJobRecord): string {
    if (job.workModel === 'Remoto') {
      return 'Home';
    }

    return this.workModelLabel(job.workModel);
  }

  jobCardLocation(job: MockJobRecord): string {
    return job.location.replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').trim();
  }

  jobCreatedAtLabel(job: MockJobRecord): string {
    const raw = job.createdAt || job.updatedAt || '';
    const timestamp = Date.parse(raw);

    if (!Number.isFinite(timestamp)) {
      return 'Sem data';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  }

  jobCardOffer(job: MockJobRecord): { salary: string | null; rest: string } {
    const salary = job.showSalaryRangeInCard === false ? null : this.formatJobSalary(job.salaryRange);
    const benefits = job.benefits.length > 0 ? ' + Beneficios' : '';
    const rest = `${job.contractType}${benefits}.`;
    return { salary, rest };
  }

  topJobTechStacks(job: MockJobRecord) {
    return [...job.techStack]
      .sort((left, right) => right.match - left.match || left.name.localeCompare(right.name, 'pt-BR'))
      .slice(0, 2);
  }

  talentJobMainStacks(view: TalentCompatibleJobView): TechStackItem[] {
    if (view.matchedStacks.length) {
      return view.matchedStacks.slice(0, 2);
    }

    return this.topJobTechStacks(view.job);
  }

  talentJobAdherence(view: TalentCompatibleJobView): number {
    return this.matchDomainService.clampScore(view.score.overallScore);
  }

  talentJobMissingStacks(view: TalentCompatibleJobView): TechStackItem[] {
    return view.missingStacks;
  }

  private workModelLabel(model: WorkModel): string {
    switch (model) {
      case 'Hibrido':
        return 'Hibrido';
      case 'Presencial':
        return 'Presencial';
      case 'Remoto':
        return 'Remoto';
      default:
        return model;
    }
  }

  private formatJobSalary(raw?: string): string | null {
    const value = raw?.trim();
    if (!value) {
      return null;
    }

    const match = value.match(/(\d[\d.\s]*,\d{2}|\d[\d.\s]*)/);
    if (!match) {
      return null;
    }

    const token = (match[1] ?? '').replace(/\s/g, '');
    return `R$ ${token}`;
  }

  jobCardSalary(job: MockJobRecord): string | null {
    if (job.showSalaryRangeInCard === false) {
      return null;
    }

    return this.formatJobSalary(job.salaryRange);
  }

  jobInteractionAvatars(job: MockJobRecord): string[] {
    if (!this.isTalentEcosystemMode && this.ecoFilter === 'radar') {
      return this.buildRadarPanelCandidates(job)
        .map((candidate) => candidate.avatar?.trim())
        .filter((avatar): avatar is string => !!avatar)
        .slice(0, 4);
    }

    const directAvatars = (job.avatars ?? []).map((item) => item?.trim()).filter(Boolean);
    if (directAvatars.length) {
      return directAvatars.slice(0, 4);
    }

    return (job.candidates ?? [])
      .map((candidate) => candidate.avatar?.trim())
      .filter((avatar): avatar is string => !!avatar)
      .slice(0, 4);
  }

  jobInteractionAvatarBadges(job: MockJobRecord): Array<{ src: string; label: string }> {
    const cacheKey = `${job.id}:${this.ecoFilter}:${this.isTalentEcosystemMode ? 'talent' : 'recruiter'}`;
    const cached = this.avatarBadgeCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const candidates = (!this.isTalentEcosystemMode && this.ecoFilter === 'radar')
      ? this.buildRadarPanelCandidates(job)
      : this.sortedCandidatesForPanel(job);

    const candidateBadges = candidates
      .slice(0, 4)
      .map((candidate) => ({
        src: this.resolveAvatar(candidate.avatar),
        label: this.personInitials(candidate.name),
      }));

    if (candidateBadges.length) {
      this.avatarBadgeCache.set(cacheKey, candidateBadges);
      return candidateBadges;
    }

    const fallbackBadges = (job.avatars ?? [])
      .map((avatar) => this.resolveAvatar(avatar))
      .slice(0, 4)
      .map((avatar) => ({ src: avatar, label: 'TW' }));

    this.avatarBadgeCache.set(cacheKey, fallbackBadges);
    return fallbackBadges;
  }

  jobInteractionExtraCount(job: MockJobRecord): number {
    if (!this.isTalentEcosystemMode && this.ecoFilter === 'radar') {
      return this.buildRadarPanelCandidates(job).length;
    }

    const visibleAvatars = this.jobInteractionAvatars(job).length;
    const explicitExtra = Math.max(0, job.extraCount ?? 0);
    const derivedTotal = explicitExtra > 0 ? explicitExtra + visibleAvatars : 0;
    const totalCandidates = Math.max(0, job.candidates?.length ?? 0);
    const totalRadar = Math.max(0, job.radarCount ?? 0);
    const totalTalents = Math.max(0, job.talents ?? 0);

    return Math.max(derivedTotal, totalCandidates, totalRadar, totalTalents);
  }

  jobBoardRadarExtraCount(job: MockJobRecord): number {
    const visibleAvatars = this.jobInteractionAvatars(job).length;
    const total = this.jobInteractionExtraCount(job);
    return Math.max(0, total - visibleAvatars);
  }

  jobBoardStatusTone(job: MockJobRecord): 'active' | 'paused' | 'closed' {
    if (job.status === 'pausadas') {
      return 'paused';
    }

    if (job.status === 'encerradas') {
      return 'closed';
    }

    return 'active';
  }

  jobTalentCount(job: MockJobRecord): number {
    if (!this.isTalentEcosystemMode) {
      const algorithmCount = this.buildRadarPanelCandidates(job).length;
      const syncedRadarCount = Math.max(0, job.radarCount ?? 0);
      const syncedTalentsCount = Math.max(0, job.talents ?? 0);

      return Math.max(algorithmCount, syncedRadarCount, syncedTalentsCount);
    }

    return Math.max(0, this.sortedCandidatesForPanel(job).length);
  }

  async openRecruiterCandidatesPanel(job: MockJobRecord): Promise<void> {
    if (this.isTalentEcosystemMode) {
      return;
    }

    this.clearRecruiterPanelTimers();
    this.openingRecruiterPanelJobId = job.id;
    this.recruiterPanelProgressCurrent = 0;
    this.recruiterPanelProgressTotal = Math.max(1, this.jobTalentCount(job));

    const totalSteps = this.recruiterPanelProgressTotal;
    const stepDuration = Math.max(120, Math.round(5000 / totalSteps));

    this.recruiterPanelCountdownTimer = window.setInterval(() => {
      this.ngZone.run(() => {
        if (this.recruiterPanelProgressCurrent < this.recruiterPanelProgressTotal) {
          this.recruiterPanelProgressCurrent += 1;
          this.cdr.detectChanges();
        }
      });
    }, stepDuration);

    this.recruiterPanelWatchdogTimer = window.setTimeout(() => {
      this.ngZone.run(() => {
        if (this.openingRecruiterPanelJobId === job.id && !this.selectedJobPanel) {
          const freshestJob = this.jobsFacade.getJobById(job.id) ?? job;
          this.selectedJobPanel = this.asChatJob(freshestJob);
          this.clearRecruiterPanelTimers();
          this.openingRecruiterPanelJobId = null;
          this.recruiterPanelProgressCurrent = 0;
          this.recruiterPanelProgressTotal = 0;
          this.cdr.detectChanges();
        }
      });
    }, 5000);

    this.cdr.markForCheck();
    void this.ensureSyncedTalentProfiles(1400);
  }

  closeRecruiterPanel(): void {
    this.clearRecruiterPanelTimers();
    this.selectedJobPanel = null;
    this.openingRecruiterPanelJobId = null;
    this.recruiterPanelProgressCurrent = 0;
    this.recruiterPanelProgressTotal = 0;
    this.cdr.markForCheck();
  }

  openCreateJob(): void {
    void this.router.navigateByUrl('/vagas/cadastro');
  }

  openEditJob(jobId: string): void {
    if (!jobId.trim()) {
      this.openCreateJob();
      return;
    }

    void this.router.navigate(['/vagas/cadastro'], {
      queryParams: { edit: jobId },
    });
  }

  openCandidatesChat(jobId: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    void this.router.navigate(['/vagas/chat-candidatos'], {
      queryParams: jobId?.trim() ? { jobId } : undefined,
    });
  }

  selectSideRailRecentJob(jobId: string): void {
    this.selectedSideRailRecentJobId = jobId.trim() || null;
  }

  openRecruiterPanelCandidate(index: number): void {
    if (!this.selectedJobPanel) {
      return;
    }

    const candidates = this.sortedCandidatesForPanel(this.selectedJobPanel) as unknown as ChatCandidate[];
    const candidate = candidates[index];
    if (!candidate) {
      return;
    }

    this.handleRecruiterCandidateProfile({
      job: this.selectedJobPanel,
      candidate,
      initialTab: 'curriculum',
    });
  }

  recruiterPanelStageLabel(stage?: MockJobCandidate['stage']): string {
    switch (stage) {
      case 'radar':
        return 'Radar';
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
        return 'Radar';
    }
  }

  sortedCandidatesForPanel(job: MockJobRecord | ChatJob): MockJobCandidate[] {
    const order: CandidateStage[] = ['radar', 'candidatura', 'tecnica', 'processo', 'aguardando', 'aceito', 'documentacao', 'contratado', 'proxima', 'cancelado'];
    const sourceCandidates = [...(job.candidates as MockJobCandidate[])];
    const filteredCandidates = sourceCandidates.filter((candidate) => this.candidateMatchesRecruiterPanelFilter(candidate));

    return filteredCandidates.sort((left, right) => {
      const stageLeft = this.jobsFacade.getEffectiveCandidateStage(left) ?? 'radar';
      const stageRight = this.jobsFacade.getEffectiveCandidateStage(right) ?? 'radar';
      return order.indexOf(stageLeft) - order.indexOf(stageRight) || right.match - left.match;
    });
  }

  handleRecruiterCandidateProfile(
    _context: { job: ChatJob; candidate: ChatCandidate; initialTab: 'journey' | 'curriculum' },
  ): void {
    // fluxo lateral
  }

  private asChatJob(job: MockJobRecord): ChatJob {
    const candidates = this.ecoFilter === 'radar'
      ? this.buildRadarPanelCandidates(job)
      : this.sortedCandidatesForPanel(job).map((candidate) => ({
          ...candidate,
          stage: this.jobsFacade.getEffectiveCandidateStage(candidate),
        }));

    return {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      workModel: job.workModel,
      techStack: job.techStack.map((item) => ({ name: item.name, match: item.match })),
      candidates,
      hiringDocuments: job.hiringDocuments,
      talentSubmittedDocuments: [],
      talentDocumentsConsentAccepted: false,
    };
  }

  private buildRadarPanelCandidates(job: MockJobRecord): MockJobCandidate[] {
    return this.jobsFacade.getRadarCandidates(job);
  }

  private async ensureSyncedTalentProfiles(timeoutMs = 2000): Promise<void> {
    const syncPromise = this.talentProfileStore.syncFromRemote().catch(() => null);
    const timeoutPromise = new Promise<null>((resolve) => {
      const timer = window.setTimeout(() => {
        window.clearTimeout(timer);
        resolve(null);
      }, timeoutMs);
    });

    await Promise.race([syncPromise, timeoutPromise]);
    this.cdr.markForCheck();
  }

  private async ensureSyncedJobs(timeoutMs = 2500): Promise<void> {
    const syncPromise = this.jobsFacade.syncFromRemote().catch(() => null);
    const timeoutPromise = new Promise<null>((resolve) => {
      const timer = window.setTimeout(() => {
        window.clearTimeout(timer);
        resolve(null);
      }, timeoutMs);
    });

    await Promise.race([syncPromise, timeoutPromise]);
    this.refreshJobs();
    this.cdr.markForCheck();
  }

  private clearRecruiterPanelTimers(): void {
    if (this.recruiterPanelWatchdogTimer !== null) {
      window.clearTimeout(this.recruiterPanelWatchdogTimer);
      this.recruiterPanelWatchdogTimer = null;
    }

    if (this.recruiterPanelCountdownTimer !== null) {
      window.clearInterval(this.recruiterPanelCountdownTimer);
      this.recruiterPanelCountdownTimer = null;
    }
  }

  private buildRadarCandidatesFromMatchingLab(job: MockJobRecord): MockJobCandidate[] {
    if (!job.id.startsWith('lab-')) {
      return [];
    }

    const dataset = this.matchingLabService.getDataset();
    const jobId = job.id.replace(/^lab-/, '');
    const result = dataset.results.find((entry: MatchLabJobResult) => entry.job.id === jobId);
    if (!result) {
      return [];
    }

    const talentByName = new Map(
      this.talentDirectoryService.listTalents().map((talent) => [talent.name.trim().toLocaleLowerCase('pt-BR'), talent]),
    );

    return result.ranking
      .filter((entry: MatchLabRankingEntry) => entry.score >= this.jobRadarAdherenceThreshold(job))
      .map((entry, index) => {
        const directoryTalent = talentByName.get(entry.candidate.name.trim().toLocaleLowerCase('pt-BR'));
        const compactRole = entry.debug.stackBreakdown
          .slice()
          .sort((left, right) => right.weightedContribution - left.weightedContribution)
          .slice(0, 2)
          .map((item) => item.stackName.trim())
          .filter(Boolean)
          .join(' / ');

        return {
          id: `lab-radar-${job.id}-${index + 1}`,
          name: entry.candidate.name,
          role: compactRole || entry.candidate.seniority,
          location: directoryTalent?.location || entry.candidate.location,
          match: entry.score,
          minutesAgo: 5 + index,
          status: 'online' as const,
          avatar: directoryTalent?.avatarUrl || '/assets/avatars/avatar-default.svg',
          stage: 'radar',
          radarOnly: true,
          source: 'seed' as const,
          availabilityLabel: 'Disponibilidade imediata',
        } satisfies MockJobCandidate;
      });
  }

  private fallbackRadarCandidates(job: MockJobRecord): MockJobCandidate[] {
    return [...(job.candidates ?? [])]
      .filter((candidate) => (this.jobsFacade.getEffectiveCandidateStage(candidate) ?? 'radar') === 'radar')
      .sort((left, right) => right.match - left.match || left.name.localeCompare(right.name, 'pt-BR'));
  }

  private jobRadarAdherenceThreshold(job: MockJobRecord): number {
    if (Number.isFinite(job.radarAdherenceThreshold)) {
      return Math.max(35, Math.min(95, Math.round(job.radarAdherenceThreshold ?? 85)));
    }

    const primaryStacks = [...(job.techStack ?? [])]
      .filter((stack) => Number.isFinite(stack.match) && stack.match > 0)
      .sort((left, right) => right.match - left.match)
      .slice(0, 3);

    if (!primaryStacks.length) {
      return 50;
    }

    const average = primaryStacks.reduce((sum, stack) => sum + stack.match, 0) / primaryStacks.length;
    return Math.max(35, Math.min(95, Math.round(average)));
  }

  private candidateMatchesRecruiterPanelFilter(candidate: MockJobCandidate): boolean {
    const stage = this.jobsFacade.getEffectiveCandidateStage(candidate);

    if (this.ecoFilter === 'radar') {
      return stage === 'radar';
    }

    if (this.ecoFilter === 'candidaturas') {
      return stage === 'candidatura';
    }

    if (this.ecoFilter === 'processo') {
      return stage === 'processo' || stage === 'tecnica' || stage === 'aceito' || stage === 'documentacao' || stage === 'aguardando';
    }

    if (this.ecoFilter === 'contratados') {
      return stage === 'contratado';
    }

    if (this.ecoFilter === 'solicitada') {
      return stage === 'aguardando';
    }

    return true;
  }

  isJobCardFlipped(job: MockJobRecord): boolean {
    return this.flippedJobCardIds.has(job.id);
  }

  toggleJobCardFlip(job: MockJobRecord): void {
    if (this.flippedJobCardIds.has(job.id)) {
      this.flippedJobCardIds.delete(job.id);
    } else {
      this.flippedJobCardIds.add(job.id);
    }

    this.cdr.markForCheck();
  }

  jobCardCandidates(job: MockJobRecord): MockJobCandidate[] {
    const candidates = job.candidates ?? [];
    const primary = candidates.filter((candidate) => !candidate.radarOnly && candidate.stage !== 'radar');
    const fallbackRadar = candidates.filter((candidate) => candidate.radarOnly || candidate.stage === 'radar');
    const source = primary.length ? primary : fallbackRadar;

    return [...source]
      .sort((left, right) => right.match - left.match || left.name.localeCompare(right.name, 'pt-BR'))
      .slice(0, 2);
  }

  jobCardTalentRows(job: MockJobRecord): JobCardTalentRow[] {
    const candidates = this.jobCardCandidates(job);
    if (candidates.length) {
      return candidates.map((candidate) => ({
        name: candidate.name,
        location: candidate.location?.trim() || 'Brasil',
        topStacks: this.topJobTechStacks(job).slice(0, 2).map((stack) => stack.name),
        avatar: candidate.avatar,
        match: candidate.match,
      }));
    }

    const jobProfile = this.matchDomainService.buildJobProfile({
      techStack: job.techStack,
      seniority: job.seniority,
      responsibilitySections: job.responsibilitySections,
    });

    if (!jobProfile.requiredRepoIds.length) {
      return [];
    }

    const talents = this.talentDirectoryService.listTalents()
      .filter((talent) => talent.visibleInEcosystem && talent.availableForHiring);

    return talents.map((talent) => {
        const score = this.matchDomainService.scoreTalentAgainstJob(jobProfile, { stackScores: talent.stacks });
        return {
          name: talent.name,
          location: talent.location,
          topStacks: this.jobRadarTalentStacks(job, talent.stacks, score.matchedRepoIds),
          avatar: talent.avatarUrl,
          match: score.overallScore,
        };
      })
      .sort((left, right) => right.match - left.match || left.name.localeCompare(right.name, 'pt-BR'))
      .slice(0, 2);
  }

  private jobRadarTalentStacks(job: MockJobRecord, stackScores: Record<string, number>, matchedRepoIds: string[]): string[] {
    const matchedRepoSet = new Set(matchedRepoIds);
    const rankedMatched = Object.entries(stackScores)
      .filter(([repoId, score]) => matchedRepoSet.has(repoId) && score > 0)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 2)
      .map(([repoId]) => this.prettyTechRepoLabel(repoId));

    if (rankedMatched.length) {
      return rankedMatched;
    }

    const rankedJobStacks = job.techStack
      .slice()
      .sort((left, right) => right.match - left.match)
      .slice(0, 2)
      .map((stack) => stack.name.trim())
      .filter(Boolean);

    if (rankedJobStacks.length) {
      return rankedJobStacks;
    }

    return [`${job.seniority} ${job.title}`.trim()];
  }

  private prettyTechRepoLabel(repoId: string): string {
    const normalized = repoId.replace(/^repo:/, '');

    if (normalized === 'dotnet') {
      return '.NET';
    }

    if (normalized === 'csharp') {
      return 'C#';
    }

    if (normalized === 'gcp') {
      return 'Google Cloud';
    }

    return normalized
      .split('-')
      .map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part)
      .join(' ');
  }

  private refreshJobs(): void {
    this.jobsSnapshot = this.jobsFacade.getJobs();
  }

  private matchesSavedFilters(
    job: MockJobRecord,
    filters: { code: string; company: string; state: string; stack: string },
  ): boolean {
    if (filters.code) {
      const normalizedCode = this.normalizeSearchText(job.code);
      const selectedCode = this.normalizeSearchText(filters.code);
      if (normalizedCode !== selectedCode) {
        return false;
      }
    }

    if (filters.company) {
      const normalizedCompany = this.normalizeSearchText(job.company);
      const selectedCompany = this.normalizeSearchText(filters.company);
      if (normalizedCompany !== selectedCompany) {
        return false;
      }
    }

    if (filters.state) {
      const jobState = this.normalizeSearchText(job.location.split('-').pop()?.trim() ?? '');
      const selectedState = this.normalizeSearchText(filters.state);
      if (jobState !== selectedState) {
        return false;
      }
    }

    if (filters.stack) {
      const selectedStack = this.normalizeSearchText(filters.stack);
      const hasStack = job.techStack.some((stack) => this.normalizeSearchText(stack.name) === selectedStack);
      if (!hasStack) {
        return false;
      }
    }

    return true;
  }

  private readTalentProfile(): MatchTalentProfile {
    const sessionEmail = this.authFacade.getSession()?.email?.trim() ?? '';
    const syncedProfile = sessionEmail
      ? this.talentProfileStore.getMatchTalentProfileByEmail(sessionEmail)
      : null;

    if (syncedProfile) {
      return syncedProfile;
    }

    const storedStacks = this.browserStorage.readJson<StoredCandidateStacksDraft>(EcossistemaPage.candidateStacksStorageKey);
    const storedExperiences = this.browserStorage.readJson<StoredCandidateExperience[]>(
      EcossistemaPage.candidateExperiencesStorageKey,
    ) ?? [];

    const stackScores: Record<string, number> = {};
    const allStacks = [...(storedStacks?.primary ?? []), ...(storedStacks?.extra ?? [])];

    for (const stack of allStacks) {
      const repoId = typeof stack.id === 'string' && stack.id.startsWith('repo:')
        ? stack.id
        : this.matchDomainService.mapTechLabelsToRepoIds([stack.name ?? ''])[0];

      if (!repoId) {
        continue;
      }

      const knowledge = this.matchDomainService.clampScore(stack.knowledge ?? 0);
      if ((stackScores[repoId] ?? 0) < knowledge) {
        stackScores[repoId] = knowledge;
      }
    }

    const experiences: MatchExperienceSignal[] = storedExperiences.map((experience) => ({
      role: experience.role?.trim(),
      positionLevel: experience.positionLevel?.trim(),
      companySegment: experience.companySegment?.trim(),
      appliedStacks: (experience.appliedStacks ?? [])
        .map((stack) => stack.name?.trim())
        .filter((name): name is string => Boolean(name)),
    }));

    return { stackScores, experiences };
  }

  private scoreTalentForJob(job: MockJobRecord, talentProfile: MatchTalentProfile): MatchScoreBreakdown {
    const sharedLabScore = this.readSharedLabScoreForCurrentTalent(job);
    if (sharedLabScore) {
      return sharedLabScore;
    }

    const hasProfileData = Object.keys(talentProfile.stackScores).length > 0 || (talentProfile.experiences?.length ?? 0) > 0;
    if (!hasProfileData) {
      const fallback = this.matchDomainService.clampScore(
        job.match || this.matchDomainService.estimateJobReadinessFromTechStack(job.techStack),
      );

      return {
        overallScore: fallback,
        stackScore: fallback,
        experienceScore: 0,
        matchedRepoIds: this.matchDomainService.mapTechLabelsToRepoIds(job.techStack.map((item) => item.name)).slice(0, 3),
        missingRepoIds: [],
      };
    }

    const jobProfile = this.matchDomainService.buildJobProfile({
      techStack: job.techStack,
      seniority: job.seniority,
      responsibilitySections: job.responsibilitySections,
    });

    return this.matchDomainService.scoreTalentAgainstJob(jobProfile, talentProfile);
  }

  private readSharedLabScoreForCurrentTalent(job: MockJobRecord): MatchScoreBreakdown | null {
    if (!job.id.startsWith('lab-')) {
      return null;
    }

    const session = this.authFacade.getSession();
    const sessionName = session?.name?.trim().toLocaleLowerCase('pt-BR') ?? '';
    const sessionEmail = session?.email?.trim() ?? '';
    const profileName = this.talentProfileStore.findProfileByEmail(sessionEmail)?.basicDraft.profile?.name?.trim().toLocaleLowerCase('pt-BR') ?? '';
    const candidateName = profileName || sessionName;

    if (!candidateName) {
      return null;
    }

    const result = this.matchingLabService.getDataset().results.find((entry) => `lab-${entry.job.id}` === job.id);
    const rankingEntry = result?.ranking.find((entry) =>
      entry.candidate.name.trim().toLocaleLowerCase('pt-BR') === candidateName,
    );

    if (!rankingEntry) {
      return null;
    }

    const matchedRepoIds = rankingEntry.debug.stackBreakdown
      .filter((item) => item.candidatePercent > 0)
      .map((item) => `repo:${item.stackId}`);
    const missingRepoIds = rankingEntry.debug.stackBreakdown
      .filter((item) => item.vacancyPercent > 0 && item.candidatePercent <= 0)
      .map((item) => `repo:${item.stackId}`);

    return {
      overallScore: this.matchDomainService.clampScore(rankingEntry.score),
      stackScore: this.matchDomainService.clampScore(
        rankingEntry.debug.primaryScore + rankingEntry.debug.secondaryScore,
      ),
      experienceScore: this.matchDomainService.clampScore(rankingEntry.debug.experienceScore),
      matchedRepoIds,
      missingRepoIds,
    };
  }

  private pickStacksByRepoIds(techStack: TechStackItem[], repoIds: string[]): TechStackItem[] {
    if (!repoIds.length) {
      return [];
    }

    const repoSet = new Set(repoIds);
    return techStack
      .filter((stack) => this.matchDomainService.mapTechLabelsToRepoIds([stack.name]).some((repoId) => repoSet.has(repoId)))
      .sort((left, right) => right.match - left.match || left.name.localeCompare(right.name, 'pt-BR'));
  }

  private rotateHiringCopy(): void {
    if (this.hiringCopy.length <= 1) {
      return;
    }

    this.copyIsFading = true;
    this.cdr.markForCheck();

    window.setTimeout(() => {
      this.copyIndex = (this.copyIndex + 1) % this.hiringCopy.length;
      this.cdr.markForCheck();

      window.setTimeout(() => {
        this.copyIsFading = false;
        this.cdr.markForCheck();
      }, 140);
    }, 220);
  }

  get radarCategories(): RadarCategory[] {
    const selectedIds = new Set(this.selectedRadarCategoryIds);

    return this.allRadarCategories
      .filter((category) => selectedIds.has(category.id))
      .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label, 'pt-BR'));
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
      EcossistemaPage.radarCategoriesStorageKey,
      JSON.stringify(this.selectedRadarCategoryIds),
    );
    this.cdr.markForCheck();
  }

  private readonly hiringTrendChartWidth = 820;
  private readonly hiringTrendChartHeight = 280;
  private readonly hiringTrendChartPadding = {
    top: 26,
    right: 24,
    bottom: 26,
    left: 10,
  };

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

  radarDotColor(value: number): string {
    const tone = this.radarTone(value);
    return this.rgba(tone.mid, 0.95);
  }

  radarBarFill(value: number): string {
    const tone = this.radarTone(value);
    return `linear-gradient(90deg, ${this.rgba(tone.dark, 0.98)}, ${this.rgba(tone.mid, 0.96)} 58%, ${this.rgba(tone.light, 0.92)})`;
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
    const rawSelection = this.browserStorage.getItem(EcossistemaPage.radarCategoriesStorageKey);
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
        const mergedSelection = Array.from(new Set([...nextSelection, ...this.defaultRadarCategoryIds]));

        this.selectedRadarCategoryIds = this.allRadarCategories
          .filter((category) => mergedSelection.includes(category.id))
          .map((category) => category.id);
      }
    } catch {
      this.browserStorage.removeItem(EcossistemaPage.radarCategoriesStorageKey);
    }
  }

  resetEcoDiscovery(): void {
    this.ecoFilter = 'radar';
    this.ecosystemSearchService.setQuery('');
    this.cdr.markForCheck();
  }

  trackByEcoFilter(_index: number, item: { id: EcoFilter }): EcoFilter {
    return item.id;
  }

  trackByHiredCard(_index: number, item: HiredSpotlightCard): string {
    return `${item.name}:${item.company}:${item.roleTitle}`;
  }

  trackByPage(_index: number, item: number): number {
    return item;
  }

  trackByRadarCategory(_index: number, item: RadarCategory): string {
    return item.id;
  }

  trackByJob(_index: number, item: MockJobRecord): string {
    return item.id;
  }

  trackByTalentCompatibleJob(_index: number, item: TalentCompatibleJobView): string {
    return item.job.id;
  }

  trackByAvatarBadge(index: number, item: { src: string; label: string }): string {
    return `${index}:${item.src}:${item.label}`;
  }

  trackBySideRailCandidate(_index: number, item: SideRailCandidateCard): string {
    return item.id;
  }

  private hasRealAvatar(avatar: string | undefined): boolean {
    const value = avatar?.trim() ?? '';
    return !!value && !value.endsWith('/assets/avatars/avatar-default.svg');
  }

  private resolveAvatar(avatar: string | undefined): string {
    return this.hasRealAvatar(avatar) ? avatar!.trim() : this.fallbackAvatarUrl;
  }

  private radarTone(value: number): {
    dark: { r: number; g: number; b: number };
    mid: { r: number; g: number; b: number };
    light: { r: number; g: number; b: number };
  } {
    const t = this.clamp01((value - 10) / 35);

    return {
      dark: this.mixRgb(this.warmGray, this.brandOrangeDark, t),
      mid: this.mixRgb(this.warmGray, this.brandOrangeMid, t),
      light: this.mixRgb(this.warmGray, this.brandOrangeLight, t),
    };
  }

  private mixRgb(
    a: { r: number; g: number; b: number },
    b: { r: number; g: number; b: number },
    t: number,
  ): { r: number; g: number; b: number } {
    const clamped = this.clamp01(t);

    return {
      r: Math.round(a.r + (b.r - a.r) * clamped),
      g: Math.round(a.g + (b.g - a.g) * clamped),
      b: Math.round(a.b + (b.b - a.b) * clamped),
    };
  }

  private rgba(color: { r: number; g: number; b: number }, alpha: number): string {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${this.clamp01(alpha)})`;
  }

  private clamp01(value: number): number {
    if (Number.isNaN(value)) {
      return 0;
    }

    return Math.max(0, Math.min(1, value));
  }
}
