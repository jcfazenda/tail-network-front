import { Injectable } from '@angular/core';
import { JobResponsibilitySection, TechStackItem } from '../../vagas/data/vagas.models';
import { MatchExperienceSignal, MatchJobProfile, MatchScoreBreakdown, MatchTalentProfile } from './match-domain.models';

@Injectable({ providedIn: 'root' })
export class MatchDomainService {
  private readonly techAliasMap: Array<{ repoId: string; aliases: string[] }> = [
    { repoId: 'repo:dotnet', aliases: ['.net', 'dotnet'] },
    { repoId: 'repo:csharp', aliases: ['c#', 'csharp'] },
    { repoId: 'repo:aspnet-core', aliases: ['asp.net core', 'asp net core'] },
    { repoId: 'repo:entity-framework', aliases: ['entity framework'] },
    { repoId: 'repo:rest-api', aliases: ['rest api', 'rest apis', 'rest'] },
    { repoId: 'repo:sql-server', aliases: ['sql server'] },
    { repoId: 'repo:postgresql', aliases: ['postgres', 'postgresql'] },
    { repoId: 'repo:mysql', aliases: ['mysql'] },
    { repoId: 'repo:mongodb', aliases: ['mongodb'] },
    { repoId: 'repo:redis', aliases: ['redis'] },
    { repoId: 'repo:elasticsearch', aliases: ['elastic', 'elasticsearch'] },
    { repoId: 'repo:docker', aliases: ['docker'] },
    { repoId: 'repo:kubernetes', aliases: ['kubernetes', 'k8s'] },
    { repoId: 'repo:terraform', aliases: ['terraform'] },
    { repoId: 'repo:aws', aliases: ['aws'] },
    { repoId: 'repo:azure', aliases: ['azure'] },
    { repoId: 'repo:gcp', aliases: ['gcp', 'google cloud'] },
    { repoId: 'repo:serverless', aliases: ['serverless'] },
    { repoId: 'repo:kafka', aliases: ['kafka'] },
    { repoId: 'repo:rabbitmq', aliases: ['rabbitmq', 'rabbit mq', 'rabbit'] },
    { repoId: 'repo:microservices', aliases: ['microservice', 'microservices'] },
    { repoId: 'repo:typescript', aliases: ['typescript'] },
    { repoId: 'repo:javascript', aliases: ['javascript'] },
    { repoId: 'repo:angular', aliases: ['angular'] },
    { repoId: 'repo:react', aliases: ['react'] },
    { repoId: 'repo:vue', aliases: ['vue'] },
    { repoId: 'repo:nextjs', aliases: ['next.js', 'nextjs'] },
    { repoId: 'repo:html', aliases: ['html'] },
    { repoId: 'repo:css', aliases: ['css'] },
    { repoId: 'repo:cloudwatch', aliases: ['cloud monitoring', 'cloudwatch'] },
    { repoId: 'repo:github-actions', aliases: ['github actions'] },
    { repoId: 'repo:gitlab-ci', aliases: ['gitlab ci'] },
    { repoId: 'repo:linux', aliases: ['linux'] },
    { repoId: 'repo:nginx', aliases: ['nginx'] },
    { repoId: 'repo:react-native', aliases: ['react native'] },
    { repoId: 'repo:flutter', aliases: ['flutter'] },
    { repoId: 'repo:kotlin', aliases: ['kotlin'] },
    { repoId: 'repo:swift', aliases: ['swift'] },
    { repoId: 'repo:android', aliases: ['android'] },
    { repoId: 'repo:ios', aliases: ['ios'] },
  ];

  buildJobProfile(input: {
    techStack: TechStackItem[];
    seniority?: string;
    responsibilitySections?: JobResponsibilitySection[];
  }): MatchJobProfile {
    return {
      techStack: input.techStack.map((item) => ({ ...item })),
      requiredRepoIds: this.mapTechLabelsToRepoIds(input.techStack.map((item) => item.name)),
      desiredSeniority: input.seniority?.trim(),
      responsibilityKeywords: (input.responsibilitySections ?? [])
        .flatMap((section) => section.items)
        .map((item) => this.normalizeText(item))
        .filter(Boolean),
    };
  }

  mapTechLabelsToRepoIds(labels: string[]): string[] {
    const repoIds: string[] = [];

    for (const label of labels) {
      const normalized = this.normalizeText(label);
      for (const entry of this.techAliasMap) {
        if (entry.aliases.some((alias) => normalized.includes(alias))) {
          this.pushUnique(repoIds, entry.repoId);
        }
      }
    }

    return repoIds;
  }

  scoreTalentAgainstJob(job: MatchJobProfile, talent: MatchTalentProfile): MatchScoreBreakdown {
    if (!job.requiredRepoIds.length) {
      return {
        overallScore: 0,
        stackScore: 0,
        experienceScore: 0,
        matchedRepoIds: [],
        missingRepoIds: [],
      };
    }

    const matchedRepoIds = job.requiredRepoIds.filter((repoId) => (talent.stackScores[repoId] ?? 0) > 0);
    const missingRepoIds = job.requiredRepoIds.filter((repoId) => !matchedRepoIds.includes(repoId));
    const stackScore = this.average(job.requiredRepoIds.map((repoId) => this.clampScore(talent.stackScores[repoId] ?? 0)));
    const experienceScore = this.scoreExperienceSignals(job.requiredRepoIds, talent.experiences ?? []);
    const overallScore = experienceScore > 0
      ? Math.round((stackScore * 0.82) + (experienceScore * 0.18))
      : stackScore;

    return {
      overallScore: this.clampScore(overallScore),
      stackScore,
      experienceScore,
      matchedRepoIds,
      missingRepoIds,
    };
  }

  estimateJobReadinessFromTechStack(techStack: TechStackItem[]): number {
    if (!techStack.length) {
      return 42;
    }

    const averageScore = this.average(techStack.map((item) => this.clampScore(item.match)));
    const coverageBonus = Math.min(12, techStack.length * 2);
    return this.clampScore(Math.round((averageScore * 0.88) + coverageBonus));
  }

  clampScore(score: number): number {
    if (!Number.isFinite(score)) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private scoreExperienceSignals(requiredRepoIds: string[], experiences: MatchExperienceSignal[]): number {
    if (!experiences.length) {
      return 0;
    }

    const required = new Set(requiredRepoIds);
    const scores = experiences.map((experience) => {
      const repoIds = experience.appliedRepoIds?.length
        ? experience.appliedRepoIds
        : this.mapTechLabelsToRepoIds(experience.appliedStacks ?? []);
      const overlap = repoIds.filter((repoId) => required.has(repoId)).length;
      if (!overlap) {
        return 0;
      }

      const coverageByRequirement = overlap / Math.max(required.size, 1);
      const focusOnRequired = overlap / Math.max(repoIds.length, 1);
      const monthsScore = Math.min(16, Math.round((Math.max(1, experience.months ?? 0) / 48) * 16));
      const actuationScore = Math.min(8, Math.round((Math.max(10, Math.min(100, experience.actuation ?? 70)) / 100) * 8));
      const levelScore = Math.min(8, Math.round(this.scorePositionLevel(experience.positionLevel) / 3));

      return Math.round(
        (coverageByRequirement * 60)
        + (focusOnRequired * 16)
        + monthsScore
        + actuationScore
        + levelScore
      );
    })
      .filter((score) => score > 0)
      .sort((left, right) => right - left)
      .slice(0, 3);

    if (!scores.length) {
      return 0;
    }

    return this.clampScore(this.average(scores));
  }

  private scorePositionLevel(positionLevel?: string): number {
    const normalized = this.normalizeText(positionLevel ?? '');
    if (normalized.includes('lead') || normalized.includes('especialista')) {
      return 28;
    }
    if (normalized.includes('senior')) {
      return 22;
    }
    if (normalized.includes('pleno')) {
      return 16;
    }
    if (normalized.includes('junior')) {
      return 10;
    }
    return 8;
  }

  private average(values: number[]): number {
    if (!values.length) {
      return 0;
    }

    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  private pushUnique(list: string[], value: string): void {
    if (!list.includes(value)) {
      list.push(value);
    }
  }
}
