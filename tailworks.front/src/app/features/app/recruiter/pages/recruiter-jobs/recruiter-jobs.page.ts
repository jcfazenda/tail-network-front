import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  RecruiterCandidateCard,
  RecruiterJob,
  RecruiterJobDraft,
  RecruiterJobStatus,
  RecruiterPipelineStage,
  RecruiterSkillRequirement,
} from '../../models/recruiter.models';
import { RecruiterMockService } from '../../../services/recruiter-mock.service';
import { AvatarItem } from './components/avatar-stack/avatar-stack.component';
import { JobCardComponent } from './components/job-card/job-card.component';
import { PageHeaderComponent } from './components/page-header/page-header.component';
import { RadarFlowComponent, RadarStage } from './components/radar-flow/radar-flow.component';
import { TopNavComponent } from './components/top-nav/top-nav.component';
import { RadarAtivoCardComponent } from './radar/radar-ativo-card.component';
import { TalentRadarCardsComponent, TrendCard } from './radar/talent-radar-cards.component';

type StageOption = { value: RecruiterPipelineStage; label: string };
type AboutSectionKey = 'sobre' | 'dia' | 'esperamos';
type RoleFilter = 'all' | 'ux' | 'backend' | 'frontend' | 'fullstack' | 'dados';
type FilterTag = { type: 'category' | 'location'; value: string; label: string };
type WorkMode = 'remoto' | 'hibrido' | 'presencial';
type ApprovedEntry = { job: RecruiterJob; candidate: RecruiterCandidateCard };
type ProcessEntry = { job: RecruiterJob; candidate: RecruiterCandidateCard };

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TopNavComponent,
    PageHeaderComponent,
    JobCardComponent,
    TalentRadarCardsComponent,
  ],
  templateUrl: './recruiter-jobs.page.html',
  styleUrls: ['./recruiter-jobs.page.scss'],
})
export class RecruiterJobsPage implements OnInit {
  private readonly avatarPool = [12, 18, 22, 31, 37, 45, 49, 53, 57, 61, 65, 69];
  jobs: RecruiterJob[] = [];
  selectedJobId: string | null = null;
  roleFilter: RoleFilter = 'all';
  jobQuery = '';
  isFiltersPanelOpen = false;
  selectedCategories: RoleFilter[] = ['backend'];
  selectedStates: string[] = [];
  selectedWorkModes: WorkMode[] = [];
  selectedStatuses: RecruiterJobStatus[] = [];

  editorOpen = false;
  editorMode: 'create' | 'edit' | 'view' = 'create';
  editorTab: 'dados' | 'contratacao' | 'sobre' = 'dados';
  form: RecruiterJobDraft = this.emptyDraft();
  actionMenuJobId: string | null = null;
  statusModalOpen = false;
  statusTargetJob: RecruiterJob | null = null;
  statusDraft: RecruiterJobStatus = 'aberta';
  isCandidatesPanelOpen = false;
  candidatesPanelJob: RecruiterJob | null = null;
  isApprovedPanelOpen = false;
  isProcessPanelOpen = false;
  isInterviewPanelOpen = false;
  approvedQuery = '';
  processQuery = '';
  interviewQuery = '';

  skillNome = '';
  skillPeso = 25;
  skillMinimo = 70;
  stackSearch = '';
  aboutDrafts: Record<AboutSectionKey, string> = {
    sobre: '',
    dia: '',
    esperamos: '',
  };

  readonly tipoOptions = ['Sênior', 'Pleno', 'Júnior', 'Estagiário', 'Especialista', 'Líder Técnico'];
  readonly trilhaOptions = ['Backend', 'Frontend', 'Full Stack', 'Dados', 'UX', 'Mobile', 'DevOps', 'QA'];
  readonly clientOptions = [
    'Banco Itaú',
    'Santander Brasil',
    'Energisa',
    'Bradesco',
    'BTG Pactual',
    'XP Inc.',
    'Nubank',
    'TIVIT',
    'Compass UOL',
    'NTT DATA',
  ];
  readonly stackCatalog = [
    '.NET',
    'Java',
    'Spring',
    'Angular',
    'React',
    'Node.js',
    'Python',
    'SQL',
    'AWS',
    'Docker',
    'Kubernetes',
    'Terraform',
    'TypeScript',
    'Power BI',
    'Figma',
    'UX Research',
  ];
  readonly healthPlanOptions = [
    'Sem plano',
    'Bradesco Saúde Nacional',
    'SulAmérica Exato',
    'Amil S380',
    'Unimed Nacional',
  ];
  readonly mealTicketOptions = [
    'Não aplicável',
    'R$ 30,00 por dia útil',
    'R$ 38,00 por dia útil',
    'R$ 45,00 por dia útil',
    'R$ 52,00 por dia útil',
  ];
  readonly dentalPlanOptions = [
    'Sem plano odontológico',
    'Amil Dental 205',
    'Bradesco Dental Top',
    'SulAmérica Odonto',
    'OdontoPrev Essencial',
  ];
  readonly benefitsCatalog = [
    'Vale Transporte',
    'PLR',
    'Wellhub',
    'TotalPass',
    'Auxílio Home Office',
    'Seguro de Vida',
    'Auxílio Creche',
  ];

  readonly pipelineStages: StageOption[] = [
    { value: 'novos', label: 'Novos' },
    { value: 'triagem', label: 'Triagem' },
    { value: 'contato', label: 'Contato' },
    { value: 'entrevista', label: 'Entrevista' },
    { value: 'oferta', label: 'Oferta' },
    { value: 'contratado', label: 'Contratado' },
    { value: 'reprovado', label: 'Reprovado' },
  ];
  readonly filterCategories: Array<{ label: string; value: RoleFilter }> = [
    { label: 'UX', value: 'ux' },
    { label: 'Backend', value: 'backend' },
    { label: 'Frontend', value: 'frontend' },
    { label: 'Full Stack', value: 'fullstack' },
    { label: 'Dados', value: 'dados' },
  ];
  readonly filterStatuses: Array<{ label: string; value: RecruiterJobStatus }> = [
    { label: 'Aberta', value: 'aberta' },
    { label: 'Pausada', value: 'pausada' },
    { label: 'Fechada', value: 'fechada' },
  ];
  readonly filterStates: Array<{ label: string; uf: string; value: string }> = [
    { label: 'São Paulo', uf: 'SP', value: 'sp' },
    { label: 'Rio de Janeiro', uf: 'RJ', value: 'rj' },
    { label: 'Minas Gerais', uf: 'MG', value: 'mg' },
    { label: 'Pernambuco', uf: 'PE', value: 'pe' },
    { label: 'Paraná', uf: 'PR', value: 'pr' },
  ];
  readonly filterWorkModes: Array<{ label: string; value: WorkMode; icon: string }> = [
    { label: 'Remoto', value: 'remoto', icon: 'home_work' },
    { label: 'Híbrido', value: 'hibrido', icon: 'sync_alt' },
    { label: 'Presencial', value: 'presencial', icon: 'business_center' },
  ];
  readonly radarCards: TrendCard[] = [
    {
      title: 'Radar Ativo',
      subtitle: '5 talentos',
      percent: 85,
      caption: 'Aderência mínima',
      deltaLeft: { value: '+7% semana', tone: 'up' },
      deltaRight: { value: '+2 +2%', tone: 'up' },
      icon: 'cap',
      tone: 'green',
      series: [72, 73, 73, 74, 76, 79, 85],
    },
    {
      title: 'Em Evolução',
      subtitle: '8 talentos',
      percent: 82,
      caption: 'Aderência média',
      deltaLeft: { value: '+5% semana', tone: 'up' },
      deltaRight: { value: '+2 +2%', tone: 'up' },
      icon: 'flame',
      tone: 'orange',
      series: [70, 70, 71, 72, 74, 76, 82],
    },
    {
      title: 'Em Conversa',
      subtitle: '5 talentos',
      percent: 82,
      caption: 'Aderência média',
      deltaLeft: { value: '+82% semana', tone: 'neutral' },
      deltaRight: { value: '+8 +8%', tone: 'up' },
      icon: 'chat',
      tone: 'blue',
      series: [68, 69, 70, 71, 73, 76, 82],
    },
  ];

  constructor(private readonly recruiterMock: RecruiterMockService, private readonly router: Router) {}

  ngOnInit(): void {
    this.reload();
  }

  get isViewMode(): boolean {
    return this.editorMode === 'view';
  }


  get filteredJobs(): RecruiterJob[] {
    let list = [...this.jobs];
    const categoriesFilterOn =
      this.selectedCategories.length > 0 &&
      this.selectedCategories.length < this.filterCategories.length;
    if (categoriesFilterOn) {
      list = list.filter(job => this.selectedCategories.some(category => this.matchesRoleFilter(job, category)));
    }
    const statusFilterOn =
      this.selectedStatuses.length > 0 &&
      this.selectedStatuses.length < this.filterStatuses.length;
    if (statusFilterOn) {
      list = list.filter(job => this.selectedStatuses.includes(job.status));
    }
    const statesFilterOn =
      this.selectedStates.length > 0 &&
      this.selectedStates.length < this.filterStates.length;
    if (statesFilterOn) {
      list = list.filter(job => this.selectedStates.some(state => this.matchesStateFilter(job, state)));
    }
    const workModeFilterOn =
      this.selectedWorkModes.length > 0 &&
      this.selectedWorkModes.length < this.filterWorkModes.length;
    if (workModeFilterOn) {
      list = list.filter(job => this.selectedWorkModes.some(mode => this.matchesWorkModeFilter(job, mode)));
    }
    const query = this.jobQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(job => {
        const hay = `${job.titulo} ${job.empresa} ${job.local} ${job.departamento} ${job.trilha ?? ''}`.toLowerCase();
        return hay.includes(query);
      });
    }
    return list;
  }

  get activeFilterTags(): FilterTag[] {
    const categoryTags = this.selectedCategories
      .map(value => this.filterCategories.find(item => item.value === value))
      .filter((item): item is { label: string; value: RoleFilter } => Boolean(item))
      .map(item => ({ type: 'category' as const, value: item.value, label: item.label }));
    return categoryTags;
  }

  get activeFilterCount(): number {
    return this.activeFilterTags.length;
  }

  get roleFilterLabel(): string {
    if (this.roleFilter === 'all') return 'Todas';
    if (this.roleFilter === 'ux') return 'UX';
    if (this.roleFilter === 'backend') return 'Backend';
    if (this.roleFilter === 'frontend') return 'Frontend';
    if (this.roleFilter === 'fullstack') return 'Full Stack';
    return 'Dados';
  }

  get radarActiveTalents(): number {
    return this.filteredJobs.reduce(
      (total, job) => total + job.candidatos.filter(c => c.aderenciaPercentual >= job.metaMinimaPercentual).length,
      0
    );
  }

  get radarStages(): RadarStage[] {
    return [
      {
        key: 'active',
        title: 'Radar Ativo',
        talents: this.radarActiveTalents,
        percent: this.radarAverageFit('active'),
        metricLabel: 'Aderência mínima',
        growth: this.radarGrowth('active'),
        icons: '🎓 🚀',
        tone: 'green',
      },
      {
        key: 'evolution',
        title: 'Em Evolução',
        talents: this.processEntries.length,
        percent: this.radarAverageFit('process'),
        metricLabel: 'Aderência média',
        growth: this.radarGrowth('process'),
        icons: '🔥 ⚠',
        tone: 'amber',
      },
      {
        key: 'conversation',
        title: 'Em Conversa',
        talents: this.interviewEntries.length,
        percent: this.radarAverageFit('conversation'),
        metricLabel: 'Aderência média',
        growth: this.radarGrowth('conversation'),
        icons: '⚠ ✨',
        tone: 'blue',
      },
    ];
  }

  get selectedJob(): RecruiterJob | null {
    if (!this.selectedJobId) return null;
    return this.jobs.find(job => job.id === this.selectedJobId) ?? null;
  }

  get approvedEntries(): ApprovedEntry[] {
    return this.jobs
      .filter(job => job.status === 'fechada')
      .flatMap(job =>
        job.candidatos
          .filter(candidate => candidate.statusPipeline === 'contratado')
          .map(candidate => ({ job, candidate }))
      )
      .sort((a, b) => b.candidate.aderenciaPercentual - a.candidate.aderenciaPercentual);
  }

  get featuredApproved(): ApprovedEntry | null {
    return this.approvedEntries[0] ?? null;
  }

  get extraApprovedCount(): number {
    return Math.max(0, this.approvedEntries.length - 1);
  }

  get processEntries(): ProcessEntry[] {
    return this.jobs
      .flatMap(job =>
        this.processCandidates(job).map(candidate => ({
          job,
          candidate,
        }))
      )
      .sort((a, b) => b.candidate.aderenciaPercentual - a.candidate.aderenciaPercentual);
  }

  get filteredProcessEntries(): ProcessEntry[] {
    const query = this.processQuery.trim().toLowerCase();
    if (!query) return this.processEntries;
    return this.processEntries.filter(item => {
      const hay =
        `${item.candidate.nome} ${item.job.titulo} ${item.job.empresa} ${item.job.local}`.toLowerCase();
      return hay.includes(query);
    });
  }

  get interviewEntries(): ProcessEntry[] {
    return this.jobs
      .flatMap(job =>
        job.candidatos
          .filter(candidate => candidate.statusPipeline === 'entrevista')
          .map(candidate => ({ job, candidate }))
      )
      .sort((a, b) => b.candidate.aderenciaPercentual - a.candidate.aderenciaPercentual);
  }

  get filteredInterviewEntries(): ProcessEntry[] {
    const query = this.interviewQuery.trim().toLowerCase();
    if (!query) return this.interviewEntries;
    return this.interviewEntries.filter(item => {
      const hay =
        `${item.candidate.nome} ${item.job.titulo} ${item.job.empresa} ${item.job.local}`.toLowerCase();
      return hay.includes(query);
    });
  }

  get filteredApprovedEntries(): ApprovedEntry[] {
    const query = this.approvedQuery.trim().toLowerCase();
    if (!query) return this.approvedEntries;
    return this.approvedEntries.filter(item => {
      const hay =
        `${item.candidate.nome} ${item.job.titulo} ${item.job.empresa} ${item.job.local}`.toLowerCase();
      return hay.includes(query);
    });
  }

  reload(): void {
    this.jobs = this.recruiterMock.getJobs();
    if (this.selectedJobId && !this.jobs.some(j => j.id === this.selectedJobId)) {
      this.selectedJobId = null;
    }
  }

  selectJob(job: RecruiterJob): void {
    this.selectedJobId = job.id;
  }

  openCreate(): void {
    this.editorMode = 'create';
    this.editorTab = 'dados';
    this.form = this.emptyDraft();
    this.editorOpen = true;
  }

  openEdit(job: RecruiterJob): void {
    if (!this.canEditJob(job)) {
      this.openView(job);
      return;
    }
    this.editorMode = 'edit';
    this.editorTab = 'dados';
    this.form = {
      id: job.id,
      titulo: job.titulo,
      empresa: job.empresa,
      trilha: job.trilha ?? this.inferTrilhaFromJob(job),
      tipo: job.tipo ?? this.inferTipoFromTitle(job.titulo),
      local: job.local,
      modelo: job.modelo,
      departamento: job.departamento,
      metaMinimaPercentual: job.metaMinimaPercentual,
      descricao: job.descricao,
      sobreVaga: job.sobreVaga ?? '',
      diaADia: job.diaADia ?? '',
      esperamosDeVoce: job.esperamosDeVoce ?? '',
      beneficiosDetalhados: job.beneficiosDetalhados ?? '',
      sobreVagaItens: this.normalizeAboutItems(job.sobreVagaItens, job.sobreVaga),
      diaADiaItens: this.normalizeAboutItems(job.diaADiaItens, job.diaADia),
      esperamosItens: this.normalizeAboutItems(job.esperamosItens, job.esperamosDeVoce),
      valorSalario: job.valorSalario ?? '',
      diasDeposito: job.diasDeposito ?? '',
      planoSaude: job.planoSaude ?? this.healthPlanOptions[0],
      ticketRefeicao: job.ticketRefeicao ?? this.mealTicketOptions[2],
      beneficios: [...(job.beneficios ?? []).filter(item => item.toLowerCase() !== 'plano odontológico')],
      status: job.status,
      skills: [...job.skills],
    };
    this.editorOpen = true;
  }

  openView(job: RecruiterJob): void {
    this.editorMode = 'view';
    this.editorTab = 'dados';
    this.form = {
      id: job.id,
      titulo: job.titulo,
      empresa: job.empresa,
      trilha: job.trilha ?? this.inferTrilhaFromJob(job),
      tipo: job.tipo ?? this.inferTipoFromTitle(job.titulo),
      local: job.local,
      modelo: job.modelo,
      departamento: job.departamento,
      metaMinimaPercentual: job.metaMinimaPercentual,
      descricao: job.descricao,
      sobreVaga: job.sobreVaga ?? '',
      diaADia: job.diaADia ?? '',
      esperamosDeVoce: job.esperamosDeVoce ?? '',
      beneficiosDetalhados: job.beneficiosDetalhados ?? '',
      sobreVagaItens: this.normalizeAboutItems(job.sobreVagaItens, job.sobreVaga),
      diaADiaItens: this.normalizeAboutItems(job.diaADiaItens, job.diaADia),
      esperamosItens: this.normalizeAboutItems(job.esperamosItens, job.esperamosDeVoce),
      valorSalario: job.valorSalario ?? '',
      diasDeposito: job.diasDeposito ?? '',
      planoSaude: job.planoSaude ?? this.healthPlanOptions[0],
      ticketRefeicao: job.ticketRefeicao ?? this.mealTicketOptions[2],
      beneficios: [...(job.beneficios ?? []).filter(item => item.toLowerCase() !== 'plano odontológico')],
      status: job.status,
      skills: [...job.skills],
    };
    this.editorOpen = true;
  }

  closeEditor(): void {
    this.editorOpen = false;
  }

  save(): void {
    if (this.isViewMode) return;
    if (!this.form.titulo.trim() || !this.form.empresa.trim()) return;
    if (!this.form.skills.length) return;

    this.recruiterMock.upsertJob({
      ...this.form,
      titulo: this.form.titulo.trim(),
      empresa: this.form.empresa.trim(),
      trilha: (this.form.trilha ?? '').trim(),
      tipo: (this.form.tipo ?? '').trim(),
      local: this.form.local.trim(),
      modelo: this.form.modelo.trim(),
      departamento: this.form.departamento.trim(),
      descricao: this.form.descricao.trim(),
      sobreVaga: (this.form.sobreVaga ?? '').trim(),
      diaADia: (this.form.diaADia ?? '').trim(),
      esperamosDeVoce: (this.form.esperamosDeVoce ?? '').trim(),
      beneficiosDetalhados: (this.form.beneficiosDetalhados ?? '').trim(),
      sobreVagaItens: [...(this.form.sobreVagaItens ?? [])],
      diaADiaItens: [...(this.form.diaADiaItens ?? [])],
      esperamosItens: [...(this.form.esperamosItens ?? [])],
      valorSalario: (this.form.valorSalario ?? '').trim(),
      diasDeposito: (this.form.diasDeposito ?? '').trim(),
      planoSaude: (this.form.planoSaude ?? '').trim(),
      ticketRefeicao: (this.form.ticketRefeicao ?? '').trim(),
      beneficios: [...(this.form.beneficios ?? [])],
    });

    this.closeEditor();
    this.reload();
  }

  setStatus(jobId: string, status: RecruiterJobStatus): void {
    this.recruiterMock.setJobStatus(jobId, status);
    this.reload();
  }

  canEditJob(job: RecruiterJob): boolean {
    if (job.status === 'fechada') return false;
    if (job.status === 'aberta' && this.processCandidates(job).length > 0) return false;
    return true;
  }

  canReopenJob(job: RecruiterJob): boolean {
    if (job.status !== 'fechada') return true;
    return !this.hasApprovedCandidate(job);
  }

  actionPrimaryLabel(job: RecruiterJob): string {
    return this.canEditJob(job) ? 'Editar vaga' : 'Visualizar vaga';
  }

  actionToggleStatusLabel(job: RecruiterJob): string {
    if (job.status === 'fechada' && !this.canReopenJob(job)) return 'Vaga concluída';
    return job.status === 'fechada' ? 'Abrir vaga' : 'Fechar vaga';
  }

  canPauseJob(job: RecruiterJob): boolean {
    return job.status === 'aberta' && this.processCandidates(job).length === 0;
  }

  canCloseJob(job: RecruiterJob): boolean {
    return job.status !== 'fechada';
  }

  canOpenJob(job: RecruiterJob): boolean {
    if (job.status === 'pausada') return true;
    if (job.status === 'fechada') return this.canReopenJob(job);
    return false;
  }

  toggleJobMenu(jobId: string): void {
    this.actionMenuJobId = this.actionMenuJobId === jobId ? null : jobId;
  }

  closeJobMenu(): void {
    this.actionMenuJobId = null;
  }

  openPrimaryAction(job: RecruiterJob): void {
    if (this.canEditJob(job)) {
      this.openEdit(job);
    } else {
      this.openView(job);
    }
    this.closeJobMenu();
  }

  toggleJobStatus(job: RecruiterJob): void {
    if (job.status === 'fechada' && !this.canReopenJob(job)) {
      this.closeJobMenu();
      return;
    }
    const next: RecruiterJobStatus = job.status === 'fechada' ? 'aberta' : 'fechada';
    this.setStatus(job.id, next);
    this.closeJobMenu();
  }

  setJobStatusFromMenu(job: RecruiterJob, next: RecruiterJobStatus): void {
    if (next === 'aberta' && !this.canOpenJob(job)) {
      this.closeJobMenu();
      return;
    }
    if (next === 'pausada' && !this.canPauseJob(job)) {
      this.closeJobMenu();
      return;
    }
    if (next === 'fechada' && !this.canCloseJob(job)) {
      this.closeJobMenu();
      return;
    }
    this.setStatus(job.id, next);
    this.closeJobMenu();
  }

  openStatusModal(job: RecruiterJob): void {
    this.statusTargetJob = job;
    this.statusDraft = job.status;
    this.statusModalOpen = true;
  }

  closeStatusModal(): void {
    this.statusModalOpen = false;
    this.statusTargetJob = null;
  }

  confirmStatusChange(): void {
    if (!this.statusTargetJob) return;
    if (
      this.statusTargetJob.status === 'fechada' &&
      this.hasApprovedCandidate(this.statusTargetJob) &&
      this.statusDraft === 'aberta'
    ) {
      this.closeStatusModal();
      return;
    }
    this.setStatus(this.statusTargetJob.id, this.statusDraft);
    this.closeStatusModal();
  }

  statusLabel(status: RecruiterJobStatus): string {
    if (status === 'aberta') return 'Aberta';
    if (status === 'pausada') return 'Pausada';
    return 'Fechada';
  }

  jobCode(job: RecruiterJob): string {
    const digits = (job.id ?? '').replace(/\D/g, '').slice(-4);
    return digits.padStart(4, '0');
  }

  inProcessCount(job: RecruiterJob): number {
    return this.processCandidates(job).length;
  }

  showTalentsOption(job: RecruiterJob): boolean {
    return (job.candidatos?.length ?? 0) > 0 || this.processCandidates(job).length > 0;
  }

  stackAdherenceLabel(job: RecruiterJob): string {
    const highest = [...job.skills].sort((a, b) => b.minimoPercentual - a.minimoPercentual)[0];
    return `Aderência à stack principal: a partir de ${highest?.minimoPercentual ?? job.metaMinimaPercentual}%`;
  }

  openCandidatesPanel(job: RecruiterJob): void {
    this.candidatesPanelJob = job;
    this.isCandidatesPanelOpen = true;
  }

  closeCandidatesPanel(): void {
    this.isCandidatesPanelOpen = false;
    this.candidatesPanelJob = null;
  }

  openApprovedPanel(): void {
    this.isApprovedPanelOpen = true;
  }

  closeApprovedPanel(): void {
    this.isApprovedPanelOpen = false;
    this.approvedQuery = '';
  }

  openProcessPanel(): void {
    this.isProcessPanelOpen = true;
  }

  closeProcessPanel(): void {
    this.isProcessPanelOpen = false;
    this.processQuery = '';
  }

  openInterviewPanel(): void {
    this.isInterviewPanelOpen = true;
  }

  closeInterviewPanel(): void {
    this.isInterviewPanelOpen = false;
    this.interviewQuery = '';
  }

  processCandidates(job: RecruiterJob): RecruiterCandidateCard[] {
    return job.candidatos.filter(
      c =>
        c.statusPipeline !== 'novos' &&
        c.statusPipeline !== 'contratado' &&
        c.statusPipeline !== 'reprovado'
    );
  }

  nonProcessCandidates(job: RecruiterJob): RecruiterCandidateCard[] {
    return job.candidatos.filter(c => c.statusPipeline === 'contratado' || c.statusPipeline === 'reprovado');
  }

  approvedCandidate(job: RecruiterJob): RecruiterCandidateCard | null {
    return job.candidatos.find(c => c.statusPipeline === 'contratado') ?? null;
  }

  terminatedCandidate(job: RecruiterJob): RecruiterCandidateCard | null {
    if (job.status !== 'fechada') return null;
    return job.candidatos.find(c => c.statusPipeline === 'reprovado') ?? null;
  }

  hasApprovedCandidate(job: RecruiterJob): boolean {
    return job.candidatos.some(c => c.statusPipeline === 'contratado');
  }

  candidateEmail(name: string): string {
    const normalized = (name ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .join('.');
    return `@${normalized || 'candidato'}@criatti.com`;
  }

  topCandidates(job: RecruiterJob, mode: 'all' | 'process', limit = 3): RecruiterCandidateCard[] {
    const list = mode === 'process' ? this.processCandidates(job) : job.candidatos;
    return list.slice(0, limit);
  }

  topCandidateAvatars(job: RecruiterJob, mode: 'all' | 'process', limit = 4): AvatarItem[] {
    return this.topCandidates(job, mode, limit).map((candidate, idx) => ({
      name: candidate.nome,
      avatarUrl: this.avatarForCandidate(candidate, idx),
      initials: this.candidateInitials(candidate.nome),
    }));
  }

  extraCandidatesCount(job: RecruiterJob, mode: 'all' | 'process', limit = 3): number {
    const list = mode === 'process' ? this.processCandidates(job) : job.candidatos;
    return Math.max(0, list.length - limit);
  }

  candidateInitials(name: string): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
  }

  radarAverageFit(mode: 'active' | 'process' | 'conversation'): number {
    const list = this.radarCandidates(mode);
    if (!list.length) return mode === 'active' ? 85 : 82;
    return Math.round(list.reduce((sum, candidate) => sum + candidate.aderenciaPercentual, 0) / list.length);
  }

  radarGrowth(mode: 'active' | 'process' | 'conversation'): number {
    const base =
      mode === 'active'
        ? this.radarActiveTalents
        : mode === 'process'
          ? this.processEntries.length
          : this.interviewEntries.length;
    return Math.max(2, Math.min(18, Math.round(base * 0.7)));
  }

  jobWeeklyTrend(job: RecruiterJob): number {
    const factor = job.metaMinimaPercentual + job.candidatos.length * 2 + this.inProcessCount(job) * 3;
    return Math.max(2, Math.min(12, Math.round(factor % 11)));
  }

  jobMicroSignal(job: RecruiterJob): string {
    if (job.status === 'pausada') return '⚠ risco de perda';
    if (job.status === 'fechada') return '🔥 atividade recente';
    if (this.inProcessCount(job) >= 3) return '🔥 em alta';
    return '🎓 nova certificação';
  }

  avatarForCandidate(candidate: RecruiterCandidateCard, salt = 0): string {
    const hash = (candidate.id ?? candidate.nome ?? '')
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = Math.abs(hash + salt) % this.avatarPool.length;
    return `https://i.pravatar.cc/96?img=${this.avatarPool[index]}`;
  }

  onAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (!target) return;
    if (target.src.includes('avatar-default.png')) return;
    target.src = 'assets/avatar-default.png';
  }

  private estimatedJobValue(job: RecruiterJob): number {
    const title = `${job.titulo} ${job.departamento}`.toLowerCase();
    if (title.includes('senior') || title.includes('sênior')) return 18000;
    if (title.includes('pleno')) return 13000;
    if (title.includes('ux')) return 11500;
    if (title.includes('dados') || title.includes('data')) return 12000;
    return 10000;
  }

  private radarCandidates(mode: 'active' | 'process' | 'conversation'): RecruiterCandidateCard[] {
    if (mode === 'process') {
      return this.processEntries.map(item => item.candidate);
    }
    if (mode === 'conversation') {
      return this.interviewEntries.map(item => item.candidate);
    }
    return this.filteredJobs.flatMap(job =>
      job.candidatos.filter(candidate => candidate.aderenciaPercentual >= job.metaMinimaPercentual)
    );
  }

  openRadarStage(stage: 'active' | 'evolution' | 'conversation'): void {
    if (stage === 'active') {
      this.openApprovedPanel();
      return;
    }
    if (stage === 'evolution') {
      this.openProcessPanel();
      return;
    }
    this.openInterviewPanel();
  }

  openJobTalents(job: RecruiterJob): void {
    void this.router.navigate(['/recruiter/talentos'], { queryParams: { jobId: job.id } });
  }

  badgeToneByStatus(status: RecruiterJobStatus): 'green' | 'amber' | 'red' {
    if (status === 'aberta') return 'green';
    if (status === 'pausada') return 'amber';
    return 'red';
  }

  private readyCandidatesCount(job: RecruiterJob): number {
    return job.candidatos.filter(c => c.aderenciaPercentual >= job.metaMinimaPercentual).length;
  }

  private stageCount(job: RecruiterJob, stages: RecruiterPipelineStage[]): number {
    return job.candidatos.filter(c => stages.includes(c.statusPipeline)).length;
  }

  private jobRiskLevel(job: RecruiterJob): 'ok' | 'warning' | 'critical' {
    if (job.status !== 'aberta') return 'ok';
    const ready = this.readyCandidatesCount(job);
    const inProcess = this.processCandidates(job).length;
    if (ready === 0 && inProcess < 2) return 'critical';
    if (ready < 2) return 'warning';
    return 'ok';
  }

  formatLocationBrazil(raw: string): string {
    const value = (raw ?? '').trim();
    if (!value) return 'Brasil';

    if (value.toLowerCase().includes('são paulo')) return 'São Paulo SP - Brasil';
    if (value.toLowerCase().includes('rio de janeiro')) return 'Rio de Janeiro RJ - Brasil';
    if (value.toLowerCase().includes('belo horizonte')) return 'Belo Horizonte MG - Brasil';
    if (value.toLowerCase().includes('recife')) return 'Recife PE - Brasil';
    if (value.toLowerCase().includes('curitiba')) return 'Curitiba PR - Brasil';

    const city = value.replace(/\(.*\)/g, '').trim();
    return `${city} - Brasil`;
  }

  hiringBenefitsLabel(job: RecruiterJob): string {
    const local = (job.local ?? '').toLowerCase();
    if (local.includes('híbrido') || local.includes('hibrido')) return 'Híbrido';
    if (local.includes('remoto')) return 'Remoto';
    if (local.includes('presencial')) return 'Presencial';
    return 'Híbrido';
  }

  stateLabelFromLocal(raw: string): string {
    const value = (raw ?? '').toLowerCase();
    if (value.includes('são paulo') || value.includes('sao paulo')) return 'São Paulo - SP';
    if (value.includes('rio de janeiro')) return 'Rio de Janeiro - RJ';
    if (value.includes('belo horizonte') || value.includes('minas gerais')) return 'Minas Gerais - MG';
    if (value.includes('recife') || value.includes('pernambuco')) return 'Pernambuco - PE';
    if (value.includes('curitiba') || value.includes('paraná') || value.includes('parana')) return 'Paraná - PR';
    return 'Brasil - BR';
  }

  setRoleFilter(value: 'all' | 'ux' | 'backend' | 'frontend' | 'fullstack' | 'dados'): void {
    this.roleFilter = value;
  }

  clearAllFilters(): void {
    this.roleFilter = 'all';
    this.jobQuery = '';
    this.selectedCategories = [];
    this.selectedStates = [];
    this.selectedWorkModes = [];
    this.selectedStatuses = [];
  }

  openFiltersPanel(): void {
    this.isFiltersPanelOpen = true;
  }

  closeFiltersPanel(): void {
    this.isFiltersPanelOpen = false;
  }

  isCategorySelected(value: RoleFilter): boolean {
    return this.selectedCategories.includes(value);
  }

  toggleCategory(value: RoleFilter): void {
    if (this.isCategorySelected(value)) {
      this.selectedCategories = this.selectedCategories.filter(item => item !== value);
      return;
    }
    this.selectedCategories = [...this.selectedCategories, value];
  }

  isStatusSelected(value: RecruiterJobStatus): boolean {
    return this.selectedStatuses.includes(value);
  }

  toggleStatus(value: RecruiterJobStatus): void {
    if (this.isStatusSelected(value)) {
      this.selectedStatuses = this.selectedStatuses.filter(item => item !== value);
      return;
    }
    this.selectedStatuses = [...this.selectedStatuses, value];
  }

  isStateSelected(value: string): boolean {
    return this.selectedStates.includes(value);
  }

  toggleState(value: string, checked: boolean): void {
    if (checked) {
      if (!this.selectedStates.includes(value)) {
        this.selectedStates = [...this.selectedStates, value];
      }
      return;
    }
    this.selectedStates = this.selectedStates.filter(item => item !== value);
  }

  isWorkModeSelected(value: WorkMode): boolean {
    return this.selectedWorkModes.includes(value);
  }

  toggleWorkMode(value: WorkMode): void {
    if (this.isWorkModeSelected(value)) {
      this.selectedWorkModes = this.selectedWorkModes.filter(item => item !== value);
      return;
    }
    this.selectedWorkModes = [...this.selectedWorkModes, value];
  }

  addSkill(): void {
    const nome = this.skillNome.trim();
    if (!nome) return;

    const skill: RecruiterSkillRequirement = {
      nome,
      peso: Number(this.skillPeso),
      minimoPercentual: Number(this.skillMinimo),
    };

    this.form.skills = [...this.form.skills, skill];
    this.skillNome = '';
    this.skillPeso = 25;
    this.skillMinimo = 70;
  }

  get filteredStackOptions(): string[] {
    const selected = new Set(this.form.skills.map(s => s.nome.toLowerCase()));
    return this.stackCatalog
      .filter(name => !selected.has(name.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .slice(0, 50);
  }

  addStackFromSearch(name?: string): void {
    const raw = (name ?? this.stackSearch).trim();
    if (!raw) return;
    const existing = this.form.skills.some(s => s.nome.toLowerCase() === raw.toLowerCase());
    if (existing) return;
    this.form.skills = [
      ...this.form.skills,
      {
        nome: raw,
        peso: 25,
        minimoPercentual: 70,
      },
    ];
    this.stackSearch = '';
  }

  removeSkill(index: number): void {
    this.form.skills = this.form.skills.filter((_, i) => i !== index);
  }


  setEditorTab(tab: 'dados' | 'contratacao' | 'sobre'): void {
    this.editorTab = tab;
  }

  hasBenefit(item: string): boolean {
    return (this.form.beneficios ?? []).includes(item);
  }

  toggleBenefit(item: string, checked: boolean): void {
    const current = new Set(this.form.beneficios ?? []);
    if (checked) {
      current.add(item);
    } else {
      current.delete(item);
    }
    this.form.beneficios = [...current];
  }

  aboutItems(section: AboutSectionKey): string[] {
    if (section === 'sobre') return [...(this.form.sobreVagaItens ?? [])];
    if (section === 'dia') return [...(this.form.diaADiaItens ?? [])];
    return [...(this.form.esperamosItens ?? [])];
  }

  addAboutItem(section: AboutSectionKey): void {
    if (this.isViewMode) return;
    const value = (this.aboutDrafts[section] ?? '').trim();
    if (!value) return;
    const current = this.aboutItems(section);
    if (current.some(item => item.toLowerCase() === value.toLowerCase())) return;
    const next = [...current, value];
    this.setAboutItems(section, next);
    this.aboutDrafts[section] = '';
  }

  removeAboutItem(section: AboutSectionKey, index: number): void {
    if (this.isViewMode) return;
    const next = this.aboutItems(section).filter((_, i) => i !== index);
    this.setAboutItems(section, next);
  }

  get selectedDentalPlan(): string {
    const items = this.form.beneficios ?? [];
    return items.find(item => item.startsWith('Plano Odontológico:')) ?? this.dentalPlanOptions[0];
  }

  set selectedDentalPlan(value: string) {
    const base = (this.form.beneficios ?? []).filter(item => !item.startsWith('Plano Odontológico:'));
    if (value && value !== this.dentalPlanOptions[0]) {
      this.form.beneficios = [...base, `Plano Odontológico: ${value}`];
      return;
    }
    this.form.beneficios = base;
  }

  candidatesByStage(job: RecruiterJob, stage: RecruiterPipelineStage): RecruiterCandidateCard[] {
    return job.candidatos.filter(c => c.statusPipeline === stage);
  }

  moveCandidate(job: RecruiterJob, candidateId: string, stage: RecruiterPipelineStage): void {
    this.recruiterMock.moveCandidate(job.id, candidateId, stage);
    this.reload();
  }

  stageLabel(stage: RecruiterPipelineStage): string {
    return this.pipelineStages.find(s => s.value === stage)?.label ?? stage;
  }

  trendLabel(value: RecruiterCandidateCard['tendencia']): string {
    if (value === 'up') return 'Subindo';
    if (value === 'down') return 'Caindo';
    return 'Estável';
  }

  private emptyDraft(): RecruiterJobDraft {
    return {
      titulo: '',
      empresa: '',
      trilha: 'Backend',
      tipo: 'Pleno',
      local: '',
      modelo: 'CLT',
      departamento: '',
      metaMinimaPercentual: 80,
      descricao: '',
      sobreVaga: '',
      diaADia: '',
      esperamosDeVoce: '',
      beneficiosDetalhados: '',
      sobreVagaItens: [],
      diaADiaItens: [],
      esperamosItens: [],
      valorSalario: '',
      diasDeposito: '5º dia útil',
      planoSaude: 'Sem plano',
      ticketRefeicao: 'R$ 38,00 por dia útil',
      beneficios: ['Vale Transporte'],
      status: 'aberta',
      skills: [],
    };
  }

  private inferTipoFromTitle(title: string): string {
    const value = (title ?? '').toLowerCase();
    if (value.includes('sênior') || value.includes('senior')) return 'Sênior';
    if (value.includes('júnior') || value.includes('junior')) return 'Júnior';
    if (value.includes('estagi')) return 'Estagiário';
    if (value.includes('especialista')) return 'Especialista';
    if (value.includes('líder') || value.includes('lider')) return 'Líder Técnico';
    return 'Pleno';
  }

  private inferTrilhaFromJob(job: RecruiterJob): string {
    const hay = `${job.titulo} ${job.departamento}`.toLowerCase();
    if (hay.includes('front') || hay.includes('angular') || hay.includes('react') || hay.includes('vue')) return 'Frontend';
    if (hay.includes('full') || hay.includes('fullstack') || hay.includes('full stack')) return 'Full Stack';
    if (hay.includes('dados') || hay.includes('data') || hay.includes('bi')) return 'Dados';
    if (hay.includes('ux') || hay.includes('design')) return 'UX';
    if (hay.includes('mobile') || hay.includes('android') || hay.includes('ios')) return 'Mobile';
    if (hay.includes('devops') || hay.includes('sre') || hay.includes('infra')) return 'DevOps';
    if (hay.includes('qa') || hay.includes('teste')) return 'QA';
    return 'Backend';
  }

  private setAboutItems(section: AboutSectionKey, items: string[]): void {
    if (section === 'sobre') {
      this.form.sobreVagaItens = items;
      return;
    }
    if (section === 'dia') {
      this.form.diaADiaItens = items;
      return;
    }
    this.form.esperamosItens = items;
  }

  private normalizeAboutItems(items?: string[], fallbackText?: string): string[] {
    if (Array.isArray(items) && items.length) return [...items];
    const raw = (fallbackText ?? '').trim();
    if (!raw) return [];
    return raw
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }

  private matchesRoleFilter(
    job: RecruiterJob,
    role: RoleFilter
  ): boolean {
    if (role === 'all') return true;
    const hay = `${job.trilha ?? ''} ${job.titulo} ${job.departamento}`.toLowerCase();
    if (role === 'ux') return hay.includes('ux') || hay.includes('designer') || hay.includes('produto');
    if (role === 'backend') return hay.includes('backend') || hay.includes('.net') || hay.includes('java');
    if (role === 'frontend') return hay.includes('frontend') || hay.includes('angular') || hay.includes('react');
    if (role === 'fullstack') return hay.includes('full stack') || hay.includes('fullstack');
    if (role === 'dados') return hay.includes('dados') || hay.includes('data') || hay.includes('analytics');
    return true;
  }

  private matchesStateFilter(job: RecruiterJob, state: string): boolean {
    const local = (job.local ?? '').toLowerCase();
    if (state === 'sp') return local.includes('são paulo') || local.includes('sao paulo');
    if (state === 'rj') return local.includes('rio de janeiro');
    if (state === 'mg') return local.includes('belo horizonte') || local.includes('minas gerais');
    if (state === 'pe') return local.includes('recife') || local.includes('pernambuco');
    if (state === 'pr') return local.includes('curitiba') || local.includes('paraná') || local.includes('parana');
    return true;
  }

  private matchesWorkModeFilter(job: RecruiterJob, mode: WorkMode): boolean {
    const local = (job.local ?? '').toLowerCase();
    if (mode === 'remoto') return local.includes('remoto');
    if (mode === 'hibrido') return local.includes('híbrido') || local.includes('hibrido');
    if (mode === 'presencial') return local.includes('presencial');
    return true;
  }

  trackByJobId(_: number, job: RecruiterJob): string {
    return job.id;
  }

  trackByCandidateId(_: number, candidate: RecruiterCandidateCard): string {
    return candidate.id;
  }

  trackByApprovedEntry(_: number, item: ApprovedEntry): string {
    return `${item.job.id}-${item.candidate.id}`;
  }

  trackByProcessEntry(_: number, item: ProcessEntry): string {
    return `${item.job.id}-${item.candidate.id}`;
  }
}
