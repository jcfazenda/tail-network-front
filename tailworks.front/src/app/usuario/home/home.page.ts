import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { JobsFacade } from '../../core/facades/jobs.facade';
import { MockJobRecord, TechStackItem } from '../../vagas/data/vagas.models';
import { EcosystemEntryService } from './ecosystem-entry.service';
import {
  ECOSYSTEM_FALLBACK_COMPATIBLE_JOBS,
  GALAXY_NEBULAE,
  GALAXY_ORBIT_BANDS,
  GALAXY_TALENT_CORE,
  GALAXY_WORLD_HEIGHT,
  GALAXY_WORLD_WIDTH,
  EcosystemCompanyProfile,
  EcosystemCompatibleJobSeed,
  EcosystemSpotlightItem,
  GalaxyClusterNode,
  GalaxyJobNode,
  GalaxyNebula,
  GalaxyOrbitBandKey,
  GalaxyOrbitBandMeta,
} from './ecosystem.models';

type ViewportSize = {
  width: number;
  height: number;
};

type PointerSnapshot = {
  x: number;
  y: number;
};

@Component({
  standalone: true,
  selector: 'app-home-page',
  imports: [CommonModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements AfterViewInit {
  private readonly jobsFacade = inject(JobsFacade);
  private readonly ecosystemEntryService = inject(EcosystemEntryService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('viewportElement', { static: true })
  private viewportElement!: ElementRef<HTMLElement>;

  readonly worldWidth = GALAXY_WORLD_WIDTH;
  readonly worldHeight = GALAXY_WORLD_HEIGHT;
  readonly minZoom = 0.46;
  readonly maxZoom = 2.35;

  protected readonly galaxyNebulae = GALAXY_NEBULAE;
  protected readonly orbitBands = GALAXY_ORBIT_BANDS;
  protected readonly talentCore = GALAXY_TALENT_CORE;

  protected zoomLevel = 0.86;
  protected cameraX = 0;
  protected cameraY = 0;
  protected isPanning = false;
  protected isPinching = false;
  protected selectedJobId = '';
  protected galaxyJobNodes: GalaxyJobNode[] = [];
  protected galaxyClusters: GalaxyClusterNode[] = [];

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
      description: 'Serviços financeiros e tecnologia para negócios',
      logoLabel: 'st',
    },
    'NTT Data': {
      name: 'NTT Data',
      followers: '1.642.290 seguidores',
      description: 'Consultoria e transformação digital',
      logoLabel: 'nt',
    },
  };

  private activePointers = new Map<number, PointerSnapshot>();
  private panPointerId: number | null = null;
  private panStartX = 0;
  private panStartY = 0;
  private panOriginX = 0;
  private panOriginY = 0;
  private pinchStartDistance = 0;
  private pinchStartZoom = 1;
  private pinchWorldX = 0;
  private pinchWorldY = 0;
  private viewportInitialized = false;
  private userMovedCamera = false;

  protected get ecosystemEntryMode(): 'recruiter' | 'talent' {
    return this.ecosystemEntryService.mode();
  }

  protected get worldTransform(): string {
    return `translate(${this.cameraX}px, ${this.cameraY}px) scale(${this.zoomLevel})`;
  }

  protected get zoomLabel(): string {
    return `${Math.round(this.zoomLevel * 100)}%`;
  }

  protected get showPlanetLayer(): boolean {
    return this.zoomLevel >= 0.66;
  }

  protected get showClusterLayer(): boolean {
    return this.zoomLevel <= 0.92;
  }

  protected get showNebulaLabels(): boolean {
    return this.zoomLevel <= 0.96;
  }

  protected get previewJob(): GalaxyJobNode | undefined {
    return this.galaxyJobNodes.find((node) => node.id === this.selectedJobId);
  }

  protected get previewCompanyProfile(): EcosystemCompanyProfile {
    return this.companyProfileFor(this.previewJob?.record.company);
  }

  protected get previewMatchScore(): number {
    return this.previewJob?.record.match ?? this.talentCore.radarScore;
  }

  protected get previewStacks(): EcosystemSpotlightItem[] {
    const stack = this.previewJob?.record.techStack ?? [];

    if (stack.length) {
      return stack.map((item) => ({
        label: item.name,
        score: item.match,
      }));
    }

    return [
      { label: '.NET / C#', score: 80 },
      { label: 'Entity Framework', score: 65 },
      { label: 'REST API', score: 75 },
      { label: 'SQL Server', score: 70 },
    ];
  }

  protected get previewMeta(): string {
    const record = this.previewJob?.record;

    if (!record) {
      return 'Remoto • CLT + Beneficios';
    }

    const hasBenefits = (record.benefits?.length ?? 0) > 0;
    return hasBenefits
      ? `${record.workModel} • ${record.contractType} + Beneficios`
      : `${record.workModel} • ${record.contractType}`;
  }

  protected readonly trackByNodeId = (_index: number, node: GalaxyJobNode): string => node.id;
  protected readonly trackByClusterId = (_index: number, cluster: GalaxyClusterNode): string => cluster.id;
  protected readonly trackByOrbitKey = (_index: number, band: GalaxyOrbitBandMeta): string => band.key;
  protected readonly trackByNebulaId = (_index: number, nebula: GalaxyNebula): string => nebula.id;

  constructor() {
    effect(() => {
      this.ecosystemEntryService.mode();
      this.buildGalaxyNodes();
      this.cdr.markForCheck();

      if (this.viewportInitialized && !this.userMovedCamera) {
        requestAnimationFrame(() => this.centerOnTalentCore());
      }
    });
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.viewportInitialized = true;
      this.centerOnTalentCore();
    });
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    if (!this.viewportInitialized) {
      return;
    }

    requestAnimationFrame(() => {
      if (!this.userMovedCamera) {
        this.centerOnTalentCore();
        return;
      }

      const clamped = this.clampPan(this.cameraX, this.cameraY, this.zoomLevel);
      this.cameraX = clamped.x;
      this.cameraY = clamped.y;
      this.cdr.markForCheck();
    });
  }

  protected onViewportWheel(event: WheelEvent): void {
    event.preventDefault();

    const rect = this.viewportElement.nativeElement.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const nextZoom = event.deltaY < 0 ? this.zoomLevel * 1.12 : this.zoomLevel * 0.88;

    this.userMovedCamera = true;
    this.applyZoom(nextZoom, pointerX, pointerY);
  }

  protected onViewportPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-galaxy-stop-pan="true"]')) {
      return;
    }

    this.viewportElement.nativeElement.setPointerCapture(event.pointerId);
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.userMovedCamera = true;

    if (this.activePointers.size === 1) {
      this.beginPan(event.pointerId, event.clientX, event.clientY);
      return;
    }

    if (this.activePointers.size === 2) {
      this.beginPinch();
    }
  }

  protected onViewportPointerMove(event: PointerEvent): void {
    if (!this.activePointers.has(event.pointerId)) {
      return;
    }

    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.activePointers.size >= 2) {
      this.updatePinch();
      return;
    }

    if (this.isPanning && this.panPointerId === event.pointerId) {
      const nextX = this.panOriginX + (event.clientX - this.panStartX);
      const nextY = this.panOriginY + (event.clientY - this.panStartY);
      const clamped = this.clampPan(nextX, nextY, this.zoomLevel);
      this.cameraX = clamped.x;
      this.cameraY = clamped.y;
    }
  }

  protected onViewportPointerUp(event: PointerEvent): void {
    this.activePointers.delete(event.pointerId);

    if (this.viewportElement.nativeElement.hasPointerCapture(event.pointerId)) {
      this.viewportElement.nativeElement.releasePointerCapture(event.pointerId);
    }

    if (this.activePointers.size < 2) {
      this.isPinching = false;
      this.pinchStartDistance = 0;
    }

    if (this.panPointerId === event.pointerId) {
      this.isPanning = false;
      this.panPointerId = null;
    }

    if (this.activePointers.size === 1) {
      const [pointerId, point] = [...this.activePointers.entries()][0];
      this.beginPan(pointerId, point.x, point.y);
      return;
    }

    if (this.activePointers.size === 0) {
      this.isPanning = false;
      this.panPointerId = null;
    }
  }

  protected zoomIn(): void {
    const viewport = this.getViewportSize();
    this.userMovedCamera = true;
    this.applyZoom(this.zoomLevel * 1.12, viewport.width / 2, viewport.height / 2);
  }

  protected zoomOut(): void {
    const viewport = this.getViewportSize();
    this.userMovedCamera = true;
    this.applyZoom(this.zoomLevel * 0.88, viewport.width / 2, viewport.height / 2);
  }

  protected recenterGalaxy(): void {
    this.userMovedCamera = false;
    this.centerOnTalentCore();
  }

  protected focusPlanet(nodeId: string): void {
    const node = this.galaxyJobNodes.find((item) => item.id === nodeId);
    if (!node) {
      return;
    }

    this.selectedJobId = nodeId;
    this.userMovedCamera = true;
    this.centerOnWorldPoint(node.x, node.y, Math.max(this.zoomLevel, 1.02));
  }

  protected focusCluster(cluster: GalaxyClusterNode): void {
    this.userMovedCamera = true;
    this.centerOnWorldPoint(cluster.x, cluster.y, Math.max(this.zoomLevel, 0.92));
  }

  protected focusTalentCore(): void {
    this.userMovedCamera = false;
    this.centerOnTalentCore();
  }

  private beginPan(pointerId: number, clientX: number, clientY: number): void {
    this.isPinching = false;
    this.isPanning = true;
    this.panPointerId = pointerId;
    this.panStartX = clientX;
    this.panStartY = clientY;
    this.panOriginX = this.cameraX;
    this.panOriginY = this.cameraY;
  }

  private beginPinch(): void {
    const [a, b] = [...this.activePointers.values()];
    if (!a || !b) {
      return;
    }

    const rect = this.viewportElement.nativeElement.getBoundingClientRect();
    const centerX = (a.x + b.x) / 2 - rect.left;
    const centerY = (a.y + b.y) / 2 - rect.top;

    this.isPanning = false;
    this.panPointerId = null;
    this.isPinching = true;
    this.pinchStartDistance = this.distanceBetween(a, b);
    this.pinchStartZoom = this.zoomLevel;
    this.pinchWorldX = (centerX - this.cameraX) / this.zoomLevel;
    this.pinchWorldY = (centerY - this.cameraY) / this.zoomLevel;
  }

  private updatePinch(): void {
    const [a, b] = [...this.activePointers.values()];
    if (!a || !b || !this.pinchStartDistance) {
      return;
    }

    const rect = this.viewportElement.nativeElement.getBoundingClientRect();
    const centerX = (a.x + b.x) / 2 - rect.left;
    const centerY = (a.y + b.y) / 2 - rect.top;
    const nextZoom = this.clamp(
      this.pinchStartZoom * (this.distanceBetween(a, b) / this.pinchStartDistance),
      this.minZoom,
      this.maxZoom,
    );

    const nextCameraX = centerX - this.pinchWorldX * nextZoom;
    const nextCameraY = centerY - this.pinchWorldY * nextZoom;
    const clamped = this.clampPan(nextCameraX, nextCameraY, nextZoom);

    this.zoomLevel = nextZoom;
    this.cameraX = clamped.x;
    this.cameraY = clamped.y;
  }

  private applyZoom(nextZoom: number, pointerX: number, pointerY: number): void {
    const zoom = this.clamp(nextZoom, this.minZoom, this.maxZoom);

    if (Math.abs(zoom - this.zoomLevel) < 0.001) {
      return;
    }

    const worldX = (pointerX - this.cameraX) / this.zoomLevel;
    const worldY = (pointerY - this.cameraY) / this.zoomLevel;
    const nextCameraX = pointerX - worldX * zoom;
    const nextCameraY = pointerY - worldY * zoom;
    const clamped = this.clampPan(nextCameraX, nextCameraY, zoom);

    this.zoomLevel = zoom;
    this.cameraX = clamped.x;
    this.cameraY = clamped.y;
  }

  private centerOnTalentCore(): void {
    this.centerOnWorldPoint(this.talentCore.x, this.talentCore.y, this.zoomLevel);
  }

  private centerOnWorldPoint(worldX: number, worldY: number, zoom = this.zoomLevel): void {
    const viewport = this.getViewportSize();
    const nextX = viewport.width / 2 - worldX * zoom;
    const nextY = viewport.height / 2 - worldY * zoom;
    const clamped = this.clampPan(nextX, nextY, zoom);

    this.zoomLevel = zoom;
    this.cameraX = clamped.x;
    this.cameraY = clamped.y;
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
    const viewport = this.viewportElement?.nativeElement;
    return {
      width: Math.max(1, viewport?.clientWidth ?? 1),
      height: Math.max(1, viewport?.clientHeight ?? 1),
    };
  }

  private buildGalaxyNodes(): void {
    const jobs = this.resolveCompatibleJobs();
    const grouped = new Map<GalaxyOrbitBandKey, MockJobRecord[]>();

    GALAXY_ORBIT_BANDS.forEach((band) => grouped.set(band.key, []));

    jobs.forEach((job) => {
      grouped.get(this.resolveOrbitBand(job.match))?.push(job);
    });

    this.galaxyJobNodes = GALAXY_ORBIT_BANDS.flatMap((band) =>
      (grouped.get(band.key) ?? []).map((job, index, collection) =>
        this.createJobNode(job, band, index, collection.length),
      ),
    );

    this.galaxyClusters = this.buildClusters(grouped);

    if (!this.galaxyJobNodes.some((node) => node.id === this.selectedJobId)) {
      this.selectedJobId = this.galaxyJobNodes[0]?.id ?? '';
    }
  }

  private resolveCompatibleJobs(): MockJobRecord[] {
    const jobs = this.jobsFacade.getJobs();

    if (this.ecosystemEntryMode === 'recruiter') {
      if (jobs.length) {
        return [jobs[0]];
      }

      return [this.buildFallbackRecord(ECOSYSTEM_FALLBACK_COMPATIBLE_JOBS[0], 0)];
    }

    const activeJobs = jobs.filter((job) => job.status === 'ativas');
    const source = activeJobs.length ? activeJobs : jobs;

    if (source.length) {
      return source.slice(0, 10);
    }

    return ECOSYSTEM_FALLBACK_COMPATIBLE_JOBS.map((seed, index) => this.buildFallbackRecord(seed, index));
  }

  private resolveOrbitBand(match: number): GalaxyOrbitBandKey {
    const band = GALAXY_ORBIT_BANDS.find((item) => match >= item.minMatch && match <= item.maxMatch);
    return band?.key ?? 'outside';
  }

  private createJobNode(
    record: MockJobRecord,
    band: GalaxyOrbitBandMeta,
    index: number,
    totalInBand: number,
  ): GalaxyJobNode {
    const profile = this.companyProfileFor(record.company);
    const angle = this.computeOrbitAngle(band.key, index, totalInBand);
    const jitterX = ((index % 3) - 1) * 30;
    const jitterY = ((index % 4) - 1.5) * 28;
    const x = this.talentCore.x + Math.cos(angle) * band.radiusX + jitterX;
    const y = this.talentCore.y + Math.sin(angle) * band.radiusY + jitterY;

    return {
      id: record.id,
      x,
      y,
      size: this.nodeSizeForBand(band.key),
      orbitBand: band.key,
      accent: band.accent,
      glow: band.glow,
      logoLabel: profile.logoLabel,
      logoUrl: profile.logoUrl,
      record,
    };
  }

  private buildClusters(grouped: Map<GalaxyOrbitBandKey, MockJobRecord[]>): GalaxyClusterNode[] {
    return GALAXY_ORBIT_BANDS.flatMap((band) => {
      const jobs = grouped.get(band.key) ?? [];
      if (jobs.length < 2) {
        return [];
      }

      const angle = this.clusterAngleForBand(band.key);
      return [
        {
          id: `cluster-${band.key}`,
          x: this.talentCore.x + Math.cos(angle) * (band.radiusX * 0.92),
          y: this.talentCore.y + Math.sin(angle) * (band.radiusY * 0.92),
          size: 144 + jobs.length * 14,
          orbitBand: band.key,
          accent: band.accent,
          glow: band.glow,
        },
      ];
    });
  }

  private computeOrbitAngle(band: GalaxyOrbitBandKey, index: number, totalInBand: number): number {
    const base = this.clusterAngleForBand(band);
    const spread = Math.PI / 2.1;
    const count = Math.max(totalInBand, 1);
    const offset = count === 1 ? 0 : (index / (count - 1) - 0.5) * spread;
    return base + offset;
  }

  private clusterAngleForBand(band: GalaxyOrbitBandKey): number {
    switch (band) {
      case 'high':
        return -Math.PI / 4.6;
      case 'good':
        return Math.PI / 7.2;
      case 'potential':
        return Math.PI * 0.7;
      case 'outside':
      default:
        return Math.PI * 1.14;
    }
  }

  private nodeSizeForBand(band: GalaxyOrbitBandKey): number {
    switch (band) {
      case 'high':
        return 82;
      case 'good':
        return 74;
      case 'potential':
        return 66;
      case 'outside':
      default:
        return 58;
    }
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
      hiringDocuments: [],
      techStack,
      differentials: [],
      responsibilitySections: [
        {
          id: 'summary-section-1',
          pageId: 'front',
          title: 'Requisitos e habilidades que buscamos:',
          items: techStack.map((item) => item.name),
        },
      ],
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

  private distanceBetween(a: PointerSnapshot, b: PointerSnapshot): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
