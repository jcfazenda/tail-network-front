import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlcanceRadarComponent, RadarLegendItem } from '../../vagas/cadastro/alcance-radar/alcance-radar.component';
import { MockJobRecord, WorkModel } from '../../vagas/data/vagas.models';
import { VagasMockService } from '../../vagas/data/vagas-mock.service';

type CandidateView = 'applications' | 'radar';
type WorkModelFilter = 'all' | WorkModel;
type CandidateStack = {
  name: string;
  knowledge: number;
  description: string;
};

type CandidateBasicProfile = {
  name: string;
};

type CandidateBasicDraft = {
  profile?: Partial<CandidateBasicProfile>;
};

@Component({
  standalone: true,
  selector: 'app-candidate-placeholder-page',
  imports: [CommonModule, AlcanceRadarComponent],
  templateUrl: './placeholder.page.html',
  styleUrls: ['./placeholder.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderPage implements OnInit {
  private static readonly stacksStorageKey = 'tailworks:candidate-stacks-draft:v2';
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';

  private readonly route = inject(ActivatedRoute);
  private readonly vagasMockService = inject(VagasMockService);

  readonly jobGaugeRadius = 42;
  readonly jobGaugeCircumference = 2 * Math.PI * this.jobGaugeRadius;
  readonly recruiterName = 'Rafael Souza';
  readonly recruiterRole = 'Talent Acquisition';
  readonly recruiterAvatar = '/assets/avatars/avatar-rafael.png';

  activeView: CandidateView = this.hasAppliedJobs ? 'applications' : 'radar';
  workModelFilter: WorkModelFilter = 'all';
  talentStacks: CandidateStack[] = [];
  expandedStackDescriptionIndex: number | null = null;
  talentName = 'Rafael';

  ngOnInit(): void {
    this.restoreTalentDraft();
    this.restoreTalentStacks();
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
        label: 'Alta compatibilidade',
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

  get activeTalentJobs(): MockJobRecord[] {
    return this.vagasMockService.getJobs()
      .filter((job) => job.status === 'ativas');
  }

  get applicationsCount(): number {
    return this.activeTalentJobs.filter((job) => job.talentDecision === 'applied').length;
  }

  get radarCount(): number {
    return this.activeTalentJobs.filter((job) => job.talentDecision !== 'applied').length;
  }

  get displayedJobs(): MockJobRecord[] {
    const baseJobs = this.activeView === 'applications'
      ? this.activeTalentJobs.filter((job) => job.talentDecision === 'applied')
      : this.activeTalentJobs.filter((job) => job.talentDecision !== 'applied');

    if (this.workModelFilter === 'all') {
      return baseJobs;
    }

    return baseJobs.filter((job) => job.workModel === this.workModelFilter);
  }

  get emptyStateMessage(): string {
    if (this.activeView === 'applications') {
      return this.workModelFilter === 'all'
        ? 'Você ainda não se candidatou a nenhuma vaga.'
        : `Nenhuma candidatura encontrada em ${this.workModelLabel(this.workModelFilter)}.`;
    }

    return this.workModelFilter === 'all'
      ? 'Nenhuma vaga disponível no seu radar agora.'
      : `Nenhuma vaga em ${this.workModelLabel(this.workModelFilter)} no seu radar.`;
  }

  applyToJob(jobId: string): void {
    this.vagasMockService.applyAsTalent(jobId);
  }

  hideJob(jobId: string): void {
    this.vagasMockService.hideFromTalent(jobId);
  }

  setView(view: CandidateView): void {
    this.activeView = view;
  }

  setWorkModelFilter(value: string): void {
    this.workModelFilter = this.isWorkModel(value) ? value : 'all';
  }

  toggleStackDescription(index: number): void {
    const current = this.talentStacks[index];

    if (!current?.description.trim()) {
      return;
    }

    this.expandedStackDescriptionIndex = this.expandedStackDescriptionIndex === index ? null : index;
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

  jobGaugeOffset(score: number): number {
    const safeScore = Math.min(100, Math.max(0, score));
    return this.jobGaugeCircumference * (1 - safeScore / 100);
  }

  private formatJobSalary(value?: string): string | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    return normalized.startsWith('R$') ? normalized : `R$ ${normalized}`;
  }

  private get hasAppliedJobs(): boolean {
    return this.vagasMockService.getJobs()
      .some((job) => job.status === 'ativas' && job.talentDecision === 'applied');
  }

  private restoreTalentDraft(): void {
    const rawDraft = localStorage.getItem(PlaceholderPage.basicDraftStorageKey);

    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as CandidateBasicDraft;
      this.talentName = draft.profile?.name?.trim() || this.talentName;
    } catch {
      localStorage.removeItem(PlaceholderPage.basicDraftStorageKey);
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
