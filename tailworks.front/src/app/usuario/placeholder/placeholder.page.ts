import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlcanceRadarComponent, RadarLegendItem } from '../../vagas/cadastro/alcance-radar/alcance-radar.component';
import { JobResponsibilitySection, MockJobRecord, WorkModel } from '../../vagas/data/vagas.models';
import { VagasMockService } from '../../vagas/data/vagas-mock.service';

type CandidateView = 'applications' | 'radar';
type WorkModelFilter = 'all' | WorkModel;
type CandidatePanelView = 'details' | 'benefits' | 'status';
type CandidateStack = {
  name: string;
  knowledge: number;
  description: string;
};
type CandidateStatusPreview = {
  label: string;
  completed: boolean;
  timeLabel?: string;
};
type CompanySummaryProfile = {
  name: string;
  followers: string;
  description: string;
  linkedinCount: string;
  logoLabel: string;
  logoUrl?: string;
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
  private readonly talentCandidateName = 'Rafael Oliveira';

  readonly recruiterName = 'Rafael Souza';
  readonly recruiterRole = 'Talent Acquisition';
  readonly recruiterAvatar = '/assets/avatars/avatar-rafael.png';
  readonly companyProfiles: Record<string, CompanySummaryProfile> = {
    'Banco Itaú': {
      name: 'Banco Itaú',
      followers: '5.248.921 seguidores',
      description: 'Banco e serviços financeiros',
      linkedinCount: '5.248.921 no LinkedIn',
      logoLabel: 'it',
      logoUrl: '/assets/images/logo-itau.png',
    },
    Nubank: {
      name: 'Nubank',
      followers: '2.304.114 seguidores',
      description: 'Tecnologia financeira e meios de pagamento',
      linkedinCount: '2.304.114 no LinkedIn',
      logoLabel: 'nu',
    },
    Stone: {
      name: 'Stone',
      followers: '1.128.440 seguidores',
      description: 'Serviços financeiros e tecnologia para negocios',
      linkedinCount: '1.128.440 no LinkedIn',
      logoLabel: 'st',
    },
  };

  activeView: CandidateView = this.hasAppliedJobs ? 'applications' : 'radar';
  workModelFilter: WorkModelFilter = 'all';
  activeCandidatePanelView: CandidatePanelView = 'details';
  talentStacks: CandidateStack[] = [];
  expandedStackDescriptionIndex: number | null = null;
  talentName = 'Rafael';
  selectedJobId: string | null = null;

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

  get selectedJobPanel(): MockJobRecord | null {
    if (!this.selectedJobId) {
      return null;
    }

    return this.vagasMockService.getJobById(this.selectedJobId) ?? null;
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

    return this.companyProfiles[job.company] ?? {
      name: job.company,
      followers: '120.000 seguidores',
      description: 'Empresa em crescimento',
      linkedinCount: '120.000 no LinkedIn',
      logoLabel: job.company.slice(0, 2).toLowerCase(),
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
    return [];
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

    switch (this.selectedJobStatusCurrentLabel) {
      case 'Talento no radar':
        return 'O sistema encontrou essa vaga com aderência ao seu perfil e ela está disponível para avaliação.';
      case 'Candidatura enviada':
        return 'Sua candidatura foi enviada e o recrutador já consegue ver você nessa vaga.';
      case 'Em processo':
        return 'Seu perfil está em análise e seguindo nas próximas etapas da vaga.';
      case 'Contratação Solicitada':
        return 'A vaga avançou para uma etapa final de contratação ou documentação.';
      default:
        return '';
    }
  }

  get canApplySelectedJob(): boolean {
    const job = this.selectedJobPanel;
    return !!job && !job.talentDecision;
  }

  get candidateSalarySuggestionDisplay(): string {
    return this.selectedJobPanel?.allowCandidateSalarySuggestion
      ? 'Candidato pode sugerir um valor'
      : 'Candidato nao pode sugerir valor';
  }

  applyToJob(jobId: string): void {
    this.vagasMockService.applyAsTalent(jobId);
    this.activeView = 'applications';
  }

  hideJob(jobId: string): void {
    this.vagasMockService.hideFromTalent(jobId);
  }

  openJobPanel(jobId: string): void {
    this.selectedJobId = jobId;
    this.activeCandidatePanelView = 'details';
  }

  closeJobPanel(): void {
    this.selectedJobId = null;
  }

  selectCandidatePanelView(view: CandidatePanelView): void {
    this.activeCandidatePanelView = view;
  }

  applyToSelectedJob(): void {
    if (!this.selectedJobId) {
      return;
    }

    this.vagasMockService.applyAsTalent(this.selectedJobId);
    this.activeView = 'applications';
    this.activeCandidatePanelView = 'status';
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

  jobSalaryDisplay(job: MockJobRecord): string {
    if (job.showSalaryRangeInCard === false) {
      return 'Não informada';
    }

    return this.formatJobSalary(job.salaryRange) ?? 'Não informada';
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

  private buildCandidateStatusPreview(job: MockJobRecord): CandidateStatusPreview[] {
    const activeIndex = this.getTalentStatusStageIndex(job);
    const statuses: Array<Pick<CandidateStatusPreview, 'label' | 'timeLabel'>> = [
      { label: 'Talento no radar', timeLabel: 'Agora' },
      { label: 'Candidatura enviada', timeLabel: 'Agora' },
      { label: 'Em processo', timeLabel: 'Em atualização' },
      { label: 'Contratação Solicitada', timeLabel: 'Em atualização' },
    ];

    return statuses.map((item, index) => ({
      ...item,
      completed: index <= activeIndex,
      timeLabel: index <= activeIndex ? item.timeLabel : undefined,
    }));
  }

  private getTalentStatusStageIndex(job: MockJobRecord): number {
    if (job.talentDecision === 'hidden') {
      return 0;
    }

    const candidate = job.candidates.find((item) => item.name === this.talentCandidateName);
    const stage = candidate?.stage;

    switch (stage) {
      case 'candidatura':
        return 1;
      case 'processo':
      case 'tecnica':
        return 2;
      case 'aguardando':
      case 'documentacao':
        return 3;
      case 'cancelado':
        return 0;
      default:
        return 0;
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
