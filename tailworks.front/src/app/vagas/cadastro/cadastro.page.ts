import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ContractType, JobBenefitItem, JobResponsibilitySection, MockJobCandidate, MockJobDraft, MockJobRecord, SaveMockJobCommand, TechStackItem, VagaPanelDraft, WorkModel } from '../data/vagas.models';
import { VagasMockService } from '../data/vagas-mock.service';
import { Subscription } from 'rxjs';
import { RecruiterDirectoryService } from '../../recruiter/recruiter-directory.service';
import { EmpresaDirectoryService } from '../../empresa/empresa-directory.service';

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
  monthlyHiringCount?: number;
};

type CandidateStatusPreview = {
  label: string;
  completed: boolean;
  active: boolean;
  timeLabel?: string;
  description: string;
  ownerText: string;
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
  imports: [CommonModule, FormsModule],
  templateUrl: './cadastro.page.html',
  styleUrls: ['./cadastro.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadastroPage implements OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly vagasMockService = inject(VagasMockService);
  private readonly recruiterDirectoryService = inject(RecruiterDirectoryService);
  private readonly companyDirectoryService = inject(EmpresaDirectoryService);
  private readonly subscriptions = new Subscription();
  private summaryPanelDragState: {
    pointerId: number;
    startY: number;
    startScrollTop: number;
    dragging: boolean;
    element: HTMLElement;
  } | null = null;
  private summarySectionCounter = 3;
  private readonly brlNumberFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  private editingJobId: string | null = null;
  editingJobStatus: 'ativas' | 'rascunhos' | 'pausadas' | 'encerradas' = 'ativas';
  editingJobStatusReason = '';

  readonly previewAderencia = 89;
  readonly previewAvatars = [
    '/assets/avatars/avatar-default.svg',
    '/assets/avatars/avatar-default.svg',
    '/assets/avatars/avatar-default.svg',
  ];
  readonly previewAvatarExtraCount = 18;
  readonly recruiterPreview = {
    name: 'Julio Fazenda',
    role: 'Talent Acquisition',
    avatar: '/assets/avatars/avatar-default.svg',
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
  readonly locationOptions = [
    'Rio de Janeiro - RJ',
    'São Paulo - SP',
    'Remoto - Brasil',
  ];
  readonly companyLogoGuide = '512 x 512 px';
  readonly homeAnnouncementImageGuide = '1200 x 675 px';
  readonly acceptedCompanyLogoMimeTypes = ['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/gif', 'image/webp'];
  readonly maxCompanyLogoSizeBytes = 5 * 1024 * 1024;
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
    this.ensureCurrentRecruiterCompanyInDraft();
    this.loadEditingJobIfPresent();
    this.subscriptions.add(
      this.vagasMockService.jobsChanged$.subscribe(() => {
        if (!this.editingJobId) {
          this.cdr.markForCheck();
          return;
        }

        const job = this.vagasMockService.getJobById(this.editingJobId);
        if (!job) {
          return;
        }

        this.hydrateStatusFromJob(job);
        this.cdr.markForCheck();
      }),
    );
  }

  get companyOptions(): string[] {
    return Array.from(new Set([
      ...this.recruiterDirectoryService.getRecruiterCompanies(),
      this.jobDraft.company.trim(),
    ].filter(Boolean)));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
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
    'NTT DATA Latan': {
      name: 'NTT DATA Latan',
      followers: '412.000 seguidores',
      description: 'Consultoria, tecnologia e transformação digital',
      linkedinCount: '412.000 no LinkedIn',
      logoLabel: 'nt',
      monthlyHiringCount: 15,
    },
    'BRQ Solutions TI': {
      name: 'BRQ Solutions TI',
      followers: '286.000 seguidores',
      description: 'Tecnologia, produtos digitais e serviços corporativos',
      linkedinCount: '286.000 no LinkedIn',
      logoLabel: 'br',
      monthlyHiringCount: 15,
    },
  };
  statusStageIndex = 0;
  expandedStatusPreviewIndex = 0;
  summaryPanelOpen = true;
  contractDecision: ContractDecision = null;
  documentsSubmittedByTalent = false;
  documentsSent = false;
  submittedHiringDocuments: string[] = [];
  talentDocumentsConsentAccepted = false;
  statusDocumentsConsentAccepted = false;
  confettiPieces: ConfettiPiece[] = [];
  confettiActive = false;

  get candidateStatusPreview(): CandidateStatusPreview[] {
    const activeIndex = this.currentStatusPreviewIndex;
    const statuses: Array<Pick<CandidateStatusPreview, 'label' | 'timeLabel' | 'description' | 'ownerText'>> = [
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
        label:
          this.contractDecision === 'accepted'
            ? 'Aceito'
            : this.contractDecision === 'next'
              ? 'Ficou pra próxima'
              : 'Aceito / Ficou pra próxima',
        timeLabel: 'Em atualização',
        description:
          this.contractDecision === 'accepted'
            ? 'O talento aceitou a proposta e agora pode enviar os documentos da contratação.'
            : this.contractDecision === 'next'
              ? 'O talento preferiu não seguir nesta vaga agora, mas pode continuar elegível para próximas oportunidades.'
              : 'Aqui o talento responde se aceita a proposta ou se prefere ficar para uma próxima oportunidade.',
        ownerText: 'Ação do talento',
      },
      {
        label: 'Validando documentos',
        timeLabel: 'Em atualização',
        description: 'Os documentos enviados pelo talento estão em revisão final para conclusão da contratação.',
        ownerText: 'Ação do recruiter',
      },
      {
        label:
          this.contractDecision === 'next'
            ? 'Não foi desta vez (ou Continua no Radar)'
            : this.documentsSent
              ? 'Contratado'
              : 'Contratado / Não foi desta vez (ou Continua no Radar)',
        timeLabel: 'Em atualização',
        description:
          this.contractDecision === 'next'
            ? 'Esse ciclo foi encerrado para esta vaga e o talento pode continuar elegível para novas oportunidades.'
            : this.documentsSent
              ? 'Contratação concluída e fluxo encerrado com sucesso.'
              : 'Ao final da validação, você encerra o ciclo contratando o talento ou mantendo o perfil elegível para futuras vagas.',
        ownerText: 'Ação do recruiter',
      },
    ];

    return statuses.map((item, index) => ({
      ...item,
      completed: this.isStatusPreviewStepCompleted(index),
      active: index === activeIndex,
      timeLabel: this.isStatusPreviewStepCompleted(index) ? item.timeLabel : undefined,
    }));
  }

  get currentStatusPreviewIndex(): number {
    if (this.contractDecision === 'next') {
      return 6;
    }

    if (this.contractDecision === 'accepted' && this.documentsSent) {
      return 6;
    }

    if (this.contractDecision === 'accepted' && this.documentsSubmittedByTalent) {
      return 5;
    }

    if (this.contractDecision === 'accepted') {
      return 4;
    }

    return Math.min(this.statusStageIndex, 3);
  }

  get hasRequestedContractStatus(): boolean {
    return this.statusStageIndex >= 3 || this.contractDecision !== null || this.documentsSubmittedByTalent || this.documentsSent;
  }

  get statusSelectedIndex(): number {
    return this.currentStatusPreviewIndex;
  }

  get showAwaitingTalentDecisionMessage(): boolean {
    return this.contractDecision === null && this.statusStageIndex >= 3;
  }

  get showStatusCancelJobAction(): boolean {
    return this.isEditingJob
      && this.editingJobStatus !== 'encerradas'
      && this.contractDecision === null
      && this.statusStageIndex === 0;
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

  get showValidateDocumentsAction(): boolean {
    return this.contractDecision === 'accepted' && this.documentsSubmittedByTalent && !this.documentsSent;
  }

  get showStatusDocumentsPreview(): boolean {
    return this.contractDecision === 'accepted';
  }

  get showRadarStatusMessage(): boolean {
    return this.contractDecision === 'next';
  }

  get showWelcomeStatusMessage(): boolean {
    return this.contractDecision === 'accepted' && this.documentsSent;
  }

  get statusCandidateGuidance(): string {
    if (this.showWelcomeStatusMessage) {
      return 'A jornada deste talento foi concluída. Para acompanhar detalhes individuais, use o chat do candidato.';
    }

    if (this.showValidateDocumentsAction || this.isAwaitingTalentDocuments) {
      return 'Documentos e validação agora são tratados no modal do candidato, dentro do chat da vaga.';
    }

    if (this.showAwaitingTalentDecisionMessage) {
      return 'A resposta do talento deve ser acompanhada no chat do candidato, onde a jornada fica sincronizada em tempo real.';
    }

    if (this.statusStageIndex > 0 || this.contractDecision !== null) {
      return 'A movimentação do talento acontece no chat do candidato. Este painel da vaga fica como leitura de contexto.';
    }

    return 'Quando um talento interagir com a vaga, acompanhe a jornada individual dele pelo chat do candidato.';
  }

  get isAwaitingTalentDocuments(): boolean {
    return this.contractDecision === 'accepted' && !this.documentsSubmittedByTalent && !this.documentsSent;
  }

  get statusCurrentLabel(): string {
    return this.candidateStatusPreview[this.currentStatusPreviewIndex]?.label ?? 'Talento no radar';
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
    return this.candidateStatusPreview[this.currentStatusPreviewIndex]?.description ?? '';
  }

  private isStatusPreviewStepCompleted(index: number): boolean {
    if (this.contractDecision === 'next') {
      return index <= 4 || index === 6;
    }

    if (this.contractDecision === 'accepted' && this.documentsSent) {
      return index <= 6;
    }

    if (this.contractDecision === 'accepted' && this.documentsSubmittedByTalent) {
      return index <= 5;
    }

    if (this.contractDecision === 'accepted') {
      return index <= 4;
    }

    return index <= Math.min(this.statusStageIndex, 3);
  }

  get statusInsightTitle(): string {
    if (this.showWelcomeStatusMessage) {
      return 'Parabens, vaga concluida com sucesso!';
    }

    if (this.showValidateDocumentsAction) {
      return 'Documentos recebidos';
    }

    if (this.isAwaitingTalentDocuments) {
      return 'Aguardando documentos';
    }

    if (this.showRadarStatusMessage) {
      return 'Perfil mantido no radar';
    }

    return 'Parabens, vaga quase contratada!';
  }

  get statusInsightText(): string {
    if (this.showWelcomeStatusMessage) {
      return 'Acompanhamento finalizado e contratacao registrada em tempo real.';
    }

    if (this.showValidateDocumentsAction) {
      return 'Revise os documentos marcados pelo talento e conclua a validação para finalizar a contratação.';
    }

    if (this.isAwaitingTalentDocuments) {
      return 'O talento ainda precisa marcar os documentos exigidos e aceitar a LGPD para seguir.';
    }

    if (this.showRadarStatusMessage) {
      return 'Mesmo sem seguir agora, o candidato permanece elegivel para novas vagas.';
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
    this.documentsSubmittedByTalent = false;
    this.documentsSent = false;
    this.submittedHiringDocuments = [];
    this.talentDocumentsConsentAccepted = false;
    this.statusDocumentsConsentAccepted = false;
    this.expandCurrentStatusPreview();
    this.syncRecruiterStatusStage(this.mapRecruiterStepIndexToStage(index));
  }

  selectAcceptedContractDecision(): void {
    this.statusStageIndex = 3;
    this.contractDecision = 'accepted';
    this.documentsSubmittedByTalent = false;
    this.documentsSent = false;
    this.submittedHiringDocuments = [];
    this.talentDocumentsConsentAccepted = false;
    this.statusDocumentsConsentAccepted = false;
    this.expandCurrentStatusPreview();
    this.syncRecruiterStatusStage('aceito');
  }

  selectNextContractDecision(): void {
    this.statusStageIndex = 3;
    this.contractDecision = 'next';
    this.documentsSubmittedByTalent = false;
    this.documentsSent = false;
    this.submittedHiringDocuments = [];
    this.talentDocumentsConsentAccepted = false;
    this.statusDocumentsConsentAccepted = false;
    this.expandCurrentStatusPreview();
    this.syncRecruiterStatusStage('proxima', undefined);
  }

  sendStatusDocuments(): void {
    this.documentsSent = true;
    this.expandCurrentStatusPreview();
    this.syncRecruiterStatusStage('contratado');
    this.triggerConfetti();
  }

  isStatusPreviewExpanded(index: number): boolean {
    return this.expandedStatusPreviewIndex === index;
  }

  toggleStatusPreviewDetails(index: number): void {
    this.expandedStatusPreviewIndex = this.expandedStatusPreviewIndex === index ? -1 : index;
  }

  cancelJobFromStatus(): void {
    if (!this.editingJobId) {
      return;
    }

    const confirmed = window.confirm('Deseja cancelar esta vaga?');
    if (!confirmed) {
      return;
    }

    this.editingJobStatus = 'encerradas';
    this.editingJobStatusReason = this.editingJobStatusReason.trim() || 'Vaga cancelada pelo recruiter.';
    const savedJob = this.persistJob('encerradas');
    this.hydrateFromJob(savedJob);
    this.cdr.markForCheck();
  }

  isSubmittedHiringDocument(label: string): boolean {
    return this.submittedHiringDocuments.includes(label);
  }

  closeSummaryPanel(): void {
    this.summaryPanelOpen = false;
  }

  openSummaryPanel(): void {
    this.summaryPanelOpen = true;
  }

  startSummaryPanelDrag(event: PointerEvent): void {
    if (event.pointerType && event.pointerType !== 'mouse') {
      return;
    }

    const page = event.currentTarget as HTMLElement | null;
    const target = event.target as HTMLElement | null;
    if (!page || this.isSummaryPanelInteractiveTarget(target)) {
      return;
    }

    this.summaryPanelDragState = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: page.scrollTop,
      dragging: false,
      element: page,
    };

    page.setPointerCapture(event.pointerId);
  }

  onSummaryPanelDrag(event: PointerEvent): void {
    const state = this.summaryPanelDragState;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    const deltaY = event.clientY - state.startY;
    if (!state.dragging && Math.abs(deltaY) > 3) {
      state.dragging = true;
      state.element.classList.add('summary-card__tab-page--dragging');
    }

    if (!state.dragging) {
      return;
    }

    state.element.scrollTop = state.startScrollTop - deltaY;
    event.preventDefault();
  }

  endSummaryPanelDrag(event: PointerEvent): void {
    const state = this.summaryPanelDragState;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    state.element.classList.remove('summary-card__tab-page--dragging');
    if (state.element.hasPointerCapture(event.pointerId)) {
      state.element.releasePointerCapture(event.pointerId);
    }

    this.summaryPanelDragState = null;
  }

  advanceStatusStage(): void {
    if (this.statusStageIndex >= 3) {
      return;
    }

    this.statusStageIndex += 1;
    this.contractDecision = null;
    this.documentsSubmittedByTalent = false;
    this.documentsSent = false;
    this.submittedHiringDocuments = [];
    this.talentDocumentsConsentAccepted = false;
    this.statusDocumentsConsentAccepted = false;
    this.expandCurrentStatusPreview();
    this.syncRecruiterStatusStage(this.mapRecruiterStepIndexToStage(this.statusStageIndex));
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

  private isSummaryPanelInteractiveTarget(target: HTMLElement | null): boolean {
    return !!target?.closest('button, a, input, label, select, textarea, option, [role="button"], [role="link"]');
  }

  private expandCurrentStatusPreview(): void {
    this.expandedStatusPreviewIndex = this.currentStatusPreviewIndex;
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
    companyLogoUrl: '',
    homeAnnouncementImageUrl: '',
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
    'Amazon BR': false,
    'Magazine Luiza': false,
    'BTG Pactual': false,
    Bradesco: false,
    'Stefanini Brasil': false,
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
  companyLogoError = '';
  homeAnnouncementImageError = '';
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
    const directoryProfile = this.companyDirectoryService.getCompanyByName(this.jobDraft.company);
    const profile = directoryProfile
      ? {
          name: directoryProfile.name,
          followers: directoryProfile.followers,
          description: directoryProfile.description,
          linkedinCount: directoryProfile.linkedinCount,
          logoLabel: directoryProfile.logoLabel,
          logoUrl: directoryProfile.logoUrl,
          monthlyHiringCount: directoryProfile.monthlyHiringCount,
        }
      : this.companyProfiles[this.jobDraft.company] ?? {
      name: this.jobDraft.company,
      followers: '120.000 seguidores',
      description: 'Empresa em crescimento',
      linkedinCount: '120.000 no LinkedIn',
      logoLabel: this.jobDraft.company.slice(0, 2).toLowerCase(),
      };

    if (!this.jobDraft.companyLogoUrl) {
      return profile;
    }

    return {
      ...profile,
      logoUrl: this.jobDraft.companyLogoUrl,
    };
  }

  get currentAnnouncementCardImageUrl(): string {
    return this.jobDraft.homeAnnouncementImageUrl?.trim() || this.currentCompanyProfile.logoUrl?.trim() || '';
  }

  get currentAnnouncementCardHiringCount(): number {
    return this.currentCompanyProfile.monthlyHiringCount ?? 18;
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

  openCompanyLogoPicker(input: HTMLInputElement): void {
    input.click();
  }

  openHomeAnnouncementImagePicker(input: HTMLInputElement): void {
    input.click();
  }

  onCompanyLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.handleCompanyLogoFile(input?.files?.[0] ?? null);

    if (input) {
      input.value = '';
    }
  }

  onCompanyLogoKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openCompanyLogoPicker(input);
  }

  onHomeAnnouncementImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.handleHomeAnnouncementImageFile(input?.files?.[0] ?? null);

    if (input) {
      input.value = '';
    }
  }

  onHomeAnnouncementImageKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openHomeAnnouncementImagePicker(input);
  }

  selectWorkModel(workModel: WorkModel): void {
    this.jobDraft.workModel = workModel;
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
      this.ensureCurrentRecruiterCompanyInDraft();
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
      companyLogoUrl: job.companyLogoUrl ?? '',
      homeAnnouncementImageUrl: job.homeAnnouncementImageUrl ?? '',
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
    this.selectedDocuments = [...job.hiringDocuments];
    this.selectedTechStackItems = job.techStack.map((item) => ({ ...item }));
    this.selectedRefinementOptions = [...job.differentials];
    this.responsibilitySections = job.responsibilitySections.map((section) => ({
      ...section,
      items: [...section.items],
    }));
    this.hydrateStatusFromJob(job);
  }

  private ensureCurrentRecruiterCompanyInDraft(): void {
    const recruiterCompanies = this.recruiterDirectoryService.getRecruiterCompanies();
    const nextCompany = recruiterCompanies[0]?.trim() || this.jobDraft.company;

    if (!nextCompany || this.jobDraft.company === nextCompany) {
      return;
    }

    this.jobDraft.company = nextCompany;
  }

  private hydrateStatusFromJob(job: MockJobRecord): void {
    const candidate = this.vagasMockService.findTalentCandidate(job);
    const effectiveStage = this.vagasMockService.getEffectiveCandidateStage(candidate);

    this.contractDecision = null;
    this.documentsSubmittedByTalent = false;
    this.documentsSent = false;
    this.submittedHiringDocuments = [];
    this.talentDocumentsConsentAccepted = false;
    this.statusDocumentsConsentAccepted = false;

    if (job.talentDecision === 'hidden' || effectiveStage === 'cancelado') {
      this.statusStageIndex = 0;
      this.expandCurrentStatusPreview();
      return;
    }

    switch (effectiveStage) {
      case 'candidatura':
        this.statusStageIndex = 1;
        this.expandCurrentStatusPreview();
        return;
      case 'processo':
      case 'tecnica':
        this.statusStageIndex = 2;
        this.expandCurrentStatusPreview();
        return;
      case 'aguardando':
        this.statusStageIndex = 3;
        this.expandCurrentStatusPreview();
        return;
      case 'aceito':
        this.statusStageIndex = 3;
        this.contractDecision = 'accepted';
        this.expandCurrentStatusPreview();
        return;
      case 'proxima':
        this.statusStageIndex = 3;
        this.contractDecision = 'next';
        this.expandCurrentStatusPreview();
        return;
      case 'documentacao':
        this.statusStageIndex = 3;
        this.contractDecision = 'accepted';
        this.documentsSubmittedByTalent = true;
        this.submittedHiringDocuments = [...(job.talentSubmittedDocuments ?? [])];
        this.talentDocumentsConsentAccepted = job.talentDocumentsConsentAccepted ?? false;
        this.expandCurrentStatusPreview();
        return;
      case 'contratado':
        this.statusStageIndex = 3;
        this.contractDecision = 'accepted';
        this.documentsSubmittedByTalent = true;
        this.documentsSent = true;
        this.submittedHiringDocuments = [...(job.talentSubmittedDocuments ?? [])];
        this.talentDocumentsConsentAccepted = job.talentDocumentsConsentAccepted ?? false;
        this.expandCurrentStatusPreview();
        return;
      default:
        this.statusStageIndex = 0;
        this.expandCurrentStatusPreview();
    }
  }

  private mapRecruiterStepIndexToStage(index: number): MockJobCandidate['stage'] {
    switch (index) {
      case 1:
        return 'candidatura';
      case 2:
        return 'processo';
      case 3:
        return 'aguardando';
      default:
        return 'radar';
    }
  }

  private syncRecruiterStatusStage(
    stage: MockJobCandidate['stage'],
    talentDecision?: 'applied' | undefined,
  ): void {
    if (!this.editingJobId) {
      return;
    }

    this.vagasMockService.updateRecruiterTalentStage(this.editingJobId, stage, talentDecision);
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
      hiringDocuments: [...this.selectedDocuments],
      techStack: this.selectedTechStackItems.map((item) => ({ ...item })),
      differentials: [...this.selectedRefinementOptions],
      responsibilitySections: this.responsibilitySections.map((section) => ({
        ...section,
        items: [...section.items],
      })),
    };
  }

  private handleCompanyLogoFile(file: File | null): void {
    this.companyLogoError = '';

    if (!file) {
      return;
    }

    if (!this.isAcceptedCompanyLogoFile(file)) {
      this.companyLogoError = 'Use JPG, PNG, GIF ou WEBP.';
      this.cdr.markForCheck();
      return;
    }

    if (file.size > this.maxCompanyLogoSizeBytes) {
      this.companyLogoError = 'A imagem deve ter no máximo 5MB.';
      this.cdr.markForCheck();
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      this.jobDraft.companyLogoUrl = typeof reader.result === 'string' ? reader.result : '';
      this.companyLogoError = '';
      this.cdr.markForCheck();
    };

    reader.readAsDataURL(file);
  }

  private handleHomeAnnouncementImageFile(file: File | null): void {
    this.homeAnnouncementImageError = '';

    if (!file) {
      return;
    }

    if (!this.isAcceptedCompanyLogoFile(file)) {
      this.homeAnnouncementImageError = 'Use JPG, PNG, GIF ou WEBP.';
      this.cdr.markForCheck();
      return;
    }

    if (file.size > this.maxCompanyLogoSizeBytes) {
      this.homeAnnouncementImageError = 'A imagem deve ter no máximo 5MB.';
      this.cdr.markForCheck();
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      this.jobDraft.homeAnnouncementImageUrl = typeof reader.result === 'string' ? reader.result : '';
      this.homeAnnouncementImageError = '';
      this.cdr.markForCheck();
    };

    reader.readAsDataURL(file);
  }

  private isAcceptedCompanyLogoFile(file: File): boolean {
    if (this.acceptedCompanyLogoMimeTypes.includes(file.type)) {
      return true;
    }

    const fileName = file.name.toLowerCase();
    return fileName.endsWith('.jpg')
      || fileName.endsWith('.jpeg')
      || fileName.endsWith('.png')
      || fileName.endsWith('.gif')
      || fileName.endsWith('.webp');
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
