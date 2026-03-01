import { Injectable } from '@angular/core';
import {
  RecruiterCandidateCard,
  RecruiterAlert,
  RecruiterDashboardData,
  RecruiterDb,
  RecruiterJob,
  RecruiterJobDraft,
  RecruiterJobStatus,
  RecruiterPipelineStage,
  RecruiterTalent,
} from '../recruiter/models/recruiter.models';

@Injectable({ providedIn: 'root' })
export class RecruiterMockService {
  private readonly storageKey = 'tailworks.recruiter.db.v2';

  getDashboardData(): RecruiterDashboardData {
    const db = this.loadDb();

    const talentosProntos = db.talents.filter(t => t.aderenciaMedia >= 85).length;
    const talentosAscensao = db.talents.filter(t => t.crescimento30Dias >= 8 || t.crescimento60Dias >= 12).length;
    const vagasAbertas = db.jobs.filter(j => j.status === 'aberta').length;

    const vagasCriticas = db.jobs.filter(job => {
      if (job.status !== 'aberta') return false;
      const acimaMeta = job.candidatos.filter(c => c.aderenciaPercentual >= job.metaMinimaPercentual).length;
      return acimaMeta < 2;
    });

    const dynamicAlerts = this.buildDynamicAlerts(db.jobs);
    const allAlerts = [...dynamicAlerts, ...db.alerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      metrics: {
        talentosProntos,
        talentosAscensao,
        vagasCriticas: vagasCriticas.length,
        alertas: allAlerts.length,
        vagasAbertas,
      },
      vagasCriticas,
      alertas: allAlerts.slice(0, 8),
    };
  }

  getJobs(): RecruiterJob[] {
    return this.loadDb().jobs;
  }

  getOpenJobs(): RecruiterJob[] {
    return this.getJobs().filter(job => job.status === 'aberta');
  }

  getJobById(jobId: string): RecruiterJob | undefined {
    return this.getJobs().find(j => j.id === jobId);
  }

  upsertJob(draft: RecruiterJobDraft): RecruiterJob {
    const db = this.loadDb();

    if (draft.id) {
      const nextJobs = db.jobs.map(job => {
        if (job.id !== draft.id) return job;
        return {
          ...job,
          ...draft,
        };
      });
      const updated = nextJobs.find(j => j.id === draft.id);
      if (!updated) {
        throw new Error('Vaga não encontrada para edição.');
      }
      this.saveDb({ ...db, jobs: nextJobs, updatedAt: new Date().toISOString() });
      return updated;
    }

    const created: RecruiterJob = {
      id: this.createId('job'),
      ...draft,
      candidatos: [],
      createdAt: new Date().toISOString(),
    };

    this.saveDb({
      ...db,
      jobs: [created, ...db.jobs],
      updatedAt: new Date().toISOString(),
    });

    return created;
  }

  setJobStatus(jobId: string, status: RecruiterJobStatus): void {
    const db = this.loadDb();
    const jobs = db.jobs.map(job => (job.id === jobId ? { ...job, status } : job));
    this.saveDb({ ...db, jobs, updatedAt: new Date().toISOString() });
  }

  moveCandidate(jobId: string, candidateId: string, stage: RecruiterPipelineStage): void {
    const db = this.loadDb();
    const jobs = db.jobs.map(job => {
      if (job.id !== jobId) return job;
      const candidatos = job.candidatos.map(c => {
        if (c.id !== candidateId) return c;
        return {
          ...c,
          statusPipeline: stage,
          ultimaAtualizacao: new Date().toISOString(),
        };
      });
      return { ...job, candidatos };
    });

    this.saveDb({ ...db, jobs, updatedAt: new Date().toISOString() });
  }

  getTalents(filters?: {
    query?: string;
    local?: string;
    minAderencia?: number;
  }): RecruiterTalent[] {
    const db = this.loadDb();
    const query = (filters?.query ?? '').trim().toLowerCase();
    const local = (filters?.local ?? '').trim().toLowerCase();
    const minAderencia = Number.isFinite(filters?.minAderencia)
      ? Number(filters?.minAderencia)
      : 0;

    return db.talents.filter(t => {
      if (query) {
        const hay = `${t.nome} ${t.cargoAtual} ${t.local}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (local && !t.local.toLowerCase().includes(local)) return false;
      if (t.aderenciaMedia < minAderencia) return false;
      return true;
    });
  }

  inviteTalentToJob(talentId: string, jobId: string): void {
    const db = this.loadDb();
    const talent = db.talents.find(t => t.id === talentId);
    if (!talent) return;

    const jobs = db.jobs.map(job => {
      if (job.id !== jobId) return job;
      const exists = job.candidatos.some(c => c.id === talent.id);
      if (exists) return job;

      const candidate = {
        id: talent.id,
        nome: talent.nome,
        aderenciaPercentual: talent.aderenciaMedia,
        tendencia: talent.tendencia,
        ultimaAtualizacao: new Date().toISOString(),
        statusPipeline: 'novos' as const,
      };

      return { ...job, candidatos: [candidate, ...job.candidatos] };
    });

    const alert: RecruiterAlert = {
      id: this.createId('alert'),
      tipo: 'candidato-quente',
      mensagem: `${talent.nome} foi convidado para uma vaga.`,
      talentId,
      jobId,
      createdAt: new Date().toISOString(),
    };

    this.saveDb({
      ...db,
      jobs,
      alerts: [alert, ...db.alerts].slice(0, 30),
      updatedAt: new Date().toISOString(),
    });
  }

  startHiringRequest(talentId: string, jobId?: string): void {
    const db = this.loadDb();
    const talent = db.talents.find(t => t.id === talentId);
    if (!talent) return;

    const alert: RecruiterAlert = {
      id: this.createId('alert'),
      tipo: 'solicitacao-contratacao',
      mensagem: `Solicitação de contratação iniciada para ${talent.nome}.`,
      talentId,
      jobId,
      createdAt: new Date().toISOString(),
    };

    this.saveDb({
      ...db,
      alerts: [alert, ...db.alerts].slice(0, 30),
      updatedAt: new Date().toISOString(),
    });
  }

  private loadDb(): RecruiterDb {
    if (typeof window === 'undefined') {
      return this.seedDb();
    }

    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) {
      const seeded = this.seedDb();
      this.saveDb(seeded);
      return seeded;
    }

    try {
      const parsed = JSON.parse(raw) as RecruiterDb;
      const normalized = this.normalizeDb(parsed);
      if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
        this.saveDb(normalized);
      }
      return normalized;
    } catch {
      const seeded = this.seedDb();
      this.saveDb(seeded);
      return seeded;
    }
  }

  private saveDb(db: RecruiterDb): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.storageKey, JSON.stringify(db));
  }

  private buildDynamicAlerts(jobs: RecruiterJob[]): RecruiterAlert[] {
    const now = new Date().toISOString();
    const hotCandidates = jobs
      .flatMap(job =>
        job.candidatos
          .filter(c => c.aderenciaPercentual >= 90 && c.tendencia === 'up')
          .map(candidate => ({ job, candidate }))
      )
      .slice(0, 4)
      .map(({ job, candidate }) => ({
        id: this.createId('alert-dyn'),
        tipo: 'candidato-quente' as const,
        mensagem: `${candidate.nome} está quente para ${job.titulo} (${candidate.aderenciaPercentual}%).`,
        jobId: job.id,
        talentId: candidate.id,
        createdAt: now,
      }));

    return hotCandidates;
  }

  private createId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private normalizeDb(db: RecruiterDb): RecruiterDb {
    const legacyMap: Record<string, string> = {
      'NTT DATA': 'Banco Itaú',
      'Compass UOL': 'Santander Brasil',
      TIVIT: 'Energisa',
      BRQ: 'Banco Itaú',
      'BRQ Solutions': 'Banco Itaú',
    };

    const clientFallback = ['Banco Itaú', 'Santander Brasil', 'Energisa'];
    let fallbackIndex = 0;

    const jobs = (db.jobs ?? []).map(job => {
      const current = (job.empresa ?? '').trim();
      const mappedLegacy = legacyMap[current];
      const normalizedCompany = mappedLegacy || current || clientFallback[fallbackIndex++ % clientFallback.length];
      let normalizedCandidates = this.ensureRichCandidates(job);
      if (job.status === 'fechada' && !normalizedCandidates.some(c => c.statusPipeline === 'contratado')) {
        normalizedCandidates = [
          {
            id: `tal-approved-${job.id}`,
            nome: 'Ana Martins',
            aderenciaPercentual: Math.max(job.metaMinimaPercentual + 3, 86),
            tendencia: 'up',
            ultimaAtualizacao: new Date().toISOString(),
            statusPipeline: 'contratado',
          },
          ...normalizedCandidates,
        ];
      }
      return {
        ...job,
        empresa: normalizedCompany,
        candidatos: normalizedCandidates,
      };
    });

    const closedJobs = jobs.filter(job => job.status === 'fechada').length;
    if (closedJobs < 2) {
      const now = new Date().toISOString();
      const extras: RecruiterJob[] = [
        {
          id: 'job-104',
          titulo: 'Data Engineer Pleno',
          empresa: 'Banco Itaú',
          local: 'São Paulo (Híbrido)',
          modelo: 'CLT',
          departamento: 'Dados',
          metaMinimaPercentual: 80,
          descricao: 'Vaga finalizada após contratação concluída para projeto de dados corporativos.',
          status: 'fechada',
          skills: [
            { nome: 'Python', peso: 35, minimoPercentual: 78 },
            { nome: 'SQL', peso: 35, minimoPercentual: 80 },
            { nome: 'Airflow', peso: 30, minimoPercentual: 72 },
          ],
          candidatos: [
            { id: 'tal-001', nome: 'Ana Martins', aderenciaPercentual: 89, tendencia: 'up', ultimaAtualizacao: now, statusPipeline: 'contratado' },
            { id: 'tal-005', nome: 'Eduarda Nunes', aderenciaPercentual: 73, tendencia: 'flat', ultimaAtualizacao: now, statusPipeline: 'reprovado' },
          ],
          createdAt: '2026-01-08T10:00:00.000Z',
        },
        {
          id: 'job-105',
          titulo: 'DevOps Engineer',
          empresa: 'Santander Brasil',
          local: 'Remoto',
          modelo: 'PJ',
          departamento: 'Infraestrutura',
          metaMinimaPercentual: 82,
          descricao: 'Processo encerrado após preenchimento da posição com aprovação final.',
          status: 'fechada',
          skills: [
            { nome: 'AWS', peso: 40, minimoPercentual: 82 },
            { nome: 'Terraform', peso: 30, minimoPercentual: 75 },
            { nome: 'Kubernetes', peso: 30, minimoPercentual: 78 },
          ],
          candidatos: [
            { id: 'tal-002', nome: 'Bruno Teixeira', aderenciaPercentual: 87, tendencia: 'up', ultimaAtualizacao: now, statusPipeline: 'contratado' },
            { id: 'tal-003', nome: 'Camila Rocha', aderenciaPercentual: 76, tendencia: 'flat', ultimaAtualizacao: now, statusPipeline: 'reprovado' },
          ],
          createdAt: '2026-01-20T15:30:00.000Z',
        },
      ];

      const existingIds = new Set(jobs.map(job => job.id));
      for (const extra of extras) {
        if (!existingIds.has(extra.id)) {
          jobs.push(extra);
          existingIds.add(extra.id);
        }
      }
    }

    if (!jobs.some(job => job.id === 'job-106')) {
      jobs.push({
        id: 'job-106',
        titulo: 'Backend Java Júnior',
        empresa: 'Energisa',
        local: 'Belo Horizonte (Híbrido)',
        modelo: 'CLT',
        departamento: 'Tecnologia',
        metaMinimaPercentual: 78,
        descricao: 'Vaga recém-aberta aguardando início do pipeline de candidaturas.',
        status: 'aberta',
        skills: [
          { nome: 'Java', peso: 40, minimoPercentual: 75 },
          { nome: 'Spring', peso: 35, minimoPercentual: 72 },
          { nome: 'SQL', peso: 25, minimoPercentual: 70 },
        ],
        candidatos: [],
        createdAt: '2026-02-27T10:20:00.000Z',
      });
    }

    if (!jobs.some(job => job.id === 'job-107')) {
      jobs.push({
        id: 'job-107',
        titulo: 'QA Analyst Pleno',
        empresa: 'Bradesco',
        local: 'Curitiba (Híbrido)',
        modelo: 'CLT',
        departamento: 'Qualidade',
        metaMinimaPercentual: 80,
        descricao: 'Vaga fechada após desligamento no ciclo final do processo.',
        status: 'fechada',
        skills: [
          { nome: 'QA', peso: 40, minimoPercentual: 78 },
          { nome: 'API Test', peso: 35, minimoPercentual: 76 },
          { nome: 'Playwright', peso: 25, minimoPercentual: 72 },
        ],
        candidatos: [
          { id: 'tal-004', nome: 'Daniel Lima', aderenciaPercentual: 84, tendencia: 'up', ultimaAtualizacao: new Date().toISOString(), statusPipeline: 'contratado' },
          { id: 'tal-006', nome: 'Fernanda Alves', aderenciaPercentual: 82, tendencia: 'flat', ultimaAtualizacao: new Date().toISOString(), statusPipeline: 'reprovado' },
        ],
        createdAt: '2026-02-11T09:10:00.000Z',
      });
    }

    return {
      ...db,
      jobs,
    };
  }

  private ensureRichCandidates(job: RecruiterJob): RecruiterCandidateCard[] {
    const now = new Date().toISOString();
    const existingIds = new Set((job.candidatos ?? []).map(c => c.id));
    const base = [...(job.candidatos ?? [])];

    const extrasByJob: Record<string, RecruiterCandidateCard[]> = {
      'job-101': [
        { id: 'tal-002', nome: 'Bruno Teixeira', aderenciaPercentual: 86, tendencia: 'up', ultimaAtualizacao: now, statusPipeline: 'contato' },
        { id: 'tal-004', nome: 'Daniel Lima', aderenciaPercentual: 84, tendencia: 'flat', ultimaAtualizacao: now, statusPipeline: 'triagem' },
        { id: 'tal-005', nome: 'Eduarda Nunes', aderenciaPercentual: 74, tendencia: 'down', ultimaAtualizacao: now, statusPipeline: 'novos' },
      ],
      'job-102': [
        { id: 'tal-001', nome: 'Ana Martins', aderenciaPercentual: 82, tendencia: 'up', ultimaAtualizacao: now, statusPipeline: 'entrevista' },
        { id: 'tal-003', nome: 'Camila Rocha', aderenciaPercentual: 79, tendencia: 'flat', ultimaAtualizacao: now, statusPipeline: 'triagem' },
        { id: 'tal-005', nome: 'Eduarda Nunes', aderenciaPercentual: 70, tendencia: 'down', ultimaAtualizacao: now, statusPipeline: 'novos' },
      ],
      'job-103': [
        { id: 'tal-001', nome: 'Ana Martins', aderenciaPercentual: 83, tendencia: 'up', ultimaAtualizacao: now, statusPipeline: 'entrevista' },
        { id: 'tal-002', nome: 'Bruno Teixeira', aderenciaPercentual: 80, tendencia: 'flat', ultimaAtualizacao: now, statusPipeline: 'contato' },
        { id: 'tal-003', nome: 'Camila Rocha', aderenciaPercentual: 76, tendencia: 'flat', ultimaAtualizacao: now, statusPipeline: 'novos' },
      ],
    };

    const extras = extrasByJob[job.id] ?? [];
    for (const candidate of extras) {
      if (!existingIds.has(candidate.id)) {
        base.push(candidate);
        existingIds.add(candidate.id);
      }
    }

    return base;
  }

  private seedDb(): RecruiterDb {
    const now = new Date().toISOString();

    const talents: RecruiterTalent[] = [
      {
        id: 'tal-001',
        nome: 'Ana Martins',
        name: 'Ana Martins',
        local: 'São Paulo',
        cargoAtual: 'Backend .NET Sênior',
        skills: [
          { nome: '.NET', nivel: 92 },
          { nome: 'AWS', nivel: 84 },
          { nome: 'SQL', nivel: 89 },
        ],
        stacks: [
          { name: '.NET', level: 92 },
          { name: 'AWS', level: 84 },
          { name: 'SQL', level: 89 },
        ],
        crescimento30Dias: 12,
        crescimento60Dias: 18,
        aderenciaMedia: 91,
        tendencia: 'up',
        ultimaAtualizacao: now,
        lastSeen: 'hoje • 16:40',
        lastMessage: 'Posso atuar em arquitetura distribuída.',
        unreadCount: 2,
        messages: [],
      },
      {
        id: 'tal-002',
        nome: 'Bruno Teixeira',
        name: 'Bruno Teixeira',
        local: 'Rio de Janeiro',
        cargoAtual: 'Dev Angular Pleno',
        skills: [
          { nome: 'Angular', nivel: 88 },
          { nome: 'RxJS', nivel: 78 },
          { nome: 'TypeScript', nivel: 84 },
        ],
        stacks: [
          { name: 'Angular', level: 88 },
          { name: 'RxJS', level: 78 },
          { name: 'TypeScript', level: 84 },
        ],
        crescimento30Dias: 7,
        crescimento60Dias: 14,
        aderenciaMedia: 86,
        tendencia: 'up',
        ultimaAtualizacao: now,
        lastSeen: 'hoje • 11:28',
        lastMessage: 'Tenho portfólio de componentes.',
        unreadCount: 1,
        messages: [],
      },
      {
        id: 'tal-003',
        nome: 'Camila Rocha',
        name: 'Camila Rocha',
        local: 'Belo Horizonte',
        cargoAtual: 'Data Analyst',
        skills: [
          { nome: 'SQL', nivel: 81 },
          { nome: 'Power BI', nivel: 87 },
          { nome: 'Python', nivel: 73 },
        ],
        stacks: [
          { name: 'SQL', level: 81 },
          { name: 'Power BI', level: 87 },
          { name: 'Python', level: 73 },
        ],
        crescimento30Dias: 5,
        crescimento60Dias: 9,
        aderenciaMedia: 80,
        tendencia: 'flat',
        ultimaAtualizacao: now,
        lastSeen: 'ontem • 20:14',
        lastMessage: 'Posso participar da etapa técnica.',
        unreadCount: 0,
        messages: [],
      },
      {
        id: 'tal-004',
        nome: 'Daniel Lima',
        name: 'Daniel Lima',
        local: 'Recife',
        cargoAtual: 'UX Designer',
        skills: [
          { nome: 'Figma', nivel: 92 },
          { nome: 'Design System', nivel: 85 },
          { nome: 'UX Research', nivel: 79 },
        ],
        stacks: [
          { name: 'Figma', level: 92 },
          { name: 'Design System', level: 85 },
          { name: 'UX Research', level: 79 },
        ],
        crescimento30Dias: 10,
        crescimento60Dias: 16,
        aderenciaMedia: 88,
        tendencia: 'up',
        ultimaAtualizacao: now,
        lastSeen: 'hoje • 09:03',
        lastMessage: 'Enviei um case de discovery.',
        unreadCount: 3,
        messages: [],
      },
      {
        id: 'tal-005',
        nome: 'Eduarda Nunes',
        name: 'Eduarda Nunes',
        local: 'Curitiba',
        cargoAtual: 'QA Engineer',
        skills: [
          { nome: 'Cypress', nivel: 76 },
          { nome: 'Playwright', nivel: 74 },
          { nome: 'API Test', nivel: 81 },
        ],
        stacks: [
          { name: 'Cypress', level: 76 },
          { name: 'Playwright', level: 74 },
          { name: 'API Test', level: 81 },
        ],
        crescimento30Dias: -2,
        crescimento60Dias: 3,
        aderenciaMedia: 72,
        tendencia: 'down',
        ultimaAtualizacao: now,
        lastSeen: 'ontem • 18:55',
        lastMessage: 'Tenho disponibilidade para testes de API.',
        unreadCount: 0,
        messages: [],
      },
    ];

    const jobs: RecruiterJob[] = [
      {
        id: 'job-101',
        titulo: 'Backend .NET Sênior',
        empresa: 'Banco Itaú',
        local: 'São Paulo (Híbrido)',
        modelo: 'CLT',
        departamento: 'Tecnologia',
        metaMinimaPercentual: 85,
        descricao: 'Construção de APIs críticas, integração entre squads e evolução de arquitetura distribuída.',
        status: 'aberta',
        skills: [
          { nome: '.NET', peso: 40, minimoPercentual: 85 },
          { nome: 'AWS', peso: 30, minimoPercentual: 75 },
          { nome: 'SQL', peso: 30, minimoPercentual: 80 },
        ],
        candidatos: [
          {
            id: 'tal-001',
            nome: 'Ana Martins',
            aderenciaPercentual: 91,
            tendencia: 'up',
            ultimaAtualizacao: now,
            statusPipeline: 'entrevista',
          },
          {
            id: 'tal-003',
            nome: 'Camila Rocha',
            aderenciaPercentual: 78,
            tendencia: 'flat',
            ultimaAtualizacao: now,
            statusPipeline: 'triagem',
          },
          {
            id: 'tal-002',
            nome: 'Bruno Teixeira',
            aderenciaPercentual: 86,
            tendencia: 'up',
            ultimaAtualizacao: now,
            statusPipeline: 'contato',
          },
          {
            id: 'tal-004',
            nome: 'Daniel Lima',
            aderenciaPercentual: 84,
            tendencia: 'flat',
            ultimaAtualizacao: now,
            statusPipeline: 'triagem',
          },
          {
            id: 'tal-005',
            nome: 'Eduarda Nunes',
            aderenciaPercentual: 74,
            tendencia: 'down',
            ultimaAtualizacao: now,
            statusPipeline: 'novos',
          },
        ],
        createdAt: '2026-02-21T10:00:00.000Z',
      },
      {
        id: 'job-102',
        titulo: 'Frontend Angular Pleno',
        empresa: 'Santander Brasil',
        local: 'Remoto',
        modelo: 'CLT',
        departamento: 'Tecnologia',
        metaMinimaPercentual: 82,
        descricao: 'Evolução de portal B2B com Angular e foco em experiência, performance e testes.',
        status: 'aberta',
        skills: [
          { nome: 'Angular', peso: 45, minimoPercentual: 82 },
          { nome: 'TypeScript', peso: 30, minimoPercentual: 78 },
          { nome: 'Testes', peso: 25, minimoPercentual: 70 },
        ],
        candidatos: [
          {
            id: 'tal-002',
            nome: 'Bruno Teixeira',
            aderenciaPercentual: 86,
            tendencia: 'up',
            ultimaAtualizacao: now,
            statusPipeline: 'contato',
          },
          {
            id: 'tal-001',
            nome: 'Ana Martins',
            aderenciaPercentual: 82,
            tendencia: 'up',
            ultimaAtualizacao: now,
            statusPipeline: 'entrevista',
          },
          {
            id: 'tal-003',
            nome: 'Camila Rocha',
            aderenciaPercentual: 79,
            tendencia: 'flat',
            ultimaAtualizacao: now,
            statusPipeline: 'triagem',
          },
          {
            id: 'tal-005',
            nome: 'Eduarda Nunes',
            aderenciaPercentual: 70,
            tendencia: 'down',
            ultimaAtualizacao: now,
            statusPipeline: 'novos',
          },
        ],
        createdAt: '2026-02-23T15:00:00.000Z',
      },
      {
        id: 'job-103',
        titulo: 'UX Designer',
        empresa: 'Energisa',
        local: 'Rio de Janeiro (Híbrido)',
        modelo: 'PJ',
        departamento: 'Produto',
        metaMinimaPercentual: 84,
        descricao: 'Liderança de discovery, prototipação e alinhamento com stakeholders de produto.',
        status: 'pausada',
        skills: [
          { nome: 'Figma', peso: 35, minimoPercentual: 80 },
          { nome: 'UX Research', peso: 35, minimoPercentual: 82 },
          { nome: 'Design System', peso: 30, minimoPercentual: 78 },
        ],
        candidatos: [
          {
            id: 'tal-004',
            nome: 'Daniel Lima',
            aderenciaPercentual: 88,
            tendencia: 'up',
            ultimaAtualizacao: now,
            statusPipeline: 'oferta',
          },
          {
            id: 'tal-001',
            nome: 'Ana Martins',
            aderenciaPercentual: 83,
            tendencia: 'up',
            ultimaAtualizacao: now,
            statusPipeline: 'entrevista',
          },
          {
            id: 'tal-002',
            nome: 'Bruno Teixeira',
            aderenciaPercentual: 80,
            tendencia: 'flat',
            ultimaAtualizacao: now,
            statusPipeline: 'contato',
          },
          {
            id: 'tal-003',
            nome: 'Camila Rocha',
            aderenciaPercentual: 76,
            tendencia: 'flat',
            ultimaAtualizacao: now,
            statusPipeline: 'novos',
          },
        ],
        createdAt: '2026-02-10T12:00:00.000Z',
      },
      {
        id: 'job-104',
        titulo: 'Data Engineer Pleno',
        empresa: 'Banco Itaú',
        local: 'São Paulo (Híbrido)',
        modelo: 'CLT',
        departamento: 'Dados',
        metaMinimaPercentual: 80,
        descricao: 'Vaga finalizada após contratação concluída para projeto de dados corporativos.',
        status: 'fechada',
        skills: [
          { nome: 'Python', peso: 35, minimoPercentual: 78 },
          { nome: 'SQL', peso: 35, minimoPercentual: 80 },
          { nome: 'Airflow', peso: 30, minimoPercentual: 72 },
        ],
        candidatos: [
          {
            id: 'tal-001',
            nome: 'Ana Martins',
            aderenciaPercentual: 89,
            tendencia: 'up',
            ultimaAtualizacao: now,
            statusPipeline: 'contratado',
          },
          {
            id: 'tal-005',
            nome: 'Eduarda Nunes',
            aderenciaPercentual: 73,
            tendencia: 'flat',
            ultimaAtualizacao: now,
            statusPipeline: 'reprovado',
          },
        ],
        createdAt: '2026-01-08T10:00:00.000Z',
      },
      {
        id: 'job-105',
        titulo: 'DevOps Engineer',
        empresa: 'Santander Brasil',
        local: 'Remoto',
        modelo: 'PJ',
        departamento: 'Infraestrutura',
        metaMinimaPercentual: 82,
        descricao: 'Processo encerrado após preenchimento da posição com aprovação final.',
        status: 'fechada',
        skills: [
          { nome: 'AWS', peso: 40, minimoPercentual: 82 },
          { nome: 'Terraform', peso: 30, minimoPercentual: 75 },
          { nome: 'Kubernetes', peso: 30, minimoPercentual: 78 },
        ],
        candidatos: [
          {
            id: 'tal-002',
            nome: 'Bruno Teixeira',
            aderenciaPercentual: 87,
            tendencia: 'up',
            ultimaAtualizacao: now,
            statusPipeline: 'contratado',
          },
          {
            id: 'tal-003',
            nome: 'Camila Rocha',
            aderenciaPercentual: 76,
            tendencia: 'flat',
            ultimaAtualizacao: now,
            statusPipeline: 'reprovado',
          },
        ],
        createdAt: '2026-01-20T15:30:00.000Z',
      },
      {
        id: 'job-106',
        titulo: 'Backend Java Júnior',
        empresa: 'Energisa',
        local: 'Belo Horizonte (Híbrido)',
        modelo: 'CLT',
        departamento: 'Tecnologia',
        metaMinimaPercentual: 78,
        descricao: 'Vaga recém-aberta aguardando início do pipeline de candidaturas.',
        status: 'aberta',
        skills: [
          { nome: 'Java', peso: 40, minimoPercentual: 75 },
          { nome: 'Spring', peso: 35, minimoPercentual: 72 },
          { nome: 'SQL', peso: 25, minimoPercentual: 70 },
        ],
        candidatos: [],
        createdAt: '2026-02-27T10:20:00.000Z',
      },
      {
        id: 'job-107',
        titulo: 'QA Analyst Pleno',
        empresa: 'Bradesco',
        local: 'Curitiba (Híbrido)',
        modelo: 'CLT',
        departamento: 'Qualidade',
        metaMinimaPercentual: 80,
        descricao: 'Vaga fechada após desligamento no ciclo final do processo.',
        status: 'fechada',
        skills: [
          { nome: 'QA', peso: 40, minimoPercentual: 78 },
          { nome: 'API Test', peso: 35, minimoPercentual: 76 },
          { nome: 'Playwright', peso: 25, minimoPercentual: 72 },
        ],
        candidatos: [
          {
            id: 'tal-006',
            nome: 'Fernanda Alves',
            aderenciaPercentual: 82,
            tendencia: 'flat',
            ultimaAtualizacao: now,
            statusPipeline: 'reprovado',
          },
        ],
        createdAt: '2026-02-11T09:10:00.000Z',
      },
    ];

    const alerts: RecruiterAlert[] = [
      {
        id: 'alert-001',
        tipo: 'pipeline-parado',
        mensagem: 'A vaga Frontend Angular Pleno está 4 dias sem avanço em Entrevista.',
        jobId: 'job-102',
        createdAt: now,
      },
      {
        id: 'alert-002',
        tipo: 'vaga-critica',
        mensagem: 'Backend .NET Sênior tem poucos candidatos acima da meta mínima.',
        jobId: 'job-101',
        createdAt: now,
      },
    ];

    return {
      jobs,
      talents,
      alerts,
      updatedAt: now,
    };
  }
}
