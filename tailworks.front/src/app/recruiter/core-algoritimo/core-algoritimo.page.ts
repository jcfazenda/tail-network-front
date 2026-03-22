import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatchingLabService } from '../../core/matching-lab/matching-lab.service';
import { MatchLabJob, MatchLabJobResult, MatchLabRankingEntry, MatchLabSeniority } from '../../core/matching-lab/matching-lab.models';
import { TalentSystemSeedService } from '../../talent/talent-system-seed.service';

type ScoreBand = 'all' | 'high' | 'medium' | 'low';

@Component({
  standalone: true,
  selector: 'app-core-algoritimo-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './core-algoritimo.page.html',
  styleUrls: ['./core-algoritimo.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoreAlgoritimoPage {
  private readonly matchingLabService = inject(MatchingLabService);
  private readonly talentSystemSeedService = inject(TalentSystemSeedService);

  readonly dataset = this.matchingLabService.getDataset();
  selectedJobId = this.dataset.jobs[0]?.id ?? '';
  searchTerm = '';
  candidateSearch = '';
  seniorityFilter: MatchLabSeniority | 'all' = 'all';
  scoreBand: ScoreBand = 'all';
  seedStatus = '';

  get jobs(): MatchLabJob[] {
    const query = this.searchTerm.trim().toLocaleLowerCase('pt-BR');
    if (!query) {
      return this.dataset.jobs;
    }

    return this.dataset.jobs.filter((job) =>
      `${job.title} ${job.company} ${job.location}`.toLocaleLowerCase('pt-BR').includes(query),
    );
  }

  get selectedResult(): MatchLabJobResult {
    return this.dataset.results.find((result) => result.job.id === this.selectedJobId) ?? this.dataset.results[0];
  }

  get selectedJob(): MatchLabJob {
    return this.selectedResult.job;
  }

  get visibleRanking(): MatchLabRankingEntry[] {
    const query = this.candidateSearch.trim().toLocaleLowerCase('pt-BR');

    return this.selectedResult.ranking.filter((entry) => {
      if (this.seniorityFilter !== 'all' && entry.candidate.seniority !== this.seniorityFilter) {
        return false;
      }

      if (this.scoreBand === 'high' && entry.score < 80) {
        return false;
      }

      if (this.scoreBand === 'medium' && (entry.score < 60 || entry.score >= 80)) {
        return false;
      }

      if (this.scoreBand === 'low' && entry.score >= 60) {
        return false;
      }

      if (!query) {
        return true;
      }

      return `${entry.candidate.name} ${entry.candidate.location} ${entry.candidate.summary}`
        .toLocaleLowerCase('pt-BR')
        .includes(query);
    });
  }

  get strongFitCount(): number {
    return this.selectedResult.ranking.filter((entry) => entry.score >= 80).length;
  }

  get mediumFitCount(): number {
    return this.selectedResult.ranking.filter((entry) => entry.score >= 60 && entry.score < 80).length;
  }

  get lowFitCount(): number {
    return this.selectedResult.ranking.filter((entry) => entry.score < 60).length;
  }

  get averageScore(): number {
    const ranking = this.selectedResult.ranking;
    if (!ranking.length) {
      return 0;
    }

    return Math.round(ranking.reduce((sum, entry) => sum + entry.score, 0) / ranking.length);
  }

  selectJob(jobId: string): void {
    this.selectedJobId = jobId;
  }

  resetDataset(): void {
    const next = this.matchingLabService.reset();
    this.selectedJobId = next.jobs[0]?.id ?? '';
    this.searchTerm = '';
    this.candidateSearch = '';
    this.seniorityFilter = 'all';
    this.scoreBand = 'all';
    this.seedStatus = '';
  }

  seedSystemTalents(): void {
    const result = this.talentSystemSeedService.seedTalentsFromLab();
    this.seedStatus = `${result.accounts} acessos de talento e ${result.profiles} perfis locais preparados no sistema.`;
  }

  scoreLabel(score: number): string {
    if (score >= 80) {
      return 'Alta aderência';
    }
    if (score >= 60) {
      return 'Boa aderência';
    }
    return 'Baixa aderência';
  }

  scoreBarWidth(score: number): number {
    return Math.max(6, Math.min(100, score));
  }

  formatSalary(job: MatchLabJob): string {
    if (!job.salaryMin || !job.salaryMax) {
      return 'R$ sob análise';
    }

    return `R$ ${job.salaryMin.toLocaleString('pt-BR')} - R$ ${job.salaryMax.toLocaleString('pt-BR')}`;
  }

  trackJob(_index: number, job: MatchLabJob): string {
    return job.id;
  }

  trackRanking(_index: number, entry: MatchLabRankingEntry): string {
    return entry.candidateId;
  }
}
