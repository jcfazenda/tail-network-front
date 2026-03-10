import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  HostListener,
  ViewChild,
  inject,
} from '@angular/core';
import { MockJobRecord, TechStackItem } from '../../vagas/data/vagas.models';
import { VagasMockService } from '../../vagas/data/vagas-mock.service';
import { EcosystemEntryService } from './ecosystem-entry.service';
import { RadarFloatingCardComponent } from './radar-floating-card/radar-floating-card.component';
import {
  ECOSYSTEM_FALLBACK_COMPATIBLE_JOBS,
  ECOSYSTEM_JOB_COORDINATE_PRESETS,
  ECOSYSTEM_TALENT_CORE_POSITION,
  ECOSYSTEM_WORLD_HEIGHT,
  ECOSYSTEM_WORLD_WIDTH,
  EcosystemCompanyProfile,
  EcosystemCompatibleJobSeed,
  EcosystemMapJobNode,
  EcosystemSpotlightItem,
} from './ecosystem.models';

type EcosystemNavItem = {
  label: string;
  icon: string;
  active?: boolean;
};

type EcosystemLevelItem = {
  label: string;
  range: string;
  tone: 'high' | 'mid' | 'potentials' | 'outside';
};

type ViewportSize = {
  width: number;
  height: number;
};

@Component({
  standalone: true,
  selector: 'app-home-page',
  imports: [CommonModule, RadarFloatingCardComponent],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements AfterViewInit {
  private readonly vagasMockService = inject(VagasMockService);
  private readonly ecosystemEntryService = inject(EcosystemEntryService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('viewportElement', { static: true })
  private viewportElement!: ElementRef<HTMLElement>;

  readonly worldWidth = ECOSYSTEM_WORLD_WIDTH;
  readonly worldHeight = ECOSYSTEM_WORLD_HEIGHT;
  readonly minZoom = 0.72;
  readonly maxZoom = 1.68;

  protected zoom = 1;
  protected panX = 0;
  protected panY = 0;
  protected isPanning = false;
  protected ecosystemJobNodes: EcosystemMapJobNode[] = [];
  protected selectedJobId = '';

  protected readonly ecosystemItems: EcosystemNavItem[] = [
    { label: 'Radar', icon: 'radar' },
    { label: 'Oportunidades', icon: 'travel_explore', active: true },
    { label: 'Empresas', icon: 'domain' },
    { label: 'Evolução', icon: 'monitoring' },
    { label: 'Cursos', icon: 'school' },
    { label: 'Conquistas', icon: 'workspace_premium' },
  ];

  protected readonly levelItems: EcosystemLevelItem[] = [
    { label: 'Alta', range: '(85-100%)', tone: 'high' },
    { label: 'Boa', range: '(65-84%)', tone: 'mid' },
    { label: 'Potencial', range: '(55-64%)', tone: 'potentials' },
    { label: 'Fora do Radar', range: '(<55%)', tone: 'outside' },
  ];

  private readonly companyProfiles: Record<string, EcosystemCompanyProfile> = {
    'Banco Itaú': {
      name: 'Banco Itaú',
      followers: '5.248.921 seguidores',
      description: 'Banco e serviços financeiros',
      logoLabel: 'it',
      logoUrl: '/assets/images/logo-itau.png',
    },
    Nubank: {
      name: 'Nubank',
      followers: '2.304.114 seguidores',
      description: 'Tecnologia financeira e meios de pagamento',
      logoLabel: 'nu',
    },
    Stone: {
      name: 'Stone',
      followers: '1.128.440 seguidores',
      description: 'Serviços financeiros e tecnologia para negocios',
      logoLabel: 'st',
    },
    'NTT Data': {
      name: 'NTT Data',
      followers: '1.642.290 seguidores',
      description: 'Consultoria e transformação digital',
      logoLabel: 'nt',
    },
  };

  private panPointerId: number | null = null;
  private panStartX = 0;
  private panStartY = 0;
  private panOriginX = 0;
  private panOriginY = 0;
  private hasViewportInteraction = false;
  private viewportInitialized = false;

  protected get ecosystemEntryMode(): 'recruiter' | 'talent' {
    return this.ecosystemEntryService.mode();
  }

  protected get levelValue(): number {
    if (this.ecosystemEntryMode === 'recruiter') {
      return this.selectedJobNode?.record.match ?? 84;
    }

    return this.selectedJobNode?.record.match ?? 84;
  }

  protected get selectedJobNode(): EcosystemMapJobNode | undefined {
    return this.ecosystemJobNodes.find((node) => node.id === this.selectedJobId);
  }

  protected get worldTransform(): string {
    return `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  protected get zoomLabel(): string {
    return `${Math.round(this.zoom * 100)}%`;
  }

  protected get spotlightCompanyProfile(): EcosystemCompanyProfile {
    return this.companyProfileFor(this.selectedJobNode?.record.company);
  }

  protected get spotlightItems(): EcosystemSpotlightItem[] {
    const techStack = this.selectedJobNode?.record.techStack ?? [];

    if (techStack.length) {
      return techStack.map((item) => ({
        label: item.name,
        score: item.match,
      }));
    }

    return [
      { label: '.NET', score: 95 },
      { label: 'SQL Server', score: 76 },
      { label: 'Azure', score: 90 },
      { label: 'Docker', score: 22 },
    ];
  }

  protected get spotlightJobTitle(): string {
    return this.selectedJobNode?.record.title ?? 'Backend .NET Sênior';
  }

  protected get spotlightJobLocation(): string {
    return this.selectedJobNode?.record.location ?? 'Rio de Janeiro - RJ';
  }

  protected get spotlightMatchScore(): number {
    return this.selectedJobNode?.record.match ?? 91;
  }

  protected get spotlightMeta(): string {
    const record = this.selectedJobNode?.record;

    if (!record) {
      return 'Remoto • CLT + Beneficios';
    }

    const hasBenefits = (record.benefits?.length ?? 0) > 0;
    return hasBenefits
      ? `${record.workModel} • ${record.contractType} + Beneficios`
      : `${record.workModel} • ${record.contractType}`;
  }

  protected readonly trackByNodeId = (_index: number, node: EcosystemMapJobNode): string => node.id;

  constructor() {
    effect(() => {
      this.ecosystemEntryService.mode();
      this.buildJobNodes();
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.viewportInitialized = true;
      this.centerInitialFocus();
    });
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    if (!this.viewportInitialized) {
      return;
    }

    requestAnimationFrame(() => {
      if (!this.hasViewportInteraction) {
        this.centerInitialFocus();
        return;
      }

      const clamped = this.clampPan(this.panX, this.panY, this.zoom);
      this.panX = clamped.x;
      this.panY = clamped.y;
    });
  }

  protected onViewportWheel(event: WheelEvent): void {
    event.preventDefault();
    this.hasViewportInteraction = true;

    const viewport = this.viewportElement.nativeElement;
    const rect = viewport.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const factor = event.deltaY < 0 ? 1.12 : 0.88;

    this.applyZoom(this.zoom * factor, pointerX, pointerY);
  }

  protected onViewportPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-ecosystem-stop-pan="true"]')) {
      return;
    }

    this.hasViewportInteraction = true;
    this.isPanning = true;
    this.panPointerId = event.pointerId;
    this.panStartX = event.clientX;
    this.panStartY = event.clientY;
    this.panOriginX = this.panX;
    this.panOriginY = this.panY;

    this.viewportElement.nativeElement.setPointerCapture(event.pointerId);
  }

  protected onViewportPointerMove(event: PointerEvent): void {
    if (!this.isPanning || this.panPointerId !== event.pointerId) {
      return;
    }

    const nextX = this.panOriginX + (event.clientX - this.panStartX);
    const nextY = this.panOriginY + (event.clientY - this.panStartY);
    const clamped = this.clampPan(nextX, nextY, this.zoom);
    this.panX = clamped.x;
    this.panY = clamped.y;
  }

  protected onViewportPointerUp(event: PointerEvent): void {
    if (!this.isPanning || this.panPointerId !== event.pointerId) {
      return;
    }

    this.isPanning = false;
    this.viewportElement.nativeElement.releasePointerCapture(event.pointerId);
    this.panPointerId = null;
  }

  protected zoomIn(): void {
    const viewport = this.getViewportSize();
    this.hasViewportInteraction = true;
    this.applyZoom(this.zoom * 1.12, viewport.width / 2, viewport.height / 2);
  }

  protected zoomOut(): void {
    const viewport = this.getViewportSize();
    this.hasViewportInteraction = true;
    this.applyZoom(this.zoom * 0.88, viewport.width / 2, viewport.height / 2);
  }

  protected recenterWorld(): void {
    this.hasViewportInteraction = false;
    this.centerInitialFocus();
  }

  protected selectJob(nodeId: string): void {
    this.selectedJobId = nodeId;
  }

  private centerInitialFocus(): void {
    const focus = this.primaryFocusCoordinates();
    this.centerOnWorldPoint(focus.x, focus.y);
  }

  private primaryFocusCoordinates(): { x: number; y: number } {
    const node = this.selectedJobNode ?? this.ecosystemJobNodes[0];

    if (!node) {
      return ECOSYSTEM_TALENT_CORE_POSITION;
    }

    return { x: node.x, y: node.y };
  }

  private centerOnWorldPoint(worldX: number, worldY: number): void {
    const viewport = this.getViewportSize();
    const nextX = viewport.width / 2 - worldX * this.zoom;
    const nextY = viewport.height / 2 - worldY * this.zoom;
    const clamped = this.clampPan(nextX, nextY, this.zoom);

    this.panX = clamped.x;
    this.panY = clamped.y;
  }

  private applyZoom(nextZoom: number, pointerX: number, pointerY: number): void {
    const zoom = this.clamp(nextZoom, this.minZoom, this.maxZoom);

    if (Math.abs(zoom - this.zoom) < 0.001) {
      return;
    }

    const worldX = (pointerX - this.panX) / this.zoom;
    const worldY = (pointerY - this.panY) / this.zoom;
    const nextPanX = pointerX - worldX * zoom;
    const nextPanY = pointerY - worldY * zoom;
    const clamped = this.clampPan(nextPanX, nextPanY, zoom);

    this.zoom = zoom;
    this.panX = clamped.x;
    this.panY = clamped.y;
  }

  private clampPan(nextX: number, nextY: number, zoom: number): { x: number; y: number } {
    const viewport = this.getViewportSize();
    const scaledWidth = this.worldWidth * zoom;
    const scaledHeight = this.worldHeight * zoom;

    let x = nextX;
    let y = nextY;

    if (scaledWidth <= viewport.width) {
      x = (viewport.width - scaledWidth) / 2;
    } else {
      x = this.clamp(nextX, viewport.width - scaledWidth, 0);
    }

    if (scaledHeight <= viewport.height) {
      y = (viewport.height - scaledHeight) / 2;
    } else {
      y = this.clamp(nextY, viewport.height - scaledHeight, 0);
    }

    return { x, y };
  }

  private getViewportSize(): ViewportSize {
    const element = this.viewportElement?.nativeElement;

    return {
      width: Math.max(1, element?.clientWidth ?? 1),
      height: Math.max(1, element?.clientHeight ?? 1),
    };
  }

  private buildJobNodes(): void {
    const sourceJobs = this.resolveCompatibleJobs();

    this.ecosystemJobNodes = sourceJobs.map((record, index) => this.createJobNode(record, index));

    if (!this.ecosystemJobNodes.some((node) => node.id === this.selectedJobId)) {
      this.selectedJobId = this.ecosystemJobNodes[0]?.id ?? '';
    }
  }

  private resolveCompatibleJobs(): MockJobRecord[] {
    const jobs = this.vagasMockService.getJobs();

    if (this.ecosystemEntryMode === 'recruiter') {
      if (jobs.length) {
        return [jobs[0]];
      }

      return [this.buildFallbackRecord(ECOSYSTEM_FALLBACK_COMPATIBLE_JOBS[0], 0)];
    }

    const activeJobs = jobs.filter((job) => job.status === 'ativas');
    const compatibleSource = activeJobs.length ? activeJobs : jobs;

    if (compatibleSource.length) {
      return compatibleSource.slice(0, ECOSYSTEM_JOB_COORDINATE_PRESETS.length);
    }

    return ECOSYSTEM_FALLBACK_COMPATIBLE_JOBS.map((seed, index) => this.buildFallbackRecord(seed, index));
  }

  private createJobNode(record: MockJobRecord, index: number): EcosystemMapJobNode {
    const preset = ECOSYSTEM_JOB_COORDINATE_PRESETS[index] ?? this.createFallbackCoordinate(index);

    return {
      id: record.id,
      x: preset.x,
      y: preset.y,
      accent: preset.accent,
      record,
      previewStacks: (record.techStack ?? []).slice(0, 3).map((item) => ({
        label: item.name,
        score: item.match,
      })),
    };
  }

  private createFallbackCoordinate(index: number): { x: number; y: number; accent: string } {
    const radius = 380 + index * 38;
    const angle = (index / Math.max(1, ECOSYSTEM_JOB_COORDINATE_PRESETS.length)) * Math.PI * 2;

    return {
      x: ECOSYSTEM_TALENT_CORE_POSITION.x + Math.cos(angle) * radius,
      y: ECOSYSTEM_TALENT_CORE_POSITION.y + Math.sin(angle) * radius,
      accent: '#f59e0b',
    };
  }

  private buildFallbackRecord(seed: EcosystemCompatibleJobSeed, index: number): MockJobRecord {
    const now = new Date().toISOString();
    const techStack: TechStackItem[] = seed.techStack.map((item) => ({
      name: item.label,
      match: item.score,
    }));

    return {
      id: `ecosystem-fallback-${index}`,
      title: seed.title,
      company: seed.company,
      location: seed.location,
      workModel: seed.workModel as MockJobRecord['workModel'],
      seniority: 'Sênior',
      summary: seed.title,
      contractType: seed.contractType as MockJobRecord['contractType'],
      statusReason: '',
      salaryRange: '',
      showSalaryRangeInCard: true,
      allowCandidateSalarySuggestion: false,
      hybridOnsiteDaysDescription: '',
      benefits: seed.benefitsLabel ? [{ title: seed.benefitsLabel }] : [],
      techStack,
      differentials: [],
      priority: seed.location.toUpperCase(),
      match: seed.match,
      talents: 18,
      radarCount: 12,
      ageLabel: 'Agora',
      postedLabel: '',
      avatars: [],
      extraCount: 0,
      status: 'ativas',
      candidates: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  private companyProfileFor(companyName?: string): EcosystemCompanyProfile {
    if (companyName && this.companyProfiles[companyName]) {
      return this.companyProfiles[companyName];
    }

    if (companyName) {
      return {
        name: companyName,
        followers: '120.000 seguidores',
        description: 'Empresa em crescimento',
        logoLabel: companyName.slice(0, 2).toLowerCase(),
      };
    }

    return this.companyProfiles['Banco Itaú'];
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
