import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RecruiterJob, RecruiterPipelineStage } from '../../models/recruiter.models';
import { JobsAnalyticsComponent } from '../../components/jobs-analytics/jobs-analytics.component';
import { RecruiterMockService } from '../../../services/recruiter-mock.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, JobsAnalyticsComponent],
  templateUrl: './recruiter-dashboard.page.html',
  styleUrls: ['./recruiter-dashboard.page.scss'],
})
export class RecruiterDashboardPage implements OnInit {
  jobs: RecruiterJob[] = [];

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
    this.jobs = this.recruiterMock.getJobs();
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

  get activityLabels(): string[] {
    return ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  }

  get activitySeries(): Array<{ key: string; color: string; values: number[] }> {
    return [
      { key: 'dotnet', color: '#5b4acb', values: [...this.stackMonthlyMock['dotnet']] },
      { key: 'java', color: '#34a7d6', values: [...this.stackMonthlyMock['java']] },
      { key: 'angular', color: '#f5b300', values: [...this.stackMonthlyMock['angular']] },
      { key: 'react', color: '#14b8a6', values: [...this.stackMonthlyMock['react']] },
      { key: 'python', color: '#f97316', values: [...this.stackMonthlyMock['python']] },
      { key: 'node', color: '#84cc16', values: [...this.stackMonthlyMock['node']] },
      { key: 'sql', color: '#ef4444', values: [...this.stackMonthlyMock['sql']] },
    ];
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

  private processCandidates(job: RecruiterJob) {
    return job.candidatos.filter(
      c =>
        c.statusPipeline !== 'novos' &&
        c.statusPipeline !== 'contratado' &&
        c.statusPipeline !== 'reprovado'
    );
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
}

