import { Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type CandidateJob = {
  id: string;
  company: string;
  title: string;
  description?: string;
  fullDescription?: {
    about?: string;
    daily?: string[];
    expectations?: string[];
    benefits?: string[];
  };
  department: string;
  location: string;
  type: string;
  matchScore: number;
  status: 'nova' | 'vista' | 'aplicada';
  workflowStatus: 'vaga' | 'cancelada' | 'solicitacao_contratacao';
  recruiterName?: string;
  gapHint?: string;
  requiredSkills?: Array<{ name: string; level: number }>;
  salaryAmount?: number;
  paymentDays?: string;
};

type CandidateAlert = {
  id: string;
  title: string;
  time: string;
  unread: number;
  jobId?: string;
};

type CandidateChatMsg = {
  id: string;
  from: 'me' | 'recruiter';
  text: string;
  time: string;
};

type CandidateStatusFilter = 'todos' | 'solicitacao' | 'candidatado';
type CandidateContractFilter = 'todos' | 'CLT' | 'PJ' | 'Híbrido' | 'Remoto';
type CandidateHiringStage = 'solicitacao' | 'em_processo' | 'contratado';

type CandidateHiringForm = {
  lgpdAccepted: boolean;
  healthPlan: 'nao' | 'basico' | 'premium';
  transportVoucher: boolean;
  mealVoucherAccepted: boolean;
  mealVoucherType: 'refeicao' | 'alimentacao' | 'ambos';
  additionalBenefits: {
    gympass: boolean;
    dentalPlan: boolean;
    lifeInsurance: boolean;
    educationAid: boolean;
  };
};

type CandidateLongDescription = {
  about?: string;
  daily?: string[];
  expectations?: string[];
  benefits?: string[];
};

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './talent.page.html',
  styleUrls: ['./talent.page.scss'],
})
export class TalentPage implements OnDestroy {
  readonly autoApplyThreshold = 82;
  readonly recruiterAvatarUrl = 'assets/recuiter-job.png';
  readonly candidateAvatarUrl = 'assets/avatar-default.png';
  activeTab: 'recommended' | 'applications' = 'recommended';
  statusFilter: CandidateStatusFilter = 'todos';
  isFilterModalOpen = false;
  filterTitleQuery = '';
  filterLocationQuery = '';
  filterContractType: CandidateContractFilter = 'todos';
  filterMinMatch = 0;
  private readonly defaultLongDescription: CandidateLongDescription = {
    about:
      'Você vai ter proximidade com o negócio e abertura para trazer novas ideias e soluções. Somos responsáveis pelo processo de onboarding e manutenção de clientes da América Latina e EUA, onde poderá atuar adquirindo experiências internacionais.',
    daily: [
      'Trabalhar em conjunto com o time para definir e desenvolver novas soluções;',
      'Desenvolver melhorias e novas funcionalidades em sistemas já existentes;',
      'Manter um relacionamento próximo com as áreas de negócio e outras equipes de IT do Grupo BTG Pactual;',
      'Interagir com a área de negócios para compreender problemas e modelar soluções;',
      'Garantir a alta disponibilidade e performance das plataformas;',
      'Participar de todo o fluxo do projeto, desde a elaboração da arquitetura até a entrega em produção;',
      'Ser responsável por apoiar as aplicações em produção.',
    ],
    expectations: [
      'Formação superior completa, preferencialmente em engenharia, ciências da computação ou áreas relacionadas;',
      'Vivência e experiência em resolução de problemas;',
      'Conhecimentos em programação utilizando .Net Core/.Net/C#;',
      'Conhecimento em Cloud AWS (EC2, S3, CloudFormation, etc), Docker e Kubernetes;',
      'Experiência com bancos de dados e mensageria;',
      'Experiência com testes unitários;',
      'Facilidade em atuar com diversas stacks e ferramentas;',
      'Conhecimentos de DevOps, Terraform e CloudFormation;',
      'Princípios de programação: SOLID, orientação a objetos e boas práticas;',
      'Vontade de aprender novas linguagens e tecnologias;',
      'Disponibilidade para atuar no modelo híbrido, com até 3 dias presenciais nos escritórios da Faria Lima (São Paulo) ou Botafogo (Rio de Janeiro);',
      'Inglês intermediário (comunicação e escrita).',
    ],
    benefits: [
      'Participação nos Lucros e Resultados (PLR);',
      'Auxílio Alimentação e Refeição;',
      'Plano Médico;',
      'Plano Odontológico;',
      'Auxílio Creche/Babá;',
      'Vale Transporte;',
      'WellHub;',
      'TotalPass;',
      'Programa de Apoio Pessoal (EAP);',
      'Planos por adesão como Previdência Privada e Seguro de Vida;',
      'Desconto em Farmácia;',
      'Programa de Nutrição;',
      'Programa de Gestantes;',
      'Licença Maternidade e Paternidade Estendida – Empresa Cidadã.',
    ],
  };

  jobsMock: CandidateJob[] = [
    {
      id: 'V-1042',
      company: 'BRQ Solutions',
      title: 'Desenvolvedor .NET Sênior',
      description: 'Atuação em APIs e microsserviços com foco em performance, arquitetura e evolução de produto.',
      fullDescription: {
        about:
          'Você vai ter proximidade com o negócio e abertura para trazer novas ideias e soluções. O time atua em onboarding e manutenção de clientes da América Latina e EUA, com experiências internacionais no dia a dia.',
        daily: [
          'Trabalhar em conjunto com o time para definir e desenvolver novas soluções.',
          'Desenvolver melhorias e novas funcionalidades em sistemas já existentes.',
          'Manter relacionamento próximo com áreas de negócio e equipes de IT.',
          'Interagir com negócio para compreender problemas e modelar soluções.',
          'Garantir alta disponibilidade e performance das plataformas.',
          'Participar do fluxo completo, da arquitetura até produção.',
          'Apoiar aplicações em produção.',
        ],
        expectations: [
          'Formação superior completa em engenharia, computação ou áreas relacionadas.',
          'Vivência em resolução de problemas.',
          'Conhecimentos em .Net Core/.Net/C#.',
          'Conhecimento em AWS, Docker e Kubernetes.',
          'Experiência com bancos de dados e mensageria.',
          'Experiência com testes unitários.',
          'Boa atuação com múltiplas stacks e ferramentas.',
          'Conhecimentos de DevOps, Terraform e CloudFormation.',
          'Princípios SOLID, orientação a objetos e boas práticas.',
          'Vontade de aprender novas linguagens e tecnologias.',
          'Disponibilidade para modelo híbrido.',
          'Inglês intermediário (comunicação e escrita).',
        ],
        benefits: [
          'Participação nos Lucros e Resultados (PLR).',
          'Auxílio Alimentação e Refeição.',
          'Plano Médico e Plano Odontológico.',
          'Auxílio Creche/Babá.',
          'Vale Transporte.',
          'WellHub e TotalPass.',
          'Programa de Apoio Pessoal (EAP).',
          'Previdência Privada e Seguro de Vida por adesão.',
          'Desconto em Farmácia.',
          'Programa de Nutrição e Programa de Gestantes.',
          'Licença Maternidade e Paternidade Estendida.',
        ],
      },
      department: 'Tecnologia',
      location: 'Rio de Janeiro',
      type: 'Remoto',
      matchScore: 89,
      status: 'nova',
      workflowStatus: 'vaga',
      recruiterName: 'Julio Recruiter',
      requiredSkills: [
        { name: '.NET / C#', level: 89 },
        { name: 'APIs REST', level: 86 },
        { name: 'Microsserviços', level: 83 },
        { name: 'SQL Server', level: 80 },
      ],
    },
    {
      id: 'V-1051',
      company: 'TIVIT',
      title: 'Product Designer Pleno',
      description: 'Responsável por fluxos de produto, protótipos e melhorias de experiência em jornadas críticas.',
      department: 'Produto',
      location: 'São Paulo',
      type: 'Híbrido',
      matchScore: 84,
      status: 'vista',
      workflowStatus: 'vaga',
      recruiterName: 'Aline Recruiter',
      requiredSkills: [
        { name: 'UX Research', level: 85 },
        { name: 'Figma', level: 88 },
        { name: 'Design System', level: 82 },
        { name: 'Prototipação', level: 84 },
      ],
    },
    {
      id: 'V-1060',
      company: 'Compass UOL',
      title: 'Frontend Angular Pleno',
      description: 'Manutenção e evolução de front-end web com componentes reutilizáveis e integração com APIs.',
      department: 'Tecnologia',
      location: 'Remoto',
      type: 'CLT',
      matchScore: 78,
      status: 'nova',
      workflowStatus: 'vaga',
      gapHint: 'TypeScript avançado',
      recruiterName: 'Marcos Recruiter',
      requiredSkills: [
        { name: 'Angular', level: 86 },
        { name: 'TypeScript', level: 82 },
        { name: 'RxJS', level: 78 },
        { name: 'HTML/CSS', level: 80 },
      ],
    },
    {
      id: 'V-1068',
      company: 'NTT DATA',
      title: 'Engenheiro de Plataforma',
      description: 'Sustentação de ambientes cloud, automação de infraestrutura e observabilidade de serviços.',
      department: 'Infra / Cloud',
      location: 'Belo Horizonte',
      type: 'Híbrido',
      matchScore: 81,
      status: 'vista',
      workflowStatus: 'vaga',
      gapHint: 'Kubernetes',
      recruiterName: 'Paula Recruiter',
      requiredSkills: [
        { name: 'Kubernetes', level: 82 },
        { name: 'Cloud (AWS)', level: 80 },
        { name: 'CI/CD', level: 79 },
        { name: 'Observabilidade', level: 77 },
      ],
    },
    {
      id: 'V-1077',
      company: 'BRQ Solutions',
      title: 'Tech Lead Backend',
      description: 'Liderança técnica de squad backend com foco em escala, governança e qualidade de entrega.',
      department: 'Tecnologia',
      location: 'Remoto',
      type: 'PJ',
      matchScore: 92,
      status: 'aplicada',
      workflowStatus: 'vaga',
      recruiterName: 'Rafa Recruiter',
      requiredSkills: [
        { name: 'Node/Backend', level: 90 },
        { name: 'Arquitetura', level: 88 },
        { name: 'Liderança Técnica', level: 85 },
        { name: 'Governança', level: 83 },
      ],
    },
    {
      id: 'V-1084',
      company: 'TIVIT',
      title: 'Analista de Qualidade de Software',
      description: 'Planejamento e execução de testes funcionais e automatizados em jornadas críticas.',
      department: 'Qualidade',
      location: 'São Paulo',
      type: 'Híbrido',
      matchScore: 80,
      status: 'vista',
      workflowStatus: 'vaga',
      recruiterName: 'Bianca Recruiter',
      requiredSkills: [
        { name: 'Testes Automatizados', level: 82 },
        { name: 'Cypress', level: 79 },
        { name: 'API Testing', level: 78 },
      ],
    },
    {
      id: 'V-1091',
      company: 'Compass UOL',
      title: 'Analista de Dados Júnior',
      description: 'A vaga foi encerrada pelo time após ajuste de orçamento da área.',
      department: 'Dados',
      location: 'Remoto',
      type: 'CLT',
      matchScore: 75,
      status: 'vista',
      workflowStatus: 'cancelada',
      recruiterName: 'Luiz Recruiter',
      requiredSkills: [
        { name: 'SQL', level: 76 },
        { name: 'Power BI', level: 74 },
      ],
    },
    {
      id: 'V-1098',
      company: 'NTT DATA',
      title: 'Desenvolvedor Backend Java',
      description: 'Você foi aprovado na entrevista e há solicitação de contratação aguardando seu aceite.',
      department: 'Tecnologia',
      location: 'Rio de Janeiro',
      type: 'CLT',
      matchScore: 91,
      status: 'aplicada',
      workflowStatus: 'solicitacao_contratacao',
      salaryAmount: 11200,
      paymentDays: '15 e 30 de cada mês',
      recruiterName: 'Camila Recruiter',
      requiredSkills: [
        { name: 'Java / Spring', level: 90 },
        { name: 'APIs REST', level: 88 },
        { name: 'SQL', level: 84 },
      ],
    },
    {
      id: 'V-1103',
      company: 'BRQ Solutions',
      title: 'Especialista DevOps',
      description: 'Atuação com automação de infraestrutura, pipelines CI/CD, observabilidade e evolução de ambientes cloud.',
      department: 'Infra / Cloud',
      location: 'Belo Horizonte',
      type: 'Híbrido',
      matchScore: 88,
      status: 'aplicada',
      workflowStatus: 'solicitacao_contratacao',
      salaryAmount: 12900,
      paymentDays: 'Todo dia 5 útil',
      recruiterName: 'Fernanda Recruiter',
      requiredSkills: [
        { name: 'AWS', level: 87 },
        { name: 'Kubernetes', level: 85 },
        { name: 'CI/CD', level: 86 },
      ],
    },
  ];

  alertsMock: CandidateAlert[] = [
    { id: 'a1', title: 'Recruiter abriu conversa na vaga .NET Sênior', time: 'agora', unread: 1, jobId: 'V-1042' },
    { id: 'a2', title: 'Nova vaga combinou com seu perfil (Angular)', time: 'há 12 min', unread: 1, jobId: 'V-1060' },
    { id: 'a3', title: 'Seu score aumentou após atualização de stack', time: 'ontem', unread: 0 },
  ];

  isChatOpen = false;
  chatDraft = '';
  selectedChatJobId: string | null = null;
  isJobSummaryOpen = false;
  selectedJobForSummary: CandidateJob | null = null;
  isExtendedDetailsOpen = false;
  private hiringFormByJobId: Record<string, CandidateHiringForm> = {};
  private hiringDataSharedByJobId: Record<string, boolean> = {};
  private hiringStageByJobId: Record<string, CandidateHiringStage> = {};
  private chatMessagesByJob: Record<string, CandidateChatMsg[]> = {
    'V-1042': [
      { id: 'm1', from: 'recruiter', text: 'Olá! Vi seu perfil para a vaga .NET. Tem disponibilidade esta semana?', time: '20:01' },
    ],
    'V-1060': [
      { id: 'm2', from: 'recruiter', text: 'Seu perfil combinou com uma vaga Angular. Posso te enviar detalhes?', time: '19:42' },
    ],
  };

  get averageMatch(): number {
    if (!this.jobsMock.length) return 0;
    const total = this.jobsMock.reduce((acc, job) => acc + job.matchScore, 0);
    return Math.round(total / this.jobsMock.length);
  }

  get recommendedJobsCount(): number {
    return this.recommendedJobs.length;
  }

  get recommendedJobs(): CandidateJob[] {
    const visible = this.jobsMock.filter(j => {
      const isContractRequest = j.status === 'aplicada' && j.workflowStatus === 'solicitacao_contratacao';
      const isApplied = j.status === 'aplicada' && j.workflowStatus !== 'solicitacao_contratacao';
      const isOpen = j.workflowStatus === 'vaga' && j.status !== 'aplicada';
      if (!isContractRequest && !isApplied && !isOpen) return false;
      const byStatus =
        this.statusFilter === 'todos'
          ? isContractRequest || isApplied || isOpen
          : this.statusFilter === 'solicitacao'
            ? isContractRequest
            : isApplied;
      if (!byStatus) return false;
      if (j.matchScore < this.filterMinMatch) return false;
      if (this.filterContractType !== 'todos' && j.type !== this.filterContractType) return false;
      if (this.filterTitleQuery.trim()) {
        const q = this.filterTitleQuery.trim().toLowerCase();
        if (!j.title.toLowerCase().includes(q)) return false;
      }
      if (this.filterLocationQuery.trim()) {
        const q = this.filterLocationQuery.trim().toLowerCase();
        if (!j.location.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    return [...visible].sort((a, b) => this.jobOrderRank(a) - this.jobOrderRank(b));
  }

  get unreadRecruiterMessages(): number {
    return this.alertsMock.reduce((acc, a) => acc + (a.unread || 0), 0);
  }

  get appliedJobsCount(): number {
    return this.jobsMock.filter(j => j.status === 'aplicada').length;
  }

  get appliedJobs(): CandidateJob[] {
    return this.jobsMock.filter(j => j.status === 'aplicada');
  }

  canAutoApply(job: CandidateJob): boolean {
    return job.matchScore >= this.autoApplyThreshold;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isFilterModalOpen) {
      this.closeFilterModal();
      return;
    }
    if (this.isChatOpen) {
      this.closeChat();
      return;
    }
    if (this.isJobSummaryOpen) this.closeJobSummary();
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  apply(job: CandidateJob): void {
    const nextStatus: CandidateJob['status'] = job.status === 'aplicada' ? 'vista' : 'aplicada';
    console.log(nextStatus === 'aplicada' ? 'Candidate apply' : 'Candidate unapply', job.id);
    this.jobsMock = this.jobsMock.map(j => (j.id === job.id ? { ...j, status: nextStatus } : j));

    if (this.selectedJobForSummary?.id === job.id) {
      this.selectedJobForSummary = { ...this.selectedJobForSummary, status: nextStatus };
    }
  }

  autoApply(job: CandidateJob): void {
    if (!this.canAutoApply(job)) return;
    console.log('Candidate auto-apply', job.id);
    this.jobsMock = this.jobsMock.map(j => (j.id === job.id ? { ...j, status: 'aplicada' } : j));
  }

  view(job: CandidateJob): void {
    this.openJobSummary(job);
  }

  openJobSummary(job: CandidateJob): void {
    console.log('View job details', job.id);
    this.selectedJobForSummary = job;
    this.isExtendedDetailsOpen = false;
    this.isJobSummaryOpen = true;
    this.syncBodyScrollLock();
  }

  closeJobSummary(): void {
    this.isJobSummaryOpen = false;
    this.selectedJobForSummary = null;
    this.isExtendedDetailsOpen = false;
    this.syncBodyScrollLock();
  }

  openExtendedDetails(): void {
    this.isExtendedDetailsOpen = true;
  }

  closeExtendedDetails(): void {
    this.isExtendedDetailsOpen = false;
  }

  openChatFromSummary(job: CandidateJob): void {
    this.openChat(job);
  }

  openChat(job: CandidateJob): void {
    this.selectedChatJobId = job.id;
    this.isChatOpen = true;
    this.syncBodyScrollLock();
    this.markJobAlertsAsRead(job.id);
  }

  openChatFromAlert(alert: CandidateAlert): void {
    if (!alert.jobId) return;
    const job = this.jobsMock.find(j => j.id === alert.jobId);
    if (!job) return;
    this.openChat(job);
  }

  closeChat(): void {
    this.isChatOpen = false;
    this.chatDraft = '';
    this.syncBodyScrollLock();
  }

  sendRecruiterMessage(): void {
    const text = this.chatDraft.trim();
    const job = this.selectedChatJob;
    if (!text || !job) return;

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const current = this.chatMessagesByJob[job.id] ?? [];

    const next: CandidateChatMsg[] = [
      ...current,
      { id: `me-${Date.now()}`, from: 'me', text, time },
      {
        id: `rc-${Date.now()}-1`,
        from: 'recruiter',
        text: this.mockRecruiterReply(text),
        time,
      },
    ];

    this.chatMessagesByJob = { ...this.chatMessagesByJob, [job.id]: next };
    this.chatDraft = '';
  }

  gapToThreshold(job: CandidateJob): number {
    return Math.max(0, this.autoApplyThreshold - job.matchScore);
  }

  get selectedChatJob(): CandidateJob | null {
    if (!this.selectedChatJobId) return null;
    return this.jobsMock.find(j => j.id === this.selectedChatJobId) ?? null;
  }

  get chatMessages(): CandidateChatMsg[] {
    const job = this.selectedChatJob;
    if (!job) return [];
    return this.chatMessagesByJob[job.id] ?? [];
  }

  isMine(msg: CandidateChatMsg): boolean {
    return msg.from === 'me';
  }

  setActiveTab(tab: 'recommended' | 'applications'): void {
    this.activeTab = tab;
  }

  setStatusFilter(filter: CandidateStatusFilter): void {
    this.statusFilter = filter;
  }

  openFilterModal(): void {
    this.isFilterModalOpen = true;
    this.syncBodyScrollLock();
  }

  closeFilterModal(): void {
    this.isFilterModalOpen = false;
    this.syncBodyScrollLock();
  }

  clearAdvancedFilters(): void {
    this.filterTitleQuery = '';
    this.filterLocationQuery = '';
    this.filterContractType = 'todos';
    this.filterMinMatch = 0;
  }

  trackJob(_: number, job: CandidateJob): string {
    return job.id;
  }

  trackAlert(_: number, alert: CandidateAlert): string {
    return alert.id;
  }

  trackChatMsg(_: number, msg: CandidateChatMsg): string {
    return msg.id;
  }

  trackSkill(_: number, skill: { name: string; level: number }): string {
    return skill.name;
  }

  workflowLabel(status: CandidateJob['workflowStatus']): string {
    if (status === 'cancelada') return 'Cancelada';
    if (status === 'solicitacao_contratacao') return 'Solicitação de Contratação';
    return 'Vaga';
  }

  workflowLabelForJob(job: CandidateJob): string {
    if (job.workflowStatus !== 'solicitacao_contratacao') return this.workflowLabel(job.workflowStatus);
    const stage = this.getHiringStage(job.id);
    if (stage === 'em_processo') return 'Em processo de contratação';
    if (stage === 'contratado') return 'Contratado';
    return 'Solicitação de Contratação';
  }

  cardWorkflowLabel(job: CandidateJob): string {
    if (job.workflowStatus !== 'solicitacao_contratacao') return 'CANDIDATADO';
    const stage = this.getHiringStage(job.id);
    if (stage === 'em_processo') return 'EM PROCESSO DE CONTRATAÇÃO';
    if (stage === 'contratado') return 'CONTRATADO';
    return 'SOLICITAÇÃO DE CONTRATAÇÃO';
  }

  displayRecruiterName(name?: string): string {
    if (!name) return 'o Recrutador';
    return name.replace(/\s*Recruiter$/i, '').trim() || 'o Recrutador';
  }

  hiringSalaryLabel(job: CandidateJob): string {
    if (!job.salaryAmount) return 'A definir';
    const formatted = job.salaryAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return `${formatted} (${job.type})`;
  }

  getLongDescription(job: CandidateJob): CandidateLongDescription {
    return job.fullDescription ?? this.defaultLongDescription;
  }

  getHiringForm(jobId: string): CandidateHiringForm {
    if (!this.hiringFormByJobId[jobId]) {
      this.hiringFormByJobId[jobId] = {
        lgpdAccepted: false,
        healthPlan: 'basico',
        transportVoucher: true,
        mealVoucherAccepted: true,
        mealVoucherType: 'refeicao',
        additionalBenefits: {
          gympass: true,
          dentalPlan: true,
          lifeInsurance: true,
          educationAid: false,
        },
      };
    }
    return this.hiringFormByJobId[jobId];
  }

  shouldShowTransportVoucher(job: CandidateJob): boolean {
    return job.type !== 'Remoto';
  }

  isHiringDataShared(jobId: string): boolean {
    return !!this.hiringDataSharedByJobId[jobId];
  }

  getHiringStage(jobId: string): CandidateHiringStage {
    return this.hiringStageByJobId[jobId] ?? 'solicitacao';
  }

  hiringTicketImage(jobId: string): string {
    const stage = this.getHiringStage(jobId);
    if (stage === 'em_processo') return 'assets/tiket-em-contratacao.svg';
    if (stage === 'contratado') return 'assets/tiket-contratado.svg';
    return 'assets/ticket-contratacao.svg';
  }

  hiringShareButtonLabel(jobId: string): string {
    const stage = this.getHiringStage(jobId);
    if (stage === 'em_processo') return 'Em processo de contratação';
    if (stage === 'contratado') return 'Contratado';
    return 'Disponibilizar dados';
  }

  isHiringShareButtonDisabled(job: CandidateJob): boolean {
    const form = this.getHiringForm(job.id);
    return !form.lgpdAccepted || this.getHiringStage(job.id) !== 'solicitacao';
  }

  shareHiringData(job: CandidateJob): void {
    const form = this.getHiringForm(job.id);
    if (!form.lgpdAccepted) return;
    if (this.getHiringStage(job.id) !== 'solicitacao') return;
    const isFirstShare = !this.hiringDataSharedByJobId[job.id];
    this.hiringDataSharedByJobId[job.id] = true;
    this.hiringStageByJobId[job.id] = 'em_processo';
    if (isFirstShare) this.launchConfetti();
  }

  markHiringAsContracted(jobId: string): void {
    this.hiringStageByJobId[jobId] = 'contratado';
  }

  jobMessageCount(jobId: string): number {
    return this.chatMessagesByJob[jobId]?.length ?? 0;
  }

  private mockRecruiterReply(text: string): string {
    const q = text.toLowerCase();
    if (q.includes('sim')) return 'Perfeito. Vou te enviar os próximos passos ainda hoje.';
    if (q.includes('remoto')) return 'A vaga aceita remoto sim, com alinhamentos semanais.';
    if (q.includes('salário') || q.includes('pretensão')) return 'Ótimo, consigo validar a faixa com o time e retorno.';
    return 'Obrigado pelo retorno. Vou registrar aqui e avançar com o processo.';
  }

  private markJobAlertsAsRead(jobId: string): void {
    this.alertsMock = this.alertsMock.map(a => (a.jobId === jobId ? { ...a, unread: 0 } : a));
  }

  private jobOrderRank(job: CandidateJob): number {
    if (job.status === 'aplicada' && job.workflowStatus === 'solicitacao_contratacao') return 1;
    if (job.status === 'aplicada') return 2;
    if (job.workflowStatus === 'vaga') return 3;
    if (job.workflowStatus === 'cancelada') return 4;
    return 5;
  }

  private launchConfetti(): void {
    if (typeof document === 'undefined') return;

    const colors = ['#f09a2d', '#2b6edb', '#6bcf92', '#f26d6d', '#ffd166'];
    const total = 480;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < total; i += 1) {
      const piece = document.createElement('span');
      piece.style.position = 'fixed';
      piece.style.width = '9px';
      piece.style.height = '14px';
      piece.style.borderRadius = '2px';
      piece.style.pointerEvents = 'none';
      piece.style.zIndex = '1200';
      const angle = Math.random() * Math.PI * 2;
      const distance = 180 + Math.random() * (window.innerWidth * 0.45);
      const endX = Math.cos(angle) * distance;
      const endY = Math.sin(angle) * distance + window.innerHeight * 0.35;
      piece.style.left = `${centerX}px`;
      piece.style.top = `${centerY}px`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      document.body.appendChild(piece);

      const duration = 2200 + Math.random() * 1200;
      const rotateStart = Math.random() * 360;
      const rotateEnd = rotateStart + 720 + Math.random() * 360;

      const animation = piece.animate(
        [
          {
            opacity: 1,
            transform: `translate3d(0, 0, 0) rotate(${rotateStart}deg)`,
          },
          {
            opacity: 0,
            transform: `translate3d(${endX}px, ${endY}px, 0) rotate(${rotateEnd}deg)`,
          },
        ],
        {
          duration,
          delay: Math.random() * 180,
          easing: 'cubic-bezier(.2,.7,.3,1)',
          fill: 'forwards',
        },
      );

      animation.onfinish = () => piece.remove();
    }
  }

  private lockBodyScroll(): void {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = '';
  }

  private syncBodyScrollLock(): void {
    if (this.isChatOpen || this.isJobSummaryOpen || this.isFilterModalOpen) {
      this.lockBodyScroll();
      return;
    }
    this.unlockBodyScroll();
  }
}
