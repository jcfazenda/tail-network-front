import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AlcanceRadarComponent, RadarLegendItem } from '../../vagas/cadastro/alcance-radar/alcance-radar.component';
import { CandidateStage, JobResponsibilitySection, MockJobRecord, WorkModel } from '../../vagas/data/vagas.models';
import { VagasMockService } from '../../vagas/data/vagas-mock.service';

type CandidateView = 'applications' | 'radar' | 'declined';
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
  active: boolean;
  timeLabel?: string;
  description: string;
  ownerText: string;
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
};

type CandidateBasicProfile = {
  name: string;
};

type CandidateBasicDraft = {
  profile?: Partial<CandidateBasicProfile>;
  photoPreviewUrl?: string;
};

type CandidateFormationCopyDraft = {
  graduation: string;
  specialization: string;
};

@Component({
  standalone: true,
  selector: 'app-candidate-placeholder-page',
  imports: [CommonModule, AlcanceRadarComponent],
  templateUrl: './placeholder.page.html',
  styleUrls: ['./placeholder.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderPage implements OnInit, OnDestroy {
  private static readonly stacksStorageKey = 'tailworks:candidate-stacks-draft:v2';
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';

  private readonly route = inject(ActivatedRoute);
  private readonly vagasMockService = inject(VagasMockService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();
  private selectedJobObservedStage: CandidateStage | null = null;
  private candidateCelebrationTimer: ReturnType<typeof setTimeout> | null = null;

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

  activeView: CandidateView = 'radar';
  workModelFilter: WorkModelFilter = 'all';
  advancedFilterOpen = false;
  activeCandidatePanelView: CandidatePanelView = 'details';
  talentStacks: CandidateStack[] = [];
  expandedStackDescriptionIndex: number | null = null;
  talentName = 'Julio Fazenda';
  talentAvatarUrl = '';
  talentGraduation = 'Bacharelado em Sistemas de Informação';
  talentSpecialization = 'Especialização em Arquitetura de Software';
  selectedJobId: string | null = null;
  selectedJobCheckedDocuments: string[] = [];
  selectedJobDocumentsConsentAccepted = false;
  candidateConfettiPieces: ConfettiPiece[] = [];
  candidateConfettiActive = false;

  ngOnInit(): void {
    this.restoreTalentDraft();
    this.restoreTalentFormationCopy();
    this.restoreTalentStacks();
    this.subscriptions.add(
      this.vagasMockService.jobsChanged$.subscribe(() => {
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
    return this.activeTalentJobs.filter((job) => this.isApplicationsJob(job)).length;
  }

  get radarCount(): number {
    return this.activeTalentJobs.filter((job) => this.isRadarJob(job)).length;
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
    return !!job && !job.talentDecision && this.selectedJobTalentStage !== 'proxima' && this.selectedJobTalentStage !== 'cancelado';
  }

  get canCancelSelectedJob(): boolean {
    return this.selectedJobPanel?.talentDecision === 'applied'
      && ['candidatura', 'processo', 'tecnica', 'aceito', 'documentacao'].includes(this.selectedJobTalentStage ?? '');
  }

  get canRespondToProposalSelectedJob(): boolean {
    return this.selectedJobPanel?.talentDecision === 'applied' && this.selectedJobTalentStage === 'aguardando';
  }

  get showSelectedJobDocumentsSection(): boolean {
    return this.selectedJobTalentStage === 'aceito';
  }

  get showSelectedJobDocumentsSubmission(): boolean {
    return this.selectedJobTalentStage === 'aceito';
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

  jobCardPrimaryActionLabel(job: MockJobRecord): string {
    const status = this.jobStatusLabel(job);
    return status === 'Talento no radar' ? 'Candidatar-se' : status;
  }

  applyToJob(jobId: string): void {
    this.vagasMockService.applyAsTalent(jobId);
  }

  hideJob(jobId: string): void {
    this.vagasMockService.hideFromTalent(jobId);
  }

  openJobPanel(jobId: string): void {
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

  selectCandidatePanelView(view: CandidatePanelView): void {
    this.activeCandidatePanelView = view;
  }

  applyToSelectedJob(): void {
    if (!this.selectedJobId) {
      return;
    }

    this.vagasMockService.applyAsTalent(this.selectedJobId);
    this.activeCandidatePanelView = 'status';
  }

  acceptSelectedJobProposal(): void {
    if (!this.selectedJobId) {
      return;
    }

    this.vagasMockService.acceptOfferAsTalent(this.selectedJobId);
    this.activeCandidatePanelView = 'status';
    this.syncSelectedJobDocumentState();
  }

  keepSelectedJobForNextOpportunity(): void {
    if (!this.selectedJobId) {
      return;
    }

    this.vagasMockService.keepJobForNextOpportunity(this.selectedJobId);
    this.activeCandidatePanelView = 'status';
  }

  cancelSelectedJobApplication(): void {
    if (!this.selectedJobId) {
      return;
    }

    this.vagasMockService.cancelTalentApplication(this.selectedJobId);
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

    this.vagasMockService.submitTalentDocuments(
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
    this.setWorkModelFilter(value);
    this.advancedFilterOpen = false;
  }

  toggleAdvancedFilter(): void {
    this.advancedFilterOpen = !this.advancedFilterOpen;
  }

  closeAdvancedFilter(): void {
    this.advancedFilterOpen = false;
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
    return this.vagasMockService.getEffectiveCandidateStage(this.vagasMockService.findTalentCandidate(job));
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
      this.talentGraduation = draft.graduation?.trim() || this.talentGraduation;
      this.talentSpecialization = draft.specialization?.trim() || this.talentSpecialization;
    } catch {
      localStorage.removeItem(PlaceholderPage.formationCopyStorageKey);
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
