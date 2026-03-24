import { Injectable, inject } from '@angular/core';
import { buildMatchingLabCandidates, buildMatchingLabJobs } from './matching-lab.seed';
import { MatchLabDataset, MatchLabJob, MatchLabJobResult, MatchLabRankingEntry, MatchLabScoreDebug, MatchLabStackContribution, MatchLabStackWeight, MatchLabWorkModel, MatchLabSeniority } from './matching-lab.models';
import { RankableTalentCandidate, TalentProfileStoreService } from '../../talent/talent-profile-store.service';
import { BrowserStorageService } from '../storage/browser-storage.service';
import { JobsRepository } from '../../vagas/data/jobs.repository';
import { MockJobRecord } from '../../vagas/data/vagas.models';
import { MatchDomainService } from '../matching/match-domain.service';

@Injectable({ providedIn: 'root' })
export class MatchingLabService {
  static readonly storageKey = 'tailworks:matching-lab-dataset:v1';

  private readonly talentProfileStore = inject(TalentProfileStoreService);
  private readonly browserStorage = inject(BrowserStorageService);
  private readonly jobsRepository = inject(JobsRepository);
  private readonly matchDomainService = inject(MatchDomainService);
  private cache?: MatchLabDataset;

  private readonly emptyDataset: MatchLabDataset = {
    jobs: [],
    candidates: [],
    results: [],
  };

  getDataset(): MatchLabDataset {
    if (this.cache) {
      return this.cache;
    }

    const stored = this.browserStorage.readJson<Pick<MatchLabDataset, 'jobs' | 'candidates'>>(MatchingLabService.storageKey);
    const publishedJobs = this.buildJobsFromPublishedLabRecords();
    const rankableCandidates = this.resolveRankableCandidates(stored?.candidates ?? []);
    const syncedCandidates = rankableCandidates.map((item) => item.candidate);
    const jobs = publishedJobs.length ? publishedJobs : (stored?.jobs?.length ? stored.jobs : []);
    const candidates = syncedCandidates.length ? syncedCandidates : (stored?.candidates?.length ? stored.candidates : []);

    if (!jobs.length || !candidates.length) {
      this.cache = this.emptyDataset;
      return this.cache;
    }

    const results = jobs.map((job) => this.rankCandidatesForJob(job, rankableCandidates));

    this.cache = { jobs, candidates, results };
    return this.cache;
  }

  private resolveRankableCandidates(storedCandidates: MatchLabDataset['candidates']): RankableTalentCandidate[] {
    const synced = this.talentProfileStore.listRankableCandidates();
    if (synced.length) {
      return synced;
    }

    return storedCandidates.map((candidate) => ({
      candidate,
      talentProfile: {
        stackScores: Object.fromEntries(
          candidate.stacks.map((stack) => [`repo:${stack.stackId}`, this.matchDomainService.clampScore(stack.percent)]),
        ),
        experiences: candidate.experiences.map((experience) => ({
          role: experience.role,
          appliedRepoIds: experience.stackIds.map((stackId) => `repo:${stackId}`),
          months: this.monthDiff(experience.start, experience.end),
        })),
      },
    }));
  }

  generateLocalMass(): MatchLabDataset {
    const seed = Date.now();
    const dataset = {
      jobs: buildMatchingLabJobs(seed),
      candidates: buildMatchingLabCandidates(seed),
    };
    this.browserStorage.writeJson(MatchingLabService.storageKey, dataset);
    this.cache = undefined;
    return this.getDataset();
  }

  reset(): MatchLabDataset {
    this.cache = undefined;
    return this.getDataset();
  }

  clear(): void {
    this.cache = undefined;
    this.browserStorage.removeItem(MatchingLabService.storageKey);
  }

  private buildJobsFromPublishedLabRecords(): MatchLabJob[] {
    const publishedJobs = this.jobsRepository.readAll() ?? [];
    const labJobs = publishedJobs
      .filter((job) => job.id.startsWith('lab-'))
      .map((job) => this.toMatchLabJob(job))
      .sort((left, right) => left.code.localeCompare(right.code, 'pt-BR'));

    return labJobs;
  }

  private rankCandidatesForJob(job: MatchLabJob, candidates: RankableTalentCandidate[]): MatchLabJobResult {
    const jobProfile = this.matchDomainService.buildJobProfile({
      techStack: job.stacks.map((stack) => ({ name: stack.stackName, match: stack.percent })),
      seniority: job.seniority,
      responsibilitySections: [],
    });

    const ranking = candidates
      .map(({ candidate, talentProfile }) => {
        const score = this.matchDomainService.scoreTalentAgainstJob(jobProfile, talentProfile);
        const debug = this.buildDebug(job, candidate, talentProfile, score);

        return {
          jobId: job.id,
          candidateId: candidate.id,
          score: score.overallScore,
          candidate,
          debug,
        } satisfies MatchLabRankingEntry;
      })
      .sort((left, right) =>
        right.score - left.score
        || right.debug.primaryScore - left.debug.primaryScore
        || right.debug.experienceScore - left.debug.experienceScore
        || left.candidate.name.localeCompare(right.candidate.name, 'pt-BR'),
      );

    return { job, ranking };
  }

  private buildDebug(
    job: MatchLabJob,
    candidate: RankableTalentCandidate['candidate'],
    talentProfile: RankableTalentCandidate['talentProfile'],
    score: ReturnType<MatchDomainService['scoreTalentAgainstJob']>,
  ): MatchLabScoreDebug {
    const stackBreakdown = job.stacks.map((jobStack) => this.buildStackContribution(jobStack, candidate, talentProfile));
    const primary = this.average(stackBreakdown.filter((item) => item.band === 'primary').map((item) => item.stackScore));
    const secondary = this.average(stackBreakdown.filter((item) => item.band === 'secondary').map((item) => item.stackScore));

    return {
      primaryScore: primary,
      secondaryScore: secondary,
      experienceScore: score.experienceScore,
      seniorityScore: job.seniority === candidate.seniority ? 5 : 0,
      coherenceScore: Math.max(0, score.overallScore - this.average([primary, secondary, score.experienceScore])),
      totalScore: score.overallScore,
      reasons: this.buildReasons(job, candidate, stackBreakdown, score.overallScore),
      stackBreakdown,
    };
  }

  private buildStackContribution(
    jobStack: MatchLabStackWeight,
    candidate: RankableTalentCandidate['candidate'],
    talentProfile: RankableTalentCandidate['talentProfile'],
  ): MatchLabStackContribution {
    const repoId = `repo:${jobStack.stackId}`;
    const candidatePercent = this.matchDomainService.clampScore(talentProfile.stackScores[repoId] ?? 0);
    const candidateExperienceMonths = this.countExperienceMonths(candidate, jobStack.stackId);

    return {
      stackId: jobStack.stackId,
      stackName: jobStack.stackName,
      vacancyPercent: jobStack.percent,
      candidatePercent,
      candidateExperienceMonths,
      band: jobStack.band,
      stackScore: candidatePercent,
      experienceScore: this.matchDomainService.clampScore(candidateExperienceMonths * 6),
      weightedContribution: this.matchDomainService.clampScore(Math.round((candidatePercent * 0.82) + (Math.min(100, candidateExperienceMonths * 6) * 0.18))),
    };
  }

  private countExperienceMonths(candidate: RankableTalentCandidate['candidate'], stackId: string): number {
    return candidate.experiences.reduce((total, experience) => {
      if (!experience.stackIds.includes(stackId)) {
        return total;
      }

      return total + this.monthDiff(experience.start, experience.end);
    }, 0);
  }

  private monthDiff(start: string, end?: string): number {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date('2026-03-01');
    const diffMonths = ((endDate.getFullYear() - startDate.getFullYear()) * 12) + (endDate.getMonth() - startDate.getMonth());
    return Math.max(1, diffMonths);
  }

  private buildReasons(
    job: MatchLabJob,
    candidate: RankableTalentCandidate['candidate'],
    stackBreakdown: MatchLabStackContribution[],
    totalScore: number,
  ): string[] {
    const highlights = stackBreakdown
      .filter((item) => item.candidatePercent > 0)
      .sort((left, right) => right.weightedContribution - left.weightedContribution)
      .slice(0, 3)
      .map((item) => `${item.stackName}: vaga ${item.vacancyPercent}% · talento ${item.candidatePercent}% · experiência ${item.candidateExperienceMonths}m`);

    if (job.seniority === candidate.seniority) {
      highlights.push(`Senioridade coerente: ${candidate.seniority}`);
    }

    highlights.push(`Score final ${totalScore}%`);
    return highlights;
  }

  private average(values: number[]): number {
    if (!values.length) {
      return 0;
    }

    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  }

  private toMatchLabJob(job: MockJobRecord): MatchLabJob {
    const rankedStacks = [...(job.techStack ?? [])]
      .map((stack) => ({ ...stack, match: this.matchDomainService.clampScore(stack.match) }))
      .filter((stack) => stack.name.trim().length > 0)
      .sort((left, right) => right.match - left.match || left.name.localeCompare(right.name, 'pt-BR'));

    const topNames = new Set(rankedStacks.slice(0, 3).map((stack) => stack.name));
    const secondaryNames = new Set(rankedStacks.filter((stack) => stack.match > 25).map((stack) => stack.name));
    const stacks: MatchLabStackWeight[] = rankedStacks.map((stack) => ({
      stackId: this.resolveStackId(stack.name),
      stackName: stack.name,
      percent: stack.match,
      band: topNames.has(stack.name) ? 'primary' : (secondaryNames.has(stack.name) ? 'secondary' : 'support'),
    }));
    const salary = this.parseSalaryRange(job.salaryRange);

    return {
      id: job.id.replace(/^lab-/, ''),
      code: job.code?.trim() || job.id.replace(/^lab-/, '').toUpperCase(),
      title: job.title,
      company: job.company,
      location: job.location,
      workModel: this.normalizeWorkModel(job.workModel),
      seniority: this.normalizeSeniority(job.seniority),
      salaryMin: salary.salaryMin,
      salaryMax: salary.salaryMax,
      summary: job.summary,
      stacks,
      topStacks: stacks.filter((stack) => stack.band === 'primary'),
      secondaryStacks: stacks.filter((stack) => stack.band === 'secondary'),
    };
  }

  private resolveStackId(label: string): string {
    const repoId = this.matchDomainService.mapTechLabelsToRepoIds([label])[0];
    if (repoId) {
      return repoId.replace(/^repo:/, '');
    }

    return label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'stack';
  }

  private normalizeWorkModel(workModel: string | undefined): MatchLabWorkModel {
    if (workModel === 'Presencial' || workModel === 'Remoto') {
      return workModel;
    }

    return 'Hibrido';
  }

  private normalizeSeniority(seniority: string | undefined): MatchLabSeniority {
    const normalized = (seniority ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');

    if (normalized.includes('especial')) {
      return 'Especialista';
    }
    if (normalized.includes('senior')) {
      return 'Senior';
    }
    if (normalized.includes('pleno')) {
      return 'Pleno';
    }
    return 'Junior';
  }

  private parseSalaryRange(input: string | undefined): { salaryMin?: number; salaryMax?: number } {
    const matches = input?.match(/\d[\d.]*/g) ?? [];
    const numbers = matches
      .map((value) => Number(value.replace(/\./g, '')))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!numbers.length) {
      return {};
    }

    if (numbers.length === 1) {
      return { salaryMin: numbers[0], salaryMax: numbers[0] };
    }

    return {
      salaryMin: Math.min(numbers[0], numbers[1]),
      salaryMax: Math.max(numbers[0], numbers[1]),
    };
  }
}
