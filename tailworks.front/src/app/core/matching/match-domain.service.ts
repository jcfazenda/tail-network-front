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
      requiredRepoIds: this.mapPrimaryTechLabelsToRepoIds(input.techStack.map((item) => item.name)),
      desiredSeniority: input.seniority?.trim(),
      responsibilityKeywords: (input.responsibilitySections ?? [])
        .flatMap((section) => section.items)
        .map((item) => this.normalizeText(item))
        .filter(Boolean),
    };
  }

  mapPrimaryTechLabelsToRepoIds(labels: string[]): string[] {
    const repoIds: string[] = [];

    for (const label of labels) {
      const primary = this.mapPrimaryTechLabelToRepoId(label);
      if (primary) {
        this.pushUnique(repoIds, primary);
      }
    }

    return repoIds;
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

    const rankedRequiredRepoIds = job.techStack
      .slice()
      .sort((left, right) => right.match - left.match || left.name.localeCompare(right.name, 'pt-BR'))
      .map((stack) => this.mapPrimaryTechLabelToRepoId(stack.name))
      .filter((value): value is string => !!value)
      .filter((repoId, index, list) => list.indexOf(repoId) === index);

    const primaryRepoIds = rankedRequiredRepoIds.slice(0, 3);
    const secondaryRepoIds = rankedRequiredRepoIds.slice(3);
    const effectiveScores = new Map<string, number>();

    for (const repoId of job.requiredRepoIds) {
      effectiveScores.set(repoId, this.resolveEffectiveStackScore(repoId, talent));
    }

    const matchedRepoIds = job.requiredRepoIds.filter((repoId) => (effectiveScores.get(repoId) ?? 0) > 0);
    const missingRepoIds = job.requiredRepoIds.filter((repoId) => !matchedRepoIds.includes(repoId));
    const primaryStackScore = this.scoreRequiredGroup(primaryRepoIds, job.techStack, effectiveScores);
    const secondaryStackScore = this.scoreRequiredGroup(secondaryRepoIds, job.techStack, effectiveScores);
    const stackScore = this.clampScore(Math.round((primaryStackScore * 0.88) + (secondaryStackScore * 0.12)));
    const experienceScore = this.scoreExperienceSignals(primaryRepoIds.length ? primaryRepoIds : job.requiredRepoIds, talent.experiences ?? []);
    const topStackCoverageBonus = this.scoreTopStackCoverage(primaryRepoIds, effectiveScores);
    const overallScore = this.clampScore(Math.round((stackScore * 0.78) + (experienceScore * 0.17) + topStackCoverageBonus));

    return {
      overallScore,
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

  resolveEffectiveStackScore(repoId: string, talent: MatchTalentProfile): number {
    const declaredScore = this.clampScore(talent.stackScores[repoId] ?? 0);
    const experienceMonths = this.getExperienceMonthsForRepo(repoId, talent.experiences ?? []);
    const inferredScore = this.inferStackLevelFromExperienceMonths(experienceMonths);

    if (experienceMonths <= 0) {
      return Math.min(declaredScore, 35);
    }

    const blended = Math.round((inferredScore * 0.82) + (declaredScore * 0.18));
    return this.clampScore(Math.min(blended, inferredScore + 8));
  }

  getExperienceMonthsForRepo(repoId: string, experiences: MatchExperienceSignal[]): number {
    return Math.round(experiences.reduce((total, experience) => {
      const repoIds = experience.appliedRepoIds?.length
        ? experience.appliedRepoIds
        : this.mapTechLabelsToRepoIds(experience.appliedStacks ?? []);

      if (!repoIds.includes(repoId)) {
        return total;
      }

      const months = Math.max(1, Number(experience.months ?? 0));
      const actuationFactor = Math.max(0.35, Math.min(1, Number(experience.actuation ?? 70) / 100));
      return total + (months * actuationFactor);
    }, 0));
  }

  inferStackLevelFromExperienceMonths(months: number): number {
    if (months >= 60) return 96;
    if (months >= 48) return 90;
    if (months >= 36) return 84;
    if (months >= 24) return 74;
    if (months >= 18) return 66;
    if (months >= 12) return 58;
    if (months >= 6) return 44;
    if (months >= 3) return 30;
    if (months > 0) return 18;
    return 0;
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
      const weightedMonths = Math.max(1, Math.round((Math.max(1, Number(experience.months ?? 0)) * Math.max(0.35, Math.min(1, Number(experience.actuation ?? 70) / 100)))));
      const monthsScore = Math.min(18, Math.round((weightedMonths / 48) * 18));
      const actuationScore = Math.min(6, Math.round((Math.max(10, Math.min(100, experience.actuation ?? 70)) / 100) * 6));
      const levelScore = Math.min(8, Math.round(this.scorePositionLevel(experience.positionLevel) / 3));

      return Math.round(
        (coverageByRequirement * 62)
        + (focusOnRequired * 14)
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

  private scoreRequiredGroup(
    repoIds: string[],
    techStack: TechStackItem[],
    effectiveScores: Map<string, number>,
  ): number {
    if (!repoIds.length) {
      return 0;
    }

    const weightByRepoId = new Map(
      techStack
        .map((item) => [this.mapPrimaryTechLabelToRepoId(item.name), this.clampScore(item.match)] as const)
        .filter((entry): entry is readonly [string, number] => !!entry[0]),
    );

    const totalWeight = repoIds.reduce((sum, repoId) => sum + (weightByRepoId.get(repoId) ?? 0), 0);
    if (totalWeight <= 0) {
      return this.average(repoIds.map((repoId) => effectiveScores.get(repoId) ?? 0));
    }

    const weightedCoverage = repoIds.reduce((sum, repoId) => {
      const requiredPercent = Math.max(1, weightByRepoId.get(repoId) ?? 0);
      const candidatePercent = effectiveScores.get(repoId) ?? 0;
      const coverage = Math.min(1, candidatePercent / requiredPercent);
      return sum + (coverage * requiredPercent);
    }, 0);

    return this.clampScore(Math.round((weightedCoverage / totalWeight) * 100));
  }

  private scoreTopStackCoverage(repoIds: string[], effectiveScores: Map<string, number>): number {
    if (!repoIds.length) {
      return 0;
    }

    const average = this.average(repoIds.map((repoId) => effectiveScores.get(repoId) ?? 0));
    if (average >= 85) {
      return 7;
    }
    if (average >= 75) {
      return 5;
    }
    if (average >= 60) {
      return 3;
    }
    if (average >= 45) {
      return 1;
    }
    return 0;
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

  private mapPrimaryTechLabelToRepoId(label: string): string | null {
    const normalized = this.normalizeText(label);

    for (const entry of this.techAliasMap) {
      if (entry.aliases.some((alias) => normalized.includes(alias))) {
        return entry.repoId;
      }
    }

    return null;
  }
}
