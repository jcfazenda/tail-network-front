import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, inject } from '@angular/core';
import { ChatCandidate, ChatJob } from './tail-chat-panel.component';
import { VagasMockService } from '../vagas/data/vagas-mock.service';
import { Subscription } from 'rxjs';

type CandidateModalTab = 'journey' | 'curriculum';

type CandidateBasicDraft = {
  profile?: {
    name?: string;
    location?: string;
  };
  photoPreviewUrl?: string;
};

type FormationCopyDraft = {
  graduation: string;
  specialization: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  graduated: boolean;
  educationStatus: string;
};

type ExperienceEntry = {
  id: string;
  company: string;
  role: string;
  workModel: 'Presencial' | 'Híbrido' | 'Remoto';
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  currentlyWorkingHere: boolean;
  responsibilities: string;
  positionLevel: 'Júnior' | 'Pleno' | 'Sênior' | 'Tech Lead';
  companySize: 'Startup' | 'Média' | 'Grande';
  companySegment: string;
  sector: string;
  actuation: number;
  appliedStacks: ExperienceAppliedStack[];
};

type ExperienceAppliedStack = {
  name: string;
  knowledge: number;
  description: string;
};

interface CandidateJourneyStep {
  label: string;
  timeLabel?: string;
  description: string;
  ownerText: string;
  completed: boolean;
  active: boolean;
}

interface CandidateModalData {
  name: string;
  avatar: string;
  role: string;
  location: string;
  graduation: string;
  specialization: string;
  formationHeading: string;
  educationStatus: string;
  experiences: ExperienceEntry[];
  journey: CandidateJourneyStep[];
}

@Component({
  standalone: true,
  selector: 'app-candidate-profile-modal',
  imports: [CommonModule],
  templateUrl: './candidate-profile-modal.component.html',
  styleUrls: ['./candidate-profile-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateProfileModalComponent implements OnChanges, OnDestroy {
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly experiencesStorageKey = 'tailworks:candidate-experiences-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';
  private static readonly monthOrder = new Map<string, number>([
    ['jan', 1],
    ['janeiro', 1],
    ['fev', 2],
    ['fevereiro', 2],
    ['mar', 3],
    ['marco', 3],
    ['marco', 3],
    ['abril', 4],
    ['abr', 4],
    ['mai', 5],
    ['maio', 5],
    ['jun', 6],
    ['junho', 6],
    ['jul', 7],
    ['julho', 7],
    ['ago', 8],
    ['agosto', 8],
    ['set', 9],
    ['setembro', 9],
    ['out', 10],
    ['outubro', 10],
    ['nov', 11],
    ['novembro', 11],
    ['dez', 12],
    ['dezembro', 12],
  ]);
  private readonly vagasMockService = inject(VagasMockService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();

  @Input({ required: true }) job!: ChatJob;
  @Input({ required: true }) candidate!: ChatCandidate;
  @Input() initialTab: CandidateModalTab = 'curriculum';
  @Output() close = new EventEmitter<void>();

  activeTab: CandidateModalTab = 'curriculum';
  modalData: CandidateModalData | null = null;
  currentExperienceIndex: number | null = null;
  expandedJourneyIndex = 0;

  constructor() {
    this.subscriptions.add(
      this.vagasMockService.jobsChanged$.subscribe(() => {
        this.refreshFromLatestJob();
      }),
    );
  }

  ngOnChanges(): void {
    this.syncModalState(true);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  setTab(tab: CandidateModalTab): void {
    this.activeTab = tab;
    if (tab === 'curriculum') {
      this.currentExperienceIndex = this.getDefaultExperienceIndex();
      return;
    }

    this.expandedJourneyIndex = this.currentJourneyIndex;
  }

  closeModal(): void {
    this.close.emit();
  }

  get currentExperience(): ExperienceEntry | null {
    const experiences = this.modalData?.experiences ?? [];

    if (!experiences.length) {
      return null;
    }

    const safeIndex = this.currentExperienceIndex ?? 0;
    return experiences[safeIndex] ?? experiences[0];
  }

  get currentExperiencePageNumber(): number {
    if (!this.currentExperience) {
      return 0;
    }

    return (this.currentExperienceIndex ?? 0) + 1;
  }

  get currentExperiencePreviewStacks(): ExperienceAppliedStack[] {
    if (!this.currentExperience) {
      return [];
    }

    return this.currentExperience.appliedStacks;
  }

  get canGoToPreviousExperience(): boolean {
    return (this.currentExperienceIndex ?? 0) > 0;
  }

  get canGoToNextExperience(): boolean {
    const experiencesCount = this.modalData?.experiences.length ?? 0;
    return (this.currentExperienceIndex ?? 0) < experiencesCount - 1;
  }

  showPreviousExperience(): void {
    if (!this.canGoToPreviousExperience) {
      return;
    }

    this.currentExperienceIndex = (this.currentExperienceIndex ?? 0) - 1;
  }

  showNextExperience(): void {
    if (!this.canGoToNextExperience) {
      return;
    }

    this.currentExperienceIndex = (this.currentExperienceIndex ?? 0) + 1;
  }

  isJourneyExpanded(index: number): boolean {
    return this.expandedJourneyIndex === index;
  }

  toggleJourneyDetails(index: number): void {
    this.expandedJourneyIndex = this.expandedJourneyIndex === index ? -1 : index;
  }

  get currentStage(): string {
    return this.resolveCandidateStage(this.currentCandidateRecord);
  }

  get currentJourneyIndex(): number {
    return this.getJourneyStageIndex(this.currentStage);
  }

  get contractDecision(): 'accepted' | 'next' | null {
    if (this.currentStage === 'proxima' || this.currentStage === 'cancelado') {
      return 'next';
    }

    if (this.currentStage === 'aceito' || this.currentStage === 'documentacao' || this.currentStage === 'contratado') {
      return 'accepted';
    }

    return null;
  }

  get documentsSubmittedByTalent(): boolean {
    return this.currentStage === 'documentacao' || this.currentStage === 'contratado';
  }

  get documentsSent(): boolean {
    return this.currentStage === 'contratado';
  }

  get showJourneyAdvanceAction(): boolean {
    return false;
  }

  get journeyAdvanceLabel(): string {
    return 'Avançar';
  }

  get showAdvanceToProcessAction(): boolean {
    return this.currentStage === 'candidatura';
  }

  get showRequestHiringAction(): boolean {
    return this.currentStage === 'processo' || this.currentStage === 'tecnica';
  }

  get showCloseVacancyAction(): boolean {
    return this.showAdvanceToProcessAction || this.showRequestHiringAction;
  }

  get showCancelHiringRequestAction(): boolean {
    return this.currentStage === 'aguardando';
  }

  get showMarkAsHiredAction(): boolean {
    return this.currentStage === 'documentacao';
  }

  get showDeclineCandidateAction(): boolean {
    return this.currentStage === 'documentacao';
  }

  get showAwaitingTalentDecisionMessage(): boolean {
    return this.contractDecision === null && this.currentStage === 'aguardando';
  }

  get showJourneyDocumentsPreview(): boolean {
    return this.contractDecision === 'accepted';
  }

  get showValidateDocumentsAction(): boolean {
    return this.showMarkAsHiredAction;
  }

  get showRadarStatusMessage(): boolean {
    return this.contractDecision === 'next';
  }

  get showWelcomeStatusMessage(): boolean {
    return this.contractDecision === 'accepted' && this.documentsSent;
  }

  get isAwaitingTalentDocuments(): boolean {
    return this.contractDecision === 'accepted' && !this.documentsSubmittedByTalent && !this.documentsSent;
  }

  get hiringDocuments(): string[] {
    return this.job.hiringDocuments ?? [];
  }

  get submittedHiringDocuments(): string[] {
    return this.currentCandidateRecord.submittedDocuments ?? [];
  }

  get talentDocumentsConsentAccepted(): boolean {
    return this.currentCandidateRecord.documentsConsentAccepted ?? false;
  }

  advanceJourneyStage(): void {
    if (!this.showAdvanceToProcessAction) {
      return;
    }

    this.vagasMockService.updateCandidateStage(
      this.job.id,
      this.currentCandidateRecord.id ?? this.currentCandidateRecord.name,
      'processo',
    );
  }

  requestHiring(): void {
    if (!this.showRequestHiringAction) {
      return;
    }

    this.vagasMockService.updateCandidateStage(
      this.job.id,
      this.currentCandidateRecord.id ?? this.currentCandidateRecord.name,
      'aguardando',
    );
  }

  cancelHiringRequest(): void {
    if (!this.showCancelHiringRequestAction) {
      return;
    }

    this.vagasMockService.updateCandidateStage(
      this.job.id,
      this.currentCandidateRecord.id ?? this.currentCandidateRecord.name,
      'processo',
    );
  }

  closeVacancy(): void {
    if (!this.showCloseVacancyAction) {
      return;
    }

    this.vagasMockService.updateJobStatus(this.job.id, 'encerradas', 'Encerrada a partir do fluxo do candidato');
  }

  concludeJourneyDocuments(): void {
    if (!this.showValidateDocumentsAction) {
      return;
    }

    this.vagasMockService.updateCandidateStage(
      this.job.id,
      this.currentCandidateRecord.id ?? this.currentCandidateRecord.name,
      'contratado',
    );
  }

  declineCandidate(): void {
    if (!this.showDeclineCandidateAction) {
      return;
    }

    this.vagasMockService.updateCandidateStage(
      this.job.id,
      this.currentCandidateRecord.id ?? this.currentCandidateRecord.name,
      'proxima',
    );
  }

  isSubmittedHiringDocument(label: string): boolean {
    return this.submittedHiringDocuments.includes(label);
  }

  private buildModalData(candidate: ChatCandidate): CandidateModalData {
    const isSystemCandidate = this.isSystemCandidate(candidate);
    const storedBasicDraft = isSystemCandidate ? this.readBasicDraft() : null;
    const storedFormationCopy = isSystemCandidate ? this.readFormationCopy() : null;
    const storedExperiences = isSystemCandidate ? this.readExperiences() : [];
    const fallbackRole = candidate.stack || candidate.role;

    return {
      name: storedBasicDraft?.profile?.name?.trim() || candidate.name,
      avatar: storedBasicDraft?.photoPreviewUrl?.trim() || candidate.avatar,
      role: fallbackRole,
      location: storedBasicDraft?.profile?.location?.trim() || candidate.location || '',
      graduation: storedFormationCopy?.graduation?.trim() || 'Dados curriculares indisponíveis',
      specialization: storedFormationCopy?.specialization?.trim() || 'Sem especialização informada',
      formationHeading: this.buildFormationHeading(storedFormationCopy),
      educationStatus: storedFormationCopy?.educationStatus?.trim() || 'Perfil curricular não sincronizado',
      experiences: storedExperiences,
      journey: this.buildCandidateJourney(candidate),
    };
  }

  private buildCandidateJourney(candidate: ChatCandidate): CandidateJourneyStep[] {
    const stage = this.resolveCandidateStage(candidate);
    const activeIndex = this.getJourneyStageIndex(stage);
    const decisionAccepted = stage === 'aceito';
    const decisionNext = stage === 'proxima' || stage === 'cancelado';
    const hired = stage === 'contratado';
    const reviewingDocuments = stage === 'documentacao' || hired;
    const statuses = [
      {
        label: 'Talento no radar',
        timeLabel: 'Semana passada',
        description: 'O sistema encontrou esse talento no radar da vaga e ele ainda não iniciou candidatura.',
        ownerText: 'Movido pelo sistema',
      },
      {
        label: 'Candidatura enviada',
        timeLabel: 'Agora',
        description: 'O talento demonstrou interesse e a candidatura já entrou no seu funil.',
        ownerText: 'Ação do talento',
      },
      {
        label: 'Em processo',
        timeLabel: 'Em atualização',
        description: 'Você avançou o perfil para análise, conversa e próximas etapas do processo.',
        ownerText: 'Ação do recruiter',
      },
      {
        label: 'Contratação Solicitada',
        timeLabel: 'Em atualização',
        description: 'A proposta ou solicitação final foi enviada e agora depende do retorno do talento.',
        ownerText: 'Ação do recruiter',
      },
      {
        label: decisionAccepted ? 'Aceito' : decisionNext ? 'Ficou pra próxima' : 'Aceito / Ficou pra próxima',
        timeLabel: 'Em atualização',
        description: decisionAccepted
          ? 'O talento aceitou a proposta e agora pode enviar os documentos da contratação.'
          : decisionNext
            ? 'O talento preferiu não seguir nesta vaga agora, mas pode continuar elegível para futuras oportunidades.'
            : 'Aqui o talento responde se aceita a proposta ou se prefere ficar para uma próxima oportunidade.',
        ownerText: 'Ação do talento',
      },
      {
        label: 'Validando documentos',
        timeLabel: 'Em atualização',
        description: 'Depois do envio dos documentos pelo talento, o recruiter revisa tudo e dá o ok para seguir.',
        ownerText: 'Ação do recruiter',
      },
      {
        label: decisionNext ? 'Não foi desta vez (ou Continua no Radar)' : hired ? 'Contratado' : 'Contratado / Não foi desta vez (ou Continua no Radar)',
        timeLabel: 'Em atualização',
        description: decisionNext
          ? 'Esse ciclo foi encerrado para esta vaga e o talento pode continuar elegível para novas oportunidades.'
          : hired
            ? 'Contratação concluída e fluxo encerrado com sucesso.'
            : 'Ao final da validação, você encerra o ciclo contratando o talento ou mantendo o perfil elegível para futuras vagas.',
        ownerText: 'Ação do recruiter',
      },
    ];

    return statuses.map((item, index) => ({
      ...item,
      completed: this.isJourneyStepCompleted(index, stage, reviewingDocuments),
      active: index === activeIndex,
      timeLabel: this.isJourneyStepCompleted(index, stage, reviewingDocuments) ? item.timeLabel : undefined,
    }));
  }

  private getJourneyStageIndex(stage: string): number {
    switch (stage) {
      case 'radar':
        return 0;
      case 'candidatura':
        return 1;
      case 'processo':
      case 'tecnica':
        return 2;
      case 'aguardando':
        return 3;
      case 'aceito':
      case 'proxima':
      case 'cancelado':
        return 4;
      case 'documentacao':
        return 5;
      case 'contratado':
        return 6;
      default:
        return 2;
    }
  }

  private isJourneyStepCompleted(index: number, stage: string, reviewingDocuments: boolean): boolean {
    if (stage === 'radar') {
      return index === 0;
    }

    if (stage === 'proxima' || stage === 'cancelado') {
      return index <= 4 || index === 6;
    }

    if (stage === 'contratado') {
      return true;
    }

    if (reviewingDocuments) {
      return index <= 5;
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
      default:
        return index === 0;
    }
  }

  private refreshFromLatestJob(): void {
    if (!this.job?.id || !this.candidate) {
      return;
    }

    const latestJob = this.vagasMockService.getJobById(this.job.id);
    if (!latestJob) {
      return;
    }

    const candidateKey = this.candidate.id ?? this.candidate.name;
    const refreshedCandidate = latestJob.candidates.find(
      (item) => (item.id ?? item.name) === candidateKey,
    );

    if (!refreshedCandidate) {
      return;
    }

    this.job = {
      ...this.job,
      hiringDocuments: [...latestJob.hiringDocuments],
      talentSubmittedDocuments: [...(latestJob.talentSubmittedDocuments ?? [])],
      talentDocumentsConsentAccepted: latestJob.talentDocumentsConsentAccepted ?? false,
    };
    this.candidate = {
      ...this.candidate,
      ...refreshedCandidate,
    };

    this.syncModalState(false);
    this.cdr.markForCheck();
  }

  private syncModalState(resetTab: boolean): void {
    if (resetTab) {
      this.activeTab = this.initialTab;
    }

    const currentCandidate = this.currentCandidateRecord;
    this.modalData = this.buildModalData(currentCandidate);
    this.currentExperienceIndex = this.getDefaultExperienceIndex();
    this.expandedJourneyIndex = this.currentJourneyIndex;
  }

  private resolveCandidateStage(candidate: ChatCandidate): string {
    return this.vagasMockService.getEffectiveCandidateStage(candidate) ?? 'radar';
  }

  private get currentCandidateRecord(): ChatCandidate {
    if (!this.job?.id || !this.candidate) {
      return this.candidate;
    }

    const latestJob = this.vagasMockService.getJobById(this.job.id);
    if (!latestJob) {
      return this.candidate;
    }

    const candidateKey = this.candidate.id ?? this.candidate.name;
    const refreshedCandidate = latestJob.candidates.find(
      (item) => (item.id ?? item.name) === candidateKey,
    );

    return (refreshedCandidate as ChatCandidate | undefined) ?? this.candidate;
  }

  private buildFormationHeading(formation: FormationCopyDraft | null): string {
    if (!formation) {
      return 'Curriculum profissional';
    }

    return formation.graduated
      ? `Formado em ${formation.endMonth} ${formation.endYear}`
      : 'Cursando';
  }

  private isSystemCandidate(candidate: ChatCandidate): boolean {
    if (candidate.source === 'system') {
      return true;
    }

    const basicDraft = this.readBasicDraft();
    return candidate.name === (basicDraft?.profile?.name?.trim() || '');
  }

  private readBasicDraft(): CandidateBasicDraft | null {
    const storage = this.getStorage();
    const rawDraft = storage?.getItem(CandidateProfileModalComponent.basicDraftStorageKey);

    if (!rawDraft) {
      return null;
    }

    try {
      return JSON.parse(rawDraft) as CandidateBasicDraft;
    } catch {
      storage?.removeItem(CandidateProfileModalComponent.basicDraftStorageKey);
      return null;
    }
  }

  private readFormationCopy(): FormationCopyDraft | null {
    const storage = this.getStorage();
    const rawDraft = storage?.getItem(CandidateProfileModalComponent.formationCopyStorageKey);

    if (!rawDraft) {
      return null;
    }

    try {
      return JSON.parse(rawDraft) as FormationCopyDraft;
    } catch {
      storage?.removeItem(CandidateProfileModalComponent.formationCopyStorageKey);
      return null;
    }
  }

  private readExperiences(): ExperienceEntry[] {
    const storage = this.getStorage();
    const rawDraft = storage?.getItem(CandidateProfileModalComponent.experiencesStorageKey);

    if (!rawDraft) {
      return [];
    }

    try {
      const draft = JSON.parse(rawDraft) as Array<Partial<ExperienceEntry>>;
      return Array.isArray(draft)
        ? draft
            .map((item) => this.normalizeExperience(item))
            .sort((left, right) => this.compareExperiencesByDateDesc(left, right))
        : [];
    } catch {
      storage?.removeItem(CandidateProfileModalComponent.experiencesStorageKey);
      return [];
    }
  }

  private normalizeExperience(item: Partial<ExperienceEntry>): ExperienceEntry {
    const role = item.role?.trim() || 'Cargo não informado';
    const companySegment = item.companySegment?.trim() || 'Tecnologia';

    return {
      id: item.id ?? crypto.randomUUID?.() ?? `exp-${Date.now()}`,
      company: item.company?.trim() || 'Empresa não informada',
      role,
      workModel: item.workModel ?? 'Remoto',
      startMonth: item.startMonth ?? 'Jan',
      startYear: item.startYear ?? '2024',
      endMonth: item.endMonth ?? 'Dez',
      endYear: item.endYear ?? '2025',
      currentlyWorkingHere: item.currentlyWorkingHere ?? false,
      responsibilities: item.responsibilities?.trim() || '',
      positionLevel: item.positionLevel ?? 'Pleno',
      companySize: item.companySize ?? 'Média',
      companySegment,
      sector: item.sector?.trim() || 'Produto',
      actuation: Math.max(0, Math.min(100, Math.round(item.actuation ?? 0))),
      appliedStacks: this.normalizeExperienceStacks(item.appliedStacks, role, companySegment),
    };
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }

    return window.localStorage;
  }

  private compareExperiencesByDateDesc(left: ExperienceEntry, right: ExperienceEntry): number {
    const endComparison = this.getExperienceSortValue(right) - this.getExperienceSortValue(left);
    if (endComparison !== 0) {
      return endComparison;
    }

    const startComparison = this.getExperienceStartSortValue(right) - this.getExperienceStartSortValue(left);
    if (startComparison !== 0) {
      return startComparison;
    }

    return left.company.localeCompare(right.company, 'pt-BR');
  }

  private getExperienceSortValue(experience: ExperienceEntry): number {
    if (experience.currentlyWorkingHere) {
      return 999912;
    }

    return this.composeSortValue(experience.endYear, experience.endMonth);
  }

  private getExperienceStartSortValue(experience: ExperienceEntry): number {
    return this.composeSortValue(experience.startYear, experience.startMonth);
  }

  private composeSortValue(year: string, month: string): number {
    const parsedYear = Number.parseInt(year, 10);
    const monthOrder = this.getMonthOrder(month);
    return (Number.isFinite(parsedYear) ? parsedYear : 0) * 100 + monthOrder;
  }

  private getMonthOrder(month: string): number {
    const normalizedMonth = month
      .trim()
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return CandidateProfileModalComponent.monthOrder.get(normalizedMonth) ?? 0;
  }

  private getDefaultExperienceIndex(): number | null {
    const experienceCount = this.modalData?.experiences.length ?? 0;
    return experienceCount > 0 ? 0 : null;
  }

  private normalizeExperienceStacks(
    appliedStacks: ExperienceEntry['appliedStacks'] | undefined,
    role: string,
    companySegment: string,
  ): ExperienceAppliedStack[] {
    if (!Array.isArray(appliedStacks) || !appliedStacks.length) {
      return this.buildDefaultExperienceStacks(role, companySegment);
    }

    return appliedStacks.map((item) => ({
      name: item.name?.trim() || 'Stack',
      knowledge: Math.max(0, Math.min(100, Math.round(item.knowledge ?? 70))),
      description: item.description?.trim() || '',
    }));
  }

  private buildDefaultExperienceStacks(role: string, companySegment: string): ExperienceAppliedStack[] {
    const normalizedRole = role.toLocaleLowerCase('pt-BR');
    const normalizedSegment = companySegment.toLocaleLowerCase('pt-BR');

    if (normalizedRole.includes('.net') || normalizedRole.includes('backend')) {
      return [
        { name: '.NET / C#', knowledge: 92, description: '' },
        { name: 'Entity Framework', knowledge: 65, description: '' },
        { name: 'REST API', knowledge: 75, description: '' },
        { name: 'SQL Server', knowledge: 70, description: '' },
        { name: 'Azure', knowledge: 40, description: '' },
      ];
    }

    if (normalizedRole.includes('lead') || normalizedRole.includes('tech lead')) {
      return [
        { name: 'Arquitetura', knowledge: 90, description: '' },
        { name: 'Liderança técnica', knowledge: 86, description: '' },
        { name: 'Code Review', knowledge: 79, description: '' },
        { name: 'DevOps', knowledge: 68, description: '' },
        { name: 'Observabilidade', knowledge: 61, description: '' },
      ];
    }

    if (normalizedRole.includes('full stack')) {
      return [
        { name: 'Angular / React', knowledge: 89, description: '' },
        { name: 'Node.js', knowledge: 78, description: '' },
        { name: 'APIs', knowledge: 82, description: '' },
        { name: 'Cloud', knowledge: 64, description: '' },
        { name: 'SQL / NoSQL', knowledge: 58, description: '' },
      ];
    }

    if (normalizedSegment.includes('banco') || normalizedSegment.includes('fintech')) {
      return [
        { name: 'Integrações', knowledge: 84, description: '' },
        { name: 'Segurança', knowledge: 76, description: '' },
        { name: 'Dados', knowledge: 73, description: '' },
        { name: 'Automação', knowledge: 67, description: '' },
        { name: 'Compliance', knowledge: 55, description: '' },
      ];
    }

    return [
      { name: 'Produto digital', knowledge: 80, description: '' },
      { name: 'Entrega contínua', knowledge: 74, description: '' },
      { name: 'Colaboração', knowledge: 70, description: '' },
      { name: 'Documentação', knowledge: 62, description: '' },
      { name: 'Qualidade', knowledge: 57, description: '' },
    ];
  }
}
