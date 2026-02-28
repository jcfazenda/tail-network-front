import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  RecruiterCandidateCard,
  RecruiterJob,
  RecruiterJobDraft,
  RecruiterJobStatus,
  RecruiterPipelineStage,
  RecruiterSkillRequirement,
} from '../../models/recruiter.models';
import { RecruiterMockService } from '../../../services/recruiter-mock.service';
import { JobsAnalyticsComponent } from '../../components/jobs-analytics/jobs-analytics.component';

type StageOption = { value: RecruiterPipelineStage; label: string };
type AboutSectionKey = 'sobre' | 'dia' | 'esperamos';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, JobsAnalyticsComponent],
  templateUrl: './recruiter-jobs.page.html',
  styleUrls: ['./recruiter-jobs.page.scss'],
})
export class RecruiterJobsPage implements OnInit {
  jobs: RecruiterJob[] = [];
  selectedJobId: string | null = null;
  roleFilter: 'all' | 'ux' | 'backend' | 'frontend' | 'fullstack' | 'dados' = 'all';

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

  private readonly stackMonthlyMock: Record<string, number[]> = {
    dotnet: [1, 2, 1, 3, 2, 4, 3, 2, 3, 4, 3, 5],
    java: [0, 1, 2, 1, 2, 2, 3, 2, 1, 2, 2, 3],
    angular: [1, 1, 1, 2, 1, 2, 2, 1, 2, 2, 1, 2],
    react: [1, 1, 2, 1, 2, 3, 2, 2, 2, 3, 2, 3],
    python: [0, 1, 1, 2, 2, 2, 3, 3, 2, 2, 3, 4],
    node: [0, 1, 1, 1, 2, 2, 1, 2, 2, 2, 2, 3],
    sql: [1, 2, 2, 2, 3, 3, 2, 3, 3, 3, 3, 4],
  };

  constructor(private readonly recruiterMock: RecruiterMockService) {}

  ngOnInit(): void {
    this.reload();
  }

  get isViewMode(): boolean {
    return this.editorMode === 'view';
  }

  get openJobsCount(): number {
    return this.jobs.filter(j => j.status === 'aberta').length;
  }

  get totalCandidatesCount(): number {
    return this.jobs.reduce((acc, job) => acc + (job.candidatos?.length ?? 0), 0);
  }

  get activeCandidatesCount(): number {
    return this.jobs
      .filter(job => job.status === 'aberta')
      .reduce((acc, job) => acc + (job.candidatos?.length ?? 0), 0);
  }

  get avgAdherenceActivePercent(): number {
    const activeJobs = this.jobs.filter(job => job.status === 'aberta');
    const values = activeJobs.flatMap(job => (job.candidatos ?? []).map(c => c.aderenciaPercentual));
    if (!values.length) return 0;
    return Math.round(values.reduce((acc, v) => acc + v, 0) / values.length);
  }

  get hiringPipelineCount(): number {
    return this.jobs.reduce((acc, job) => acc + this.processCandidates(job).length, 0);
  }

  get hiredCount(): number {
    return this.jobs.reduce((acc, job) => acc + this.stageCount(job, ['contratado']), 0);
  }

  get pausedJobsCount(): number {
    return this.jobs.filter(j => j.status === 'pausada').length;
  }

  get closedJobsCount(): number {
    return this.jobs.filter(j => j.status === 'fechada').length;
  }

  get avgJobsValueNumber(): number {
    if (!this.jobs.length) return 0;
    return this.jobs.reduce((acc, job) => acc + this.estimatedJobValue(job), 0) / this.jobs.length;
  }

  get activityLabels(): string[] {
    return ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  }

  get activitySeries(): Array<{ key: string; color: string; values: number[] }> {
    return [
      {
        key: 'dotnet',
        color: '#5b4acb',
        values: [...this.stackMonthlyMock['dotnet']],
      },
      {
        key: 'java',
        color: '#34a7d6',
        values: [...this.stackMonthlyMock['java']],
      },
      {
        key: 'angular',
        color: '#f5b300',
        values: [...this.stackMonthlyMock['angular']],
      },
      {
        key: 'react',
        color: '#14b8a6',
        values: [...this.stackMonthlyMock['react']],
      },
      {
        key: 'python',
        color: '#f97316',
        values: [...this.stackMonthlyMock['python']],
      },
      {
        key: 'node',
        color: '#84cc16',
        values: [...this.stackMonthlyMock['node']],
      },
      {
        key: 'sql',
        color: '#ef4444',
        values: [...this.stackMonthlyMock['sql']],
      },
    ];
  }

  get readyTalentsCount(): number {
    return this.jobs.reduce((acc, job) => acc + this.readyCandidatesCount(job), 0);
  }

  get avgTriageHours(): number {
    const open = Math.max(1, this.openJobsCount);
    return Math.round((this.hiringPipelineCount * 4 + this.totalCandidatesCount * 1.5) / open);
  }

  get riskCount(): number {
    return this.jobs.filter(job => this.jobRiskLevel(job) !== 'ok').length;
  }

  get funnelStages(): Array<{ label: string; pct: number; count: number; avgTime: string; risk?: boolean }> {
    const total = Math.max(1, this.totalCandidatesCount);
    const withFit = this.readyTalentsCount;
    const contacted = this.jobs.reduce((acc, job) => acc + this.stageCount(job, ['contato', 'entrevista', 'oferta', 'contratado']), 0);
    const interviewed = this.jobs.reduce((acc, job) => acc + this.stageCount(job, ['entrevista', 'oferta', 'contratado']), 0);
    const offers = this.jobs.reduce((acc, job) => acc + this.stageCount(job, ['oferta', 'contratado']), 0);
    const hired = this.jobs.reduce((acc, job) => acc + this.stageCount(job, ['contratado']), 0);
    return [
      { label: 'Abertas', count: this.openJobsCount, pct: Math.round((this.openJobsCount / Math.max(1, this.jobs.length)) * 100), avgTime: '1.8d' },
      { label: 'Com fit >= meta', count: withFit, pct: Math.round((withFit / total) * 100), avgTime: '2.3d' },
      { label: 'Contatados', count: contacted, pct: Math.round((contacted / total) * 100), avgTime: '2.9d' },
      { label: 'Entrevista', count: interviewed, pct: Math.round((interviewed / total) * 100), avgTime: '4.1d', risk: interviewed > offers * 2 },
      { label: 'Oferta', count: offers, pct: Math.round((offers / total) * 100), avgTime: '2.0d' },
      { label: 'Contratado', count: hired, pct: Math.round((hired / total) * 100), avgTime: '1.2d' },
    ];
  }

  get filteredJobs(): RecruiterJob[] {
    let list = [...this.jobs];
    if (this.roleFilter !== 'all') {
      list = list.filter(job => this.matchesRoleFilter(job, this.roleFilter));
    }
    return list;
  }

  get selectedJob(): RecruiterJob | null {
    if (!this.selectedJobId) return null;
    return this.jobs.find(job => job.id === this.selectedJobId) ?? null;
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

  private estimatedJobValue(job: RecruiterJob): number {
    const title = `${job.titulo} ${job.departamento}`.toLowerCase();
    if (title.includes('senior') || title.includes('sênior')) return 18000;
    if (title.includes('pleno')) return 13000;
    if (title.includes('ux')) return 11500;
    if (title.includes('dados') || title.includes('data')) return 12000;
    return 10000;
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

  setRoleFilter(value: 'all' | 'ux' | 'backend' | 'frontend' | 'fullstack' | 'dados'): void {
    this.roleFilter = value;
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
    role: 'all' | 'ux' | 'backend' | 'frontend' | 'fullstack' | 'dados'
  ): boolean {
    if (role === 'all') return true;
    const hay = `${job.titulo} ${job.departamento}`.toLowerCase();
    if (role === 'ux') return hay.includes('ux') || hay.includes('designer') || hay.includes('produto');
    if (role === 'backend') return hay.includes('backend') || hay.includes('.net') || hay.includes('java');
    if (role === 'frontend') return hay.includes('frontend') || hay.includes('angular') || hay.includes('react');
    if (role === 'fullstack') return hay.includes('full stack') || hay.includes('fullstack');
    if (role === 'dados') return hay.includes('dados') || hay.includes('data') || hay.includes('analytics');
    return true;
  }

  trackByJobId(_: number, job: RecruiterJob): string {
    return job.id;
  }

  trackByCandidateId(_: number, candidate: RecruiterCandidateCard): string {
    return candidate.id;
  }
}
