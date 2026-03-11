import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlcanceRadarComponent } from './alcance-radar/alcance-radar.component';
import { ContractType, JobBenefitItem, JobResponsibilitySection, MockJobDraft, MockJobRecord, SaveMockJobCommand, TechStackItem, VagaPanelDraft, WorkModel } from '../data/vagas.models';
import { VagasMockService } from '../data/vagas-mock.service';
import { MatStepperModule } from '@angular/material/stepper';

type RefinementItem = string;
type SummaryPageId = 'front' | 'back';
type SummaryView = 'status' | 'benefits' | 'details';
type ResponsibilitySection = JobResponsibilitySection;

type CompanySummaryProfile = {
  name: string;
  followers: string;
  description: string;
  linkedinCount: string;
  logoLabel: string;
  logoUrl?: string;
};

type CandidateStatusPreview = {
  label: string;
  completed: boolean;
  timeLabel: string;
};

type ContractDecision = 'accepted' | 'next' | null;

type ConfettiPiece = {
  left: number;
  top: number;
  offsetX: number;
  offsetY: number;
  color: string;
  delay: number;
  duration: number;
};

@Component({
  standalone: true,
  selector: 'app-cadastro-page',
  imports: [CommonModule, FormsModule, AlcanceRadarComponent, MatStepperModule],
  templateUrl: './cadastro.page.html',
  styleUrls: ['./cadastro.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadastroPage {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly vagasMockService = inject(VagasMockService);
  private summarySectionCounter = 3;
  private readonly brlNumberFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  private editingJobId: string | null = null;
  editingJobStatus: 'ativas' | 'rascunhos' | 'pausadas' | 'encerradas' = 'ativas';
  editingJobStatusReason = '';

  readonly configurationProgress = 60;
  readonly previewAderencia = 89;
  readonly previewAvatars = [
    '/assets/avatars/avatar-rafael.png',
    '/assets/avatars/avatar-rafael.png',
    '/assets/avatars/avatar-rafael.png',
  ];
  readonly previewAvatarExtraCount = 18;
  readonly recruiterPreview = {
    name: 'Rafael Souza',
    role: 'Talent Acquisition',
    avatar: '/assets/avatars/avatar-rafael.png',
  };
  readonly initialDocumentOptions = [
    'Copia do Certificado de conclusão',
    'Copia da Identidade e CPF',
    'Comprovante de Residencia',
  ];
  readonly initialSelectedBenefits: JobBenefitItem[] = [
    {
      title: 'Plano de Saúde',
      sideLabel: 'Cobre 50%',
      description: 'Sulamerica Seguros + Leito e Internação',
    },
    {
      title: 'Plano Odontológico',
      sideLabel: '100%',
      description: 'Cobertura nacional com reembolso e rede credenciada',
    },
    {
      title: 'Day Off Aniversário',
      sideLabel: 'Abonado',
      description: 'Folga remunerada no mês do aniversario',
    },
  ];
  readonly companyOptions = [
    'Banco Itaú',
    'Nubank',
    'Stone',
  ];
  readonly locationOptions = [
    'Rio de Janeiro - RJ',
    'São Paulo - SP',
    'Remoto - Brasil',
  ];
  readonly workModels: WorkModel[] = ['Remoto', 'Hibrido', 'Presencial'];
  readonly contractTypes: ContractType[] = ['CLT', 'PJ', 'Freelancer'];
  readonly editableJobStatuses: Array<{ value: 'ativas' | 'rascunhos' | 'pausadas' | 'encerradas'; label: string }> = [
    { value: 'ativas', label: 'Ativa' },
    { value: 'rascunhos', label: 'Rascunho' },
    { value: 'pausadas', label: 'Pausada' },
    { value: 'encerradas', label: 'Encerrada' },
  ];
  readonly initialTechStackItems: TechStackItem[] = [
    { name: '.NET / C#', match: 80 },
    { name: 'Entity Framework', match: 65 },
    { name: 'REST API', match: 75 },
    { name: 'SQL Server', match: 70 },
    { name: 'Azure', match: 40 },
  ];
  readonly refinementOptions: RefinementItem[] = [
    'Experiência com Azure ou Aws',
    'Trabalho em Equipe',
    'Teste Unitário e Integrado',
    'Viajar a Trabalho',
  ];

  constructor() {
    this.loadEditingJobIfPresent();
  }
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
  statusStageIndex = 0;
  contractDecision: ContractDecision = null;
  documentsSent = false;
  statusEmailUpdatesEnabled = true;
  statusDocumentsConsentAccepted = false;
  confettiPieces: ConfettiPiece[] = [];
  confettiActive = false;

  get candidateStatusPreview(): CandidateStatusPreview[] {
    const baseStatuses: CandidateStatusPreview[] = [
      { label: 'Talento no radar', timeLabel: 'Semana passada' },
      { label: 'Candidatura enviada', timeLabel: '5 dias atras' },
      { label: 'Em processo', timeLabel: 'Ontem' },
      { label: 'Contratação Solicitada', timeLabel: 'Há 20 min.' },
    ].map((item, index) => ({
      ...item,
      completed: index <= this.statusStageIndex,
    }));

    if (this.contractDecision === 'next') {
      return [
        ...baseStatuses,
        { label: 'Ficou para a proxima', completed: true, timeLabel: 'Há 20 min.' },
        { label: 'Encerrado', completed: true, timeLabel: 'Há 20 min.' },
      ];
    }

    if (this.contractDecision === 'accepted') {
      return [
        ...baseStatuses,
        { label: 'Proposta aceita', completed: true, timeLabel: 'Há 20 min.' },
        this.documentsSent
          ? { label: 'Documentos recebidos', completed: true, timeLabel: 'Há 5 min.' }
          : { label: 'Validando documentos', completed: false, timeLabel: 'Há 20 min.' },
        { label: 'Contratado', completed: this.documentsSent, timeLabel: 'Há 5 min.' },
      ];
    }

    return [
      ...baseStatuses,
      { label: 'Aceito / Ficou pra próxima', completed: false, timeLabel: 'Há 20 min.' },
      { label: 'Validando documentos', completed: false, timeLabel: 'Há 20 min.' },
      { label: 'Contratado', completed: false, timeLabel: 'Há 5 min.' },
    ];
  }

  get hasRequestedContractStatus(): boolean {
    return this.statusStageIndex >= 3 || this.contractDecision !== null || this.documentsSent;
  }

  get statusSelectedIndex(): number {
    const currentIndex = this.candidateStatusPreview.findIndex(item => item.label === this.statusCurrentLabel);
    return currentIndex >= 0 ? currentIndex : 0;
  }

  get showStatusDecisionActions(): boolean {
    return this.contractDecision === null && this.statusStageIndex >= 3;
  }

  get showStatusApplyAction(): boolean {
    return this.contractDecision === null && this.statusStageIndex === 0;
  }

  get showStatusAdvanceAction(): boolean {
    return this.contractDecision === null && this.statusStageIndex > 0 && this.statusStageIndex < 3;
  }

  get statusAdvanceLabel(): string {
    switch (this.statusStageIndex) {
      case 1:
        return 'Avançar para processo';
      case 2:
        return 'Solicitar contratação';
      default:
        return 'Avançar';
    }
  }

  get showSendDocumentsAction(): boolean {
    return this.contractDecision === 'accepted' && !this.documentsSent;
  }

  get showStatusDocumentsPreview(): boolean {
    return this.contractDecision === 'accepted' && !this.documentsSent;
  }

  get showRadarStatusMessage(): boolean {
    return this.contractDecision === 'next';
  }

  get showWelcomeStatusMessage(): boolean {
    return this.contractDecision === 'accepted' && this.documentsSent;
  }

  get statusCurrentLabel(): string {
    if (this.contractDecision === 'next') {
      return 'Ficou para a proxima';
    }

    if (this.contractDecision === 'accepted' && this.documentsSent) {
      return 'Contratado';
    }

    if (this.contractDecision === 'accepted') {
      return 'Proposta aceita';
    }

    return this.candidateStatusPreview[this.statusStageIndex]?.label ?? 'Talento no radar';
  }

  get statusCurrentTone(): string {
    switch (this.statusCurrentLabel) {
      case 'Aceito':
      case 'Contratado':
        return 'success';
      case 'Ficou para a proxima':
      case 'Encerrado':
        return 'muted';
      case 'Contratação Solicitada':
      case 'Validando documentos':
        return 'attention';
      default:
        return 'progress';
    }
  }

  get statusCurrentDescription(): string {
    switch (this.statusCurrentLabel) {
      case 'Talento no radar':
        return 'O sistema encontrou esse candidato no radar da vaga';
      case 'Candidatura enviada':
        return 'Candidatura recebida e aguardando triagem';
      case 'Em processo':
        return 'Analisando perfil dos candidatos';
      case 'Contratação Solicitada':
        return 'Etapa final aguardando resposta do candidato';
      case 'Proposta aceita':
        return 'Proposta aceita e pronta para seguir';
      case 'Ficou para a proxima':
        return 'Perfil mantido no radar para novas oportunidades';
      case 'Validando documentos':
        return 'Aguardando envio e validacao dos documentos';
      case 'Contratado':
        return 'Processo concluido com sucesso';
      case 'Encerrado':
        return 'Fluxo encerrado para esta oportunidade';
      default:
        return '';
    }
  }

  get statusInsightTitle(): string {
    if (this.showWelcomeStatusMessage) {
      return 'Parabens, vaga concluida com sucesso!';
    }

    if (this.showRadarStatusMessage) {
      return 'Perfil mantido no radar';
    }

    if (this.showSendDocumentsAction) {
      return 'Etapa final liberada';
    }

    return 'Parabens, vaga quase contratada!';
  }

  get statusInsightText(): string {
    if (this.showWelcomeStatusMessage) {
      return 'Acompanhamento finalizado e contratacao registrada em tempo real.';
    }

    if (this.showRadarStatusMessage) {
      return 'Mesmo sem seguir agora, o candidato permanece elegivel para novas vagas.';
    }

    if (this.showSendDocumentsAction) {
      return 'Envie os documentos para concluir a validacao e avancar a contratacao.';
    }

    return 'Acompanhe o andamento do funil e os proximos passos do candidato.';
  }

  get statusProgressPercentage(): number {
    const total = this.candidateStatusPreview.length;
    if (!total) {
      return 0;
    }

    const completed = this.candidateStatusPreview.filter(item => item.completed).length;
    return Math.round((completed / total) * 100);
  }

  onStatusStepSelectionChange(index: number): void {
    if (index < 0 || index > 3) {
      return;
    }

    this.statusStageIndex = index;
    this.contractDecision = null;
    this.documentsSent = false;
    this.statusDocumentsConsentAccepted = false;
  }

  selectAcceptedContractDecision(): void {
    this.statusStageIndex = 3;
    this.contractDecision = 'accepted';
    this.documentsSent = false;
    this.statusDocumentsConsentAccepted = false;
  }

  selectNextContractDecision(): void {
    this.statusStageIndex = 3;
    this.contractDecision = 'next';
    this.documentsSent = false;
    this.statusDocumentsConsentAccepted = false;
  }

  sendStatusDocuments(): void {
    this.documentsSent = true;
    this.triggerConfetti();
  }

  advanceStatusStage(): void {
    if (this.statusStageIndex >= 3) {
      return;
    }

    this.statusStageIndex += 1;
    this.contractDecision = null;
    this.documentsSent = false;
    this.statusDocumentsConsentAccepted = false;
  }

  private buildConfetti(): void {
    const colors = ['#f2b31a', '#f8c73c', '#ffd66b', '#3f9170', '#62b290', '#8ecfb4'];
    this.confettiPieces = Array.from({ length: 220 }, (): ConfettiPiece => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 28 + Math.random() * 36;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      return {
        left: 50,
        top: 48,
        offsetX: dx,
        offsetY: dy,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 900,
        duration: 4800 + Math.random() * 3200,
      };
    });
  }

  private triggerConfetti(): void {
    this.buildConfetti();
    this.confettiActive = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.confettiActive = false;
      this.cdr.markForCheck();
    }, 1600);
  }

  responsibilitySections: ResponsibilitySection[] = [
    {
      id: 'summary-section-1',
      pageId: 'front',
      title: 'Requisitos e habilidades que buscamos:',
      items: [
        'Graduação em Ciência da Computação, Tecnologia da Informação ou área relacionada;',
        'Experiência sólida em desenvolvimento com Frontend nas tecnologias Angular ou React;',
        'Experiência em desenvolvimento backend Java, Spring ou Quarkus, NodeJS, Express.js, Python Flask/Django;',
        'Desenvolvimento de APIs Rest: habilidade em criar e manter APIs Restful;',
        'Compreensão profunda dos conceitos e práticas de backend;',
        'Proficiência no uso de Git para controle de versões;',
        'Experiência na configuração e manutenção de pipelines de CI/CD utilizando Jenkins e Argo;',
        'Conhecimento em desenvolvimento de back-end utilizando arquitetura de microsserviços e tecnologias de cloud;',
        'Experiência em práticas DevOps, incluindo o uso de Kubernetes e Docker.;',
        'Habilidade em criar e executar testes de integração e unitários;',
        'Banco de Dados relacional com utilização de linguagem SQL;',
        'HTML5, CSS3, Angular ou React.js, TypeScript, next.js, Javascript, Java, SQL, Spring ou Quarkus. Ferramentas de versionamento de código.',
      ],
    },
    {
      id: 'summary-section-2',
      pageId: 'front',
      title: 'Desejável:',
      items: [
        'Pós-graduação em tecnologia ou gestão;',
        'Experiencia com Java com Quarkus.',
      ],
    },
  ];
  readonly initialSelectedRefinementOptions: RefinementItem[] = [...this.refinementOptions];

  readonly jobDraft: VagaPanelDraft = {
    title: 'Backend .NET Sênior',
    company: 'Banco Itaú',
    location: 'Rio de Janeiro - RJ',
    workModel: 'Remoto',
    seniority: 'Senior',
    summary:
      'Profissional para evoluir APIs, sustentar arquitetura distribuida e acelerar entregas criticas junto ao time de produtos e plataforma.',
  };
  contractType: ContractType = 'CLT';
  contractSummary = '';
  salaryRange = '';
  allowCandidateSalarySuggestion = true;
  showSalaryRangeInCard = true;
  selectedBenefits = this.initialSelectedBenefits.map((item) => ({ ...item }));
  selectedRefinementOptions = [...this.initialSelectedRefinementOptions];
  followingCompanies: Record<string, boolean> = {
    'Banco Itaú': true,
    Nubank: false,
    Stone: false,
  };
  activeSummaryView: SummaryView = 'details';
  activeFrontResponsibilityIndex = 0;
  editingSummaryDescriptionPageId: SummaryPageId | null = null;
  isBenefitModalOpen = false;
  editingBenefitIndex: number | null = null;
  isDocumentModalOpen = false;
  editingDocumentIndex: number | null = null;
  isTechStackModalOpen = false;
  editingTechStackIndex: number | null = null;
  isResponsibilityModalOpen = false;
  isJobActionsModalOpen = false;
  editingResponsibilitySectionId: string | null = null;
  jobActionsStatusDraft: 'ativas' | 'rascunhos' | 'pausadas' | 'encerradas' = 'ativas';
  jobActionsStatusReasonDraft = '';
  responsibilityDraftPageId: SummaryPageId = 'front';
  benefitDraftTitle = '';
  benefitDraftSideLabel = '';
  benefitDraftDescription = '';
  documentDraftLabel = '';
  techStackDraftName = '';
  techStackDraftMatch = '60';
  jobSummaryDraft = '';
  responsibilityDraftTitle = '';
  responsibilityDraftItem = '';
  responsibilityDraftItems: string[] = [];
  selectedDocuments = [...this.initialDocumentOptions];
  selectedTechStackItems = this.initialTechStackItems.map((item) => ({ ...item }));

  get previewContractType(): ContractType {
    return this.contractType;
  }

  get isEditingJob(): boolean {
    return this.editingJobId !== null;
  }

  get editingJobStatusLabel(): string {
    return this.editableJobStatuses.find((item) => item.value === this.editingJobStatus)?.label ?? 'Ativa';
  }

  get previewCardOfferLine(): string {
    const segments: string[] = [this.previewContractType];

    if (this.showSalaryRangeInCard && this.hasSalaryRangeValue) {
      segments.push(this.contractSalaryDisplay);
    }

    const hasBenefits = this.selectedBenefits.length > 0;
    let line = segments.join(' - ');

    if (hasBenefits) {
      line = `${line} + Beneficios`;
    }

    return line;
  }

  get activeSummaryPageId(): SummaryPageId {
    return this.activeSummaryView === 'benefits' ? 'back' : 'front';
  }

  get canAddSummarySection(): boolean {
    return this.activeSummaryView !== 'status';
  }

  get frontResponsibilitySections(): ResponsibilitySection[] {
    return this.responsibilitySections.filter((section) => section.pageId === 'front');
  }

  get currentFrontResponsibilitySection(): ResponsibilitySection | null {
    const sections = this.frontResponsibilitySections;
    if (!sections.length) {
      return null;
    }

    return sections[Math.min(this.activeFrontResponsibilityIndex, sections.length - 1)] ?? null;
  }

  get frontResponsibilityPageNumber(): number {
    const count = this.frontResponsibilitySections.length;
    if (!count) {
      return 0;
    }

    return Math.min(this.activeFrontResponsibilityIndex, count - 1) + 1;
  }

  get canGoToPreviousFrontResponsibilitySection(): boolean {
    return this.frontResponsibilitySections.length > 1 && this.frontResponsibilityPageNumber > 1;
  }

  get canGoToNextFrontResponsibilitySection(): boolean {
    return this.frontResponsibilitySections.length > 1 && this.frontResponsibilityPageNumber < this.frontResponsibilitySections.length;
  }

  get backResponsibilitySections(): ResponsibilitySection[] {
    return this.responsibilitySections.filter((section) => section.pageId === 'back');
  }

  get isJobSummaryModalOpen(): boolean {
    return this.editingSummaryDescriptionPageId !== null;
  }

  get canSaveBenefit(): boolean {
    return this.benefitDraftTitle.trim().length > 0;
  }

  get benefitModalTitle(): string {
    return this.editingBenefitIndex === null ? 'Adicionar benefício' : 'Editar benefício';
  }

  get benefitModalSubmitLabel(): string {
    return this.editingBenefitIndex === null ? 'Adicionar benefício' : 'Salvar benefício';
  }

  get canSaveDocument(): boolean {
    return this.documentDraftLabel.trim().length > 0;
  }

  get documentModalTitle(): string {
    return this.editingDocumentIndex === null ? 'Adicionar documento' : 'Editar documento';
  }

  get documentModalSubmitLabel(): string {
    return this.editingDocumentIndex === null ? 'Adicionar documento' : 'Salvar documento';
  }

  get canSaveTechStack(): boolean {
    return this.techStackDraftName.trim().length > 0;
  }

  get techStackModalTitle(): string {
    return this.editingTechStackIndex === null ? 'Adicionar habilidade' : 'Editar habilidade';
  }

  get techStackModalSubmitLabel(): string {
    return this.editingTechStackIndex === null ? 'Adicionar habilidade' : 'Salvar habilidade';
  }

  get summaryPanelDescription(): string {
    const value = this.jobDraft.summary?.trim();
    return value || 'Nao ha descricao';
  }

  get contractPanelDescription(): string {
    const value = this.contractSummary.trim();
    return value || 'Nao ha descricao';
  }

  get hasSalaryRangeValue(): boolean {
    return this.salaryRange.trim().length > 0;
  }

  get contractSalaryDisplay(): string {
    const value = this.salaryRange.trim();
    if (!value) {
      return 'Não informado';
    }

    return value.startsWith('R$') ? value : `R$ ${value}`;
  }

  get candidateSalarySuggestionDisplay(): string {
    return this.allowCandidateSalarySuggestion
      ? 'Candidato pode sugerir um valor'
      : 'Candidato nao pode sugerir valor';
  }

  get summaryDescriptionModalTitle(): string {
    return this.editingSummaryDescriptionPageId === 'back' ? 'Editar contratacao' : 'Editar resumo da vaga';
  }

  get summaryDescriptionModalLabel(): string {
    return this.editingSummaryDescriptionPageId === 'back' ? 'Sobre a contratacao' : 'Sobre a vaga';
  }

  get summaryDescriptionModalPlaceholder(): string {
    return this.editingSummaryDescriptionPageId === 'back'
      ? 'Descreva as condicoes e combinados da contratacao'
      : 'Descreva a vaga para o candidato';
  }

  get currentCompanyProfile(): CompanySummaryProfile {
    return this.companyProfiles[this.jobDraft.company] ?? {
      name: this.jobDraft.company,
      followers: '120.000 seguidores',
      description: 'Empresa em crescimento',
      linkedinCount: '120.000 no LinkedIn',
      logoLabel: this.jobDraft.company.slice(0, 2).toLowerCase(),
    };
  }

  get isFollowingCurrentCompany(): boolean {
    return this.followingCompanies[this.currentCompanyProfile.name] ?? false;
  }

  onSalaryRangeBeforeInput(event: InputEvent): void {
    if (
      event.inputType.startsWith('delete') ||
      event.inputType === 'historyUndo' ||
      event.inputType === 'historyRedo'
    ) {
      return;
    }

    const data = event.data ?? '';
    if (!data || /^\d+$/.test(data)) {
      return;
    }

    event.preventDefault();
  }

  onSalaryRangeChange(value: string): void {
    this.salaryRange = this.formatSalaryRange(value);
  }

  openBenefitModal(): void {
    this.editingBenefitIndex = null;
    this.benefitDraftTitle = '';
    this.benefitDraftSideLabel = '';
    this.benefitDraftDescription = '';
    this.isBenefitModalOpen = true;
  }

  editBenefit(index: number): void {
    const benefit = this.selectedBenefits[index];
    if (!benefit) {
      return;
    }

    this.editingBenefitIndex = index;
    this.benefitDraftTitle = benefit.title;
    this.benefitDraftSideLabel = benefit.sideLabel ?? '';
    this.benefitDraftDescription = benefit.description ?? '';
    this.isBenefitModalOpen = true;
  }

  closeBenefitModal(): void {
    this.isBenefitModalOpen = false;
    this.editingBenefitIndex = null;
    this.benefitDraftTitle = '';
    this.benefitDraftSideLabel = '';
    this.benefitDraftDescription = '';
  }

  saveBenefit(): void {
    const title = this.benefitDraftTitle.trim();
    if (!title) {
      return;
    }

    const benefit: JobBenefitItem = {
      title,
      sideLabel: this.benefitDraftSideLabel.trim() || undefined,
      description: this.benefitDraftDescription.trim() || undefined,
    };

    if (this.editingBenefitIndex !== null) {
      this.selectedBenefits = this.selectedBenefits.map((item, itemIndex) =>
        itemIndex === this.editingBenefitIndex ? benefit : item,
      );
      this.closeBenefitModal();
      return;
    }

    this.selectedBenefits = [
      ...this.selectedBenefits,
      benefit,
    ];

    this.closeBenefitModal();
  }

  deleteBenefit(): void {
    if (this.editingBenefitIndex === null) {
      return;
    }

    this.selectedBenefits = this.selectedBenefits.filter((_, itemIndex) => itemIndex !== this.editingBenefitIndex);
    this.closeBenefitModal();
  }

  openDocumentModal(): void {
    this.editingDocumentIndex = null;
    this.documentDraftLabel = '';
    this.isDocumentModalOpen = true;
  }

  editDocument(index: number): void {
    const document = this.selectedDocuments[index];
    if (!document) {
      return;
    }

    this.editingDocumentIndex = index;
    this.documentDraftLabel = document;
    this.isDocumentModalOpen = true;
  }

  closeDocumentModal(): void {
    this.isDocumentModalOpen = false;
    this.editingDocumentIndex = null;
    this.documentDraftLabel = '';
  }

  saveDocument(): void {
    const label = this.documentDraftLabel.trim();
    if (!label) {
      return;
    }

    if (this.editingDocumentIndex !== null) {
      this.selectedDocuments = this.selectedDocuments.map((item, itemIndex) =>
        itemIndex === this.editingDocumentIndex ? label : item,
      );
      this.closeDocumentModal();
      return;
    }

    this.selectedDocuments = [...this.selectedDocuments, label];
    this.closeDocumentModal();
  }

  deleteDocument(): void {
    if (this.editingDocumentIndex === null) {
      return;
    }

    this.selectedDocuments = this.selectedDocuments.filter((_, itemIndex) => itemIndex !== this.editingDocumentIndex);
    this.closeDocumentModal();
  }

  openTechStackModal(): void {
    this.editingTechStackIndex = null;
    this.techStackDraftName = '';
    this.techStackDraftMatch = '60';
    this.isTechStackModalOpen = true;
  }

  editTechStack(index: number): void {
    const item = this.selectedTechStackItems[index];
    if (!item) {
      return;
    }

    this.editingTechStackIndex = index;
    this.techStackDraftName = item.name;
    this.techStackDraftMatch = String(item.match);
    this.isTechStackModalOpen = true;
  }

  closeTechStackModal(): void {
    this.isTechStackModalOpen = false;
    this.editingTechStackIndex = null;
    this.techStackDraftName = '';
    this.techStackDraftMatch = '60';
  }

  saveTechStack(): void {
    const name = this.techStackDraftName.trim();
    if (!name) {
      return;
    }

    const match = Number.parseInt(this.techStackDraftMatch, 10);
    const normalizedMatch = Number.isNaN(match) ? 0 : Math.max(0, Math.min(100, match));

    const techStackItem: TechStackItem = {
      name,
      match: normalizedMatch,
    };

    if (this.editingTechStackIndex !== null) {
      this.selectedTechStackItems = this.selectedTechStackItems.map((item, itemIndex) =>
        itemIndex === this.editingTechStackIndex ? techStackItem : item,
      );
      this.closeTechStackModal();
      return;
    }

    this.selectedTechStackItems = [...this.selectedTechStackItems, techStackItem];

    this.closeTechStackModal();
  }

  deleteTechStack(): void {
    if (this.editingTechStackIndex === null) {
      return;
    }

    this.selectedTechStackItems = this.selectedTechStackItems.filter((_, itemIndex) => itemIndex !== this.editingTechStackIndex);
    this.closeTechStackModal();
  }

  toggleRefinementOption(item: RefinementItem): void {
    if (this.selectedRefinementOptions.includes(item)) {
      this.selectedRefinementOptions = this.selectedRefinementOptions.filter((option) => option !== item);
      return;
    }

    this.selectedRefinementOptions = [...this.selectedRefinementOptions, item];
  }

  toggleCompanyFollow(): void {
    const companyName = this.currentCompanyProfile.name;
    this.followingCompanies = {
      ...this.followingCompanies,
      [companyName]: !this.isFollowingCurrentCompany,
    };
  }

  selectSummaryView(view: SummaryView): void {
    this.activeSummaryView = view;
  }

  showPreviousFrontResponsibilitySection(): void {
    if (!this.canGoToPreviousFrontResponsibilitySection) {
      return;
    }

    this.activeFrontResponsibilityIndex -= 1;
  }

  showNextFrontResponsibilitySection(): void {
    if (!this.canGoToNextFrontResponsibilitySection) {
      return;
    }

    this.activeFrontResponsibilityIndex += 1;
  }

  openJobSummaryModal(pageId: SummaryPageId): void {
    this.editingSummaryDescriptionPageId = pageId;
    this.jobSummaryDraft = pageId === 'back' ? this.contractSummary.trim() : this.jobDraft.summary?.trim() ?? '';
  }

  closeJobSummaryModal(): void {
    this.editingSummaryDescriptionPageId = null;
    this.jobSummaryDraft = '';
  }

  saveJobSummary(): void {
    if (this.editingSummaryDescriptionPageId === 'back') {
      this.contractSummary = this.jobSummaryDraft.trim();
    } else {
      this.jobDraft.summary = this.jobSummaryDraft.trim();
    }
    this.closeJobSummaryModal();
  }

  openResponsibilityModal(): void {
    this.editingResponsibilitySectionId = null;
    this.responsibilityDraftPageId = this.activeSummaryPageId;
    this.isResponsibilityModalOpen = true;
  }

  closeResponsibilityModal(): void {
    this.isResponsibilityModalOpen = false;
    this.editingResponsibilitySectionId = null;
    this.responsibilityDraftPageId = this.activeSummaryPageId;
    this.responsibilityDraftTitle = '';
    this.responsibilityDraftItem = '';
    this.responsibilityDraftItems = [];
  }

  editResponsibilitySection(sectionId: string): void {
    const section = this.responsibilitySections.find((item) => item.id === sectionId);
    if (!section) {
      return;
    }

    this.editingResponsibilitySectionId = section.id;
    this.responsibilityDraftPageId = section.pageId;
    this.responsibilityDraftTitle = section.title;
    this.responsibilityDraftItem = '';
    this.responsibilityDraftItems = [...section.items];
    this.isResponsibilityModalOpen = true;
  }

  addResponsibilityDraftItem(): void {
    const value = this.responsibilityDraftItem.trim();
    if (!value) {
      return;
    }

    this.responsibilityDraftItems = [...this.responsibilityDraftItems, value];
    this.responsibilityDraftItem = '';
  }

  removeResponsibilityDraftItem(index: number): void {
    this.responsibilityDraftItems = this.responsibilityDraftItems.filter((_, itemIndex) => itemIndex !== index);
  }

  deleteResponsibilitySection(): void {
    if (this.editingResponsibilitySectionId === null) {
      return;
    }

    const sectionToDelete = this.responsibilitySections.find(
      (section) => section.id === this.editingResponsibilitySectionId,
    );
    const deletedFrontIndex = sectionToDelete?.pageId === 'front'
      ? this.frontResponsibilitySections.findIndex((section) => section.id === sectionToDelete.id)
      : -1;

    this.responsibilitySections = this.responsibilitySections.filter(
      (section) => section.id !== this.editingResponsibilitySectionId,
    );

    if (deletedFrontIndex >= 0) {
      if (this.activeFrontResponsibilityIndex >= deletedFrontIndex && this.activeFrontResponsibilityIndex > 0) {
        this.activeFrontResponsibilityIndex -= 1;
      }
      this.normalizeFrontResponsibilityIndex();
    }

    this.closeResponsibilityModal();
  }

  saveResponsibilitySection(): void {
    const title = this.responsibilityDraftTitle.trim();
    if (!title || !this.responsibilityDraftItems.length) {
      return;
    }

    if (this.editingResponsibilitySectionId !== null) {
      this.responsibilitySections = this.responsibilitySections.map((section) =>
        section.id === this.editingResponsibilitySectionId
          ? {
              ...section,
              title,
              items: [...this.responsibilityDraftItems],
            }
          : section,
      );
      this.closeResponsibilityModal();
      return;
    }

    this.responsibilitySections = [
      ...this.responsibilitySections,
      {
        id: this.createSummarySectionId(),
        pageId: this.responsibilityDraftPageId,
        title,
        items: [...this.responsibilityDraftItems],
      },
    ];

    if (this.responsibilityDraftPageId === 'front') {
      this.activeFrontResponsibilityIndex = this.frontResponsibilitySections.length - 1;
    }

    this.closeResponsibilityModal();
  }

  get canSaveResponsibilitySection(): boolean {
    return !!this.responsibilityDraftTitle.trim() && this.responsibilityDraftItems.length > 0;
  }

  get responsibilityModalTitle(): string {
    return this.editingResponsibilitySectionId === null ? 'Novo bloco' : 'Editar bloco';
  }

  get responsibilityModalSubmitLabel(): string {
    return this.editingResponsibilitySectionId === null ? 'Salvar bloco' : 'Salvar alterações';
  }

  private normalizeFrontResponsibilityIndex(): void {
    if (!this.frontResponsibilitySections.length) {
      this.activeFrontResponsibilityIndex = 0;
      return;
    }

    this.activeFrontResponsibilityIndex = Math.min(
      this.activeFrontResponsibilityIndex,
      this.frontResponsibilitySections.length - 1,
    );
  }

  saveAsDraft(): void {
    const savedJob = this.persistJob('rascunhos');

    void this.router.navigate(['/vagas'], {
      queryParams: { tab: 'rascunhos', created: savedJob.id },
    });
  }

  publishJob(): void {
    const savedJob = this.persistJob(this.isEditingJob ? this.editingJobStatus : 'ativas');

    void this.router.navigate(['/vagas'], {
      queryParams: { tab: savedJob.status, created: savedJob.id },
    });
  }

  openJobActionsModal(): void {
    if (!this.isEditingJob) {
      return;
    }

    this.jobActionsStatusDraft = this.editingJobStatus;
    this.jobActionsStatusReasonDraft = this.editingJobStatusReason;
    this.isJobActionsModalOpen = true;
  }

  closeJobActionsModal(): void {
    this.isJobActionsModalOpen = false;
  }

  selectEditingJobStatus(status: 'ativas' | 'rascunhos' | 'pausadas' | 'encerradas'): void {
    this.jobActionsStatusDraft = status;
  }

  saveEditedJobStatus(): void {
    if (!this.editingJobId) {
      return;
    }

    this.editingJobStatus = this.jobActionsStatusDraft;
    this.editingJobStatusReason = this.jobActionsStatusReasonDraft.trim();

    const savedJob = this.persistJob(this.editingJobStatus);
    this.closeJobActionsModal();

    void this.router.navigate(['/vagas'], {
      queryParams: { tab: savedJob.status, updated: savedJob.id },
    });
  }

  deleteEditingJob(): void {
    if (!this.editingJobId) {
      return;
    }

    const confirmed = window.confirm('Deseja realmente excluir esta vaga?');
    if (!confirmed) {
      return;
    }

    const currentStatus = this.editingJobStatus;
    this.vagasMockService.deleteJob(this.editingJobId);
    this.closeJobActionsModal();

    void this.router.navigate(['/vagas'], {
      queryParams: { tab: currentStatus },
    });
  }

  private persistJob(status: 'ativas' | 'rascunhos' | 'pausadas' | 'encerradas') {
    const command = {
      draft: this.buildDraftPayload(),
      status,
      previewAderencia: this.previewAderencia,
      previewAvatars: this.previewAvatars,
      previewAvatarExtraCount: this.previewAvatarExtraCount,
    } satisfies SaveMockJobCommand;

    if (!this.editingJobId) {
      return this.vagasMockService.saveJob(command);
    }

    this.editingJobStatus = status;
    return this.vagasMockService.updateJob(this.editingJobId, command);
  }

  private loadEditingJobIfPresent(): void {
    const editingId = this.route.snapshot.queryParamMap.get('edit');
    if (!editingId) {
      return;
    }

    const job = this.vagasMockService.getJobById(editingId);
    if (!job) {
      return;
    }

    this.hydrateFromJob(job);
  }

  private hydrateFromJob(job: MockJobRecord): void {
    this.editingJobId = job.id;
    this.editingJobStatus = job.status;
    this.editingJobStatusReason = job.statusReason?.trim() || '';

    Object.assign(this.jobDraft, {
      title: job.title,
      company: job.company,
      location: job.location,
      workModel: job.workModel,
      seniority: job.seniority,
      summary: job.summary,
    });

    this.contractType = job.contractType;
    this.salaryRange = job.salaryRange ?? '';
    this.showSalaryRangeInCard = job.showSalaryRangeInCard ?? true;
    this.allowCandidateSalarySuggestion = job.allowCandidateSalarySuggestion ?? true;
    this.selectedBenefits = job.benefits.map((item) => ({ ...item }));
    this.selectedTechStackItems = job.techStack.map((item) => ({ ...item }));
    this.selectedRefinementOptions = [...job.differentials];
    this.responsibilitySections = job.responsibilitySections.map((section) => ({
      ...section,
      items: [...section.items],
    }));
  }

  private buildDraftPayload(): MockJobDraft {
    return {
      ...this.jobDraft,
      contractType: this.contractType,
      statusReason: this.editingJobStatusReason.trim() || undefined,
      salaryRange: this.salaryRange.trim(),
      showSalaryRangeInCard: this.showSalaryRangeInCard,
      allowCandidateSalarySuggestion: this.allowCandidateSalarySuggestion,
      benefits: this.selectedBenefits.map((item) => ({ ...item })),
      techStack: this.selectedTechStackItems.map((item) => ({ ...item })),
      differentials: [...this.selectedRefinementOptions],
      responsibilitySections: this.responsibilitySections.map((section) => ({
        ...section,
        items: [...section.items],
      })),
    };
  }

  private formatSalaryRange(value: string): string {
    const digits = value.replace(/\D/g, '');

    if (!digits) {
      return '';
    }

    const amount = Number.parseInt(digits, 10) / 100;
    return this.brlNumberFormatter.format(amount);
  }

  private createSummarySectionId(): string {
    const nextId = this.summarySectionCounter;
    this.summarySectionCounter += 1;
    return `summary-section-${nextId}`;
  }
}
