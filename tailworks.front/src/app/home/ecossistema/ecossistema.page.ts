import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { TopbarComponent } from '../../core/layout/topbar/topbar.component';
import { SidebarVisibilityService } from '../../core/layout/sidebar/sidebar-visibility.service';
import { MockJobRecord, WorkModel } from '../../vagas/data/vagas.models';
import { VagasMockService } from '../../vagas/data/vagas-mock.service';
import { Subscription } from 'rxjs';

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

@Component({
  standalone: true,
  selector: 'app-ecossistema-page',
  imports: [CommonModule, TopbarComponent],
  templateUrl: './ecossistema.page.html',
  styleUrls: ['./ecossistema.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EcossistemaPage implements OnDestroy {
  private readonly sidebarVisibilityService = inject(SidebarVisibilityService);
  private readonly vagasMockService = inject(VagasMockService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();
  private copyRotationTimer: number | null = null;
  private hiredRotationTimer: number | null = null;
  private hiredAutoScrollInFlight = false;
  private lastManualHiredInteractionAt = 0;
  private static readonly radarCategoriesStorageKey = 'tailworks:template-radar-categories-selection:v1';
  private readonly warmGray = { r: 170, g: 174, b: 180 };
  private readonly brandOrangeDark = { r: 140, g: 76, b: 18 };
  private readonly brandOrangeMid = { r: 188, g: 109, b: 24 };
  private readonly brandOrangeLight = { r: 242, g: 179, b: 26 };

  private jobsSnapshot: MockJobRecord[] = [];
  private copyIndex = 0;
  copyIsFading = false;

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

  activeHiredIndex = 0;
  readonly hiredPageSize = 4;

  get hiredPageCount(): number {
    return Math.max(1, Math.ceil(this.hiredSpotlights.length / this.hiredPageSize));
  }

  get hiredPages(): number[] {
    return Array.from({ length: this.hiredPageCount }, (_, i) => i);
  }

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
      companyLogoUrl: '/assets/images/logo-nubank-roxinho.webp',
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
      companyLogoUrl: '/assets/images/logo-nubank-roxinho.webp',
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

  showRadarCategoryPicker = false;
  selectedRadarCategoryIds = ['backend', 'frontend', 'cloud', 'devops'];
  readonly sidebarOpen = this.sidebarVisibilityService.isOpen;

  constructor() {
    this.restoreRadarCategorySelection();
    this.refreshJobs();
    this.subscriptions.add(
      this.vagasMockService.jobsChanged$.subscribe(() => {
        this.refreshJobs();
        this.cdr.markForCheck();
      }),
    );

    if (typeof window !== 'undefined') {
      this.copyRotationTimer = window.setInterval(() => this.rotateHiringCopy(), 9000);
      this.hiredRotationTimer = window.setInterval(() => this.autoAdvanceHired(), 9000);
    }
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
  }

  polaroidTilt(seed: string): string {
    // Deterministico, mas "aleatorio" o suficiente: alguns retos, outros levemente inclinados.
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }

    // Alguns ficam retos.
    if (hash % 5 === 0) {
      return '0deg';
    }

    // Tilt mais evidente (polaroid "solto"), mas ainda sutil o suficiente para nao parecer bugado.
    const tiltSteps = [-3.2, -2.4, -1.6, -0.9, 0.9, 1.6, 2.4, 3.2];
    const tilt = tiltSteps[hash % tiltSteps.length] ?? 0;
    return `${tilt}deg`;
  }

  scrollHired(direction: -1 | 1): void {
    const el = this.hiredTrack?.nativeElement;
    if (!el) {
      return;
    }

    const pageWidth = Math.max(1, el.clientWidth);
    const nextPage = Math.min(this.hiredPageCount - 1, Math.max(0, this.activeHiredIndex + direction));
    this.lastManualHiredInteractionAt = Date.now();
    el.scrollTo({ left: nextPage * pageWidth, behavior: 'smooth' });
    if (nextPage !== this.activeHiredIndex) {
      this.activeHiredIndex = nextPage;
      this.cdr.markForCheck();
    }
  }

  onHiredScroll(): void {
    const el = this.hiredTrack?.nativeElement;
    if (!el) {
      return;
    }

    const pageWidth = Math.max(1, el.clientWidth);
    const maxPage = this.hiredPageCount - 1;
    const bestPage = Math.min(maxPage, Math.max(0, Math.round(el.scrollLeft / pageWidth)));

    if (bestPage !== this.activeHiredIndex) {
      this.activeHiredIndex = bestPage;
      this.cdr.markForCheck();
    }

    if (!this.hiredAutoScrollInFlight) {
      this.lastManualHiredInteractionAt = Date.now();
    }
  }

  private autoAdvanceHired(): void {
    const el = this.hiredTrack?.nativeElement;
    if (!el) {
      return;
    }

    // Se o usuario mexeu recentemente (scroll/arrow), nao briga com ele.
    const now = Date.now();
    if (now - this.lastManualHiredInteractionAt < 4000) {
      return;
    }

    const nextPage = (this.activeHiredIndex + 1) % this.hiredPageCount;
    const pageWidth = Math.max(1, el.clientWidth);

    this.hiredAutoScrollInFlight = true;
    el.scrollTo({ left: nextPage * pageWidth, behavior: 'smooth' });
    this.activeHiredIndex = nextPage;
    this.cdr.markForCheck();

    window.setTimeout(() => {
      this.hiredAutoScrollInFlight = false;
    }, 900);
  }

  toggleSidebar(): void {
    this.sidebarVisibilityService.toggle();
  }

  get currentHiringCopy(): { title: string; body: string } {
    return this.hiringCopy[this.copyIndex % this.hiringCopy.length];
  }

  get featuredJob(): MockJobRecord | null {
    const accessibleActive = this.jobsSnapshot
      .filter((job) => job.status === 'ativas' && this.vagasMockService.canCurrentRecruiterAccessJob(job));
    if (accessibleActive.length) {
      return accessibleActive[0];
    }

    const accessibleAny = this.jobsSnapshot
      .filter((job) => this.vagasMockService.canCurrentRecruiterAccessJob(job));
    return accessibleAny[0] ?? this.jobsSnapshot[0] ?? null;
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

  jobCardWorkModel(job: MockJobRecord): string {
    if (job.workModel === 'Remoto') {
      return 'HOME';
    }

    return this.workModelLabel(job.workModel).toUpperCase();
  }

  jobCardLocation(job: MockJobRecord): string {
    return job.location.replace(/\s*-\s*/g, ' - ').replace(/\s+/g, ' ').trim();
  }

  jobCardOffer(job: MockJobRecord): { salary: string | null; rest: string } {
    const salary = job.showSalaryRangeInCard === false ? null : this.formatJobSalary(job.salaryRange);
    const benefits = job.benefits.length > 0 ? ' + Beneficios' : '';
    const rest = `${job.contractType}${benefits}.`;
    return { salary, rest };
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

    // Keep already-formatted ranges as-is.
    if (value.includes('R$')) {
      return value;
    }

    return `R$ ${value}`;
  }

  private refreshJobs(): void {
    this.jobsSnapshot = this.vagasMockService.getJobs();
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
      EcossistemaPage.radarCategoriesStorageKey,
      JSON.stringify(this.selectedRadarCategoryIds),
    );
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
    const rawSelection = localStorage.getItem(EcossistemaPage.radarCategoriesStorageKey);
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
      localStorage.removeItem(EcossistemaPage.radarCategoriesStorageKey);
    }
  }

  private radarTone(value: number): { dark: { r: number; g: number; b: number }; mid: { r: number; g: number; b: number }; light: { r: number; g: number; b: number } } {
    // Smoothly blend from gray to brand orange as the percentage increases.
    // 0-10%: mostly gray. 45%+: mostly orange.
    const t = this.clamp01((value - 10) / 35);
    return {
      dark: this.mixRgb(this.warmGray, this.brandOrangeDark, t),
      mid: this.mixRgb(this.warmGray, this.brandOrangeMid, t),
      light: this.mixRgb(this.warmGray, this.brandOrangeLight, t),
    };
  }

  private mixRgb(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number): { r: number; g: number; b: number } {
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
