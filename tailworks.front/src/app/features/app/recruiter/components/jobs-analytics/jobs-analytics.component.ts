import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

type KpiCard = {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
};

type CampaignBar = {
  label: string;
  pct: number;
  count: number;
  avgTime: string;
  risk?: boolean;
};

type ActivitySeries = { key: string; color: string; values: number[] };

@Component({
  selector: 'recruiter-jobs-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './jobs-analytics.component.html',
  styleUrls: ['./jobs-analytics.component.scss'],
})
export class JobsAnalyticsComponent {
  @Input({ required: true }) openJobs = 0;
  @Input({ required: true }) totalCandidates = 0;
  @Input() inProcessCandidates = 0;
  @Input() hiredCount = 0;
  @Input() avgAdherenceActive = 0;
  @Input() activeCandidates = 0;
  @Input({ required: true }) readyTalents = 0;
  @Input({ required: true }) avgTriageHours = 0;
  @Input({ required: true }) riskCount = 0;
  @Input({ required: true }) activityLabels: string[] = [];
  @Input({ required: true }) activitySeries: ActivitySeries[] = [];
  @Input({ required: true }) funnelStages: CampaignBar[] = [];
  @Input() mode: 'full' | 'kpi' | 'board' | 'funnel' | 'activity' = 'full';
  tooltip = { visible: false, text: '', x: 0, y: 0 };

  get showKpis(): boolean {
    return this.mode === 'full' || this.mode === 'kpi';
  }

  get showBoard(): boolean {
    return this.mode === 'full' || this.mode === 'board';
  }

  get showFunnelOnly(): boolean {
    return this.mode === 'funnel';
  }

  get showActivityOnly(): boolean {
    return this.mode === 'activity';
  }

  get kpis(): KpiCard[] {
    return [
      {
        label: 'Última candidatura: 27/02/2026',
        value: this.totalCandidates.toString(),
        delta: 'Média de resposta: 1 a 3 dias',
        positive: true,
      },
      {
        label: 'Média de aderência à vaga',
        value: `${Math.max(0, this.avgAdherenceActive)}%`,
        delta: `base ativa: ${this.activeCandidates} candidatos`,
        positive: true,
      },
      {
        label: 'Contratações',
        value: this.hiredCount.toString(),
        delta: `Conversão atual: ${this.hiringConversionPct}%`,
        positive: true,
      },
    ];
  }

  get xTicks(): number[] {
    const total = this.activityLabels.length;
    if (total <= 1) return [0];
    return Array.from({ length: total }, (_, i) => (i / (total - 1)) * 640);
  }

  get yTicks(): number[] {
    const max = this.maxActivityValue;
    const step = Math.max(1, Math.round(max / 4));
    return [0, step, step * 2, step * 3, step * 4].reverse();
  }

  get maxActivityValue(): number {
    const values = this.activitySeries.flatMap(s => s.values);
    const max = values.length ? Math.max(...values) : 1;
    return Math.max(1, max);
  }

  get processSharePct(): number {
    if (this.totalCandidates <= 0) return 0;
    return Math.round((Math.max(0, this.inProcessCandidates) / this.totalCandidates) * 100);
  }

  get candidatesSharePct(): number {
    return Math.max(0, 100 - this.processSharePct);
  }

  get adherenceGapPct(): number {
    const avg = Math.max(0, Math.min(100, this.avgAdherenceActive));
    return 100 - avg;
  }

  get hiringConversionPct(): number {
    if (this.hiringBaseCount <= 0) return 0;
    return Math.round((Math.max(0, this.hiredCount) / this.hiringBaseCount) * 100);
  }

  get hiringNeedleDeg(): number {
    return this.hiringConversionPct;
  }

  get candidaturesCount(): number {
    return Math.max(0, this.totalCandidates - this.inProcessCandidates - this.hiredCount);
  }

  get hiringBaseCount(): number {
    return this.candidaturesCount + Math.max(0, this.inProcessCandidates) + Math.max(0, this.hiredCount);
  }

  get hiringNeedleX(): number {
    const angle = Math.PI * (1 - this.hiringNeedleDeg / 100);
    const r = 52;
    const cx = 80;
    return cx + r * Math.cos(angle);
  }

  get hiringNeedleY(): number {
    const angle = Math.PI * (1 - this.hiringNeedleDeg / 100);
    const r = 52;
    const cy = 80;
    return cy - r * Math.sin(angle);
  }

  linePath(values: number[]): string {
    if (!values.length) return '';

    const width = 640;
    const height = 220;
    const stepX = values.length > 1 ? width / (values.length - 1) : 0;
    const points = values.map((v, i) => {
      const x = i * stepX;
      const y = height - (Math.max(0, v) / this.maxActivityValue) * (height - 10);
      return { x, y };
    });

    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  }

  seriesPoints(values: number[]): Array<{ x: number; y: number }> {
    if (!values.length) return [];
    const width = 640;
    const height = 220;
    const stepX = values.length > 1 ? width / (values.length - 1) : 0;
    return values.map((v, i) => ({
      x: i * stepX,
      y: height - (Math.max(0, v) / this.maxActivityValue) * (height - 10),
    }));
  }

  seriesLabel(key: string): string {
    if (key === 'dotnet') return '.NET';
    if (key === 'java') return 'Java';
    if (key === 'angular') return 'Angular';
    if (key === 'react') return 'React';
    if (key === 'python') return 'Python';
    if (key === 'node') return 'Node.js';
    if (key === 'sql') return 'SQL';
    return key;
  }

  seriesTotal(values: number[]): number {
    return values.reduce((acc, value) => acc + Math.max(0, value), 0);
  }

  seriesAvg(values: number[]): number {
    if (!values.length) return 0;
    return Math.round(this.seriesTotal(values) / values.length);
  }

  showLineTooltip(event: MouseEvent, key: string, values: number[]): void {
    const text = `${this.seriesLabel(key)} • Total: ${this.seriesTotal(values)} • Média/mês: ${this.seriesAvg(values)}`;
    this.setTooltip(event, text);
  }

  showPointTooltip(event: MouseEvent, key: string, month: string, value: number): void {
    const text = `${this.seriesLabel(key)} • ${month}: ${value}`;
    this.setTooltip(event, text);
  }

  hideTooltip(): void {
    this.tooltip.visible = false;
  }

  private setTooltip(event: MouseEvent, text: string): void {
    const target = event.currentTarget as SVGElement | null;
    const svg = target?.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    this.tooltip = {
      visible: true,
      text,
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 10,
    };
  }
}
