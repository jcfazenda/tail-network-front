import {
  MatchLabCandidate,
  MatchLabJob,
  MatchLabJobResult,
  MatchLabRankingEntry,
  MatchLabScoreDebug,
  MatchLabSeniority,
  MatchLabStackContribution,
  MatchLabStackWeight,
} from './matching-lab.models';

export class MatchingLabEngine {
  rankCandidatesForJob(job: MatchLabJob, candidates: MatchLabCandidate[]): MatchLabJobResult {
    const ranking = candidates
      .map((candidate) => this.scoreCandidate(job, candidate))
      .sort((left, right) =>
        right.score - left.score
        || right.debug.primaryScore - left.debug.primaryScore
        || right.debug.experienceScore - left.debug.experienceScore
        || right.debug.secondaryScore - left.debug.secondaryScore
        || left.candidate.name.localeCompare(right.candidate.name, 'pt-BR'),
      );

    return { job, ranking };
  }

  private scoreCandidate(job: MatchLabJob, candidate: MatchLabCandidate): MatchLabRankingEntry {
    const candidateStackMap = new Map(candidate.stacks.map((stack) => [stack.stackId, stack]));
    const experienceMonthsMap = this.buildExperienceMonthsMap(candidate);
    const stackBreakdown = job.stacks.map((jobStack) =>
      this.buildStackContribution(jobStack, candidateStackMap.get(jobStack.stackId), experienceMonthsMap.get(jobStack.stackId) ?? 0),
    );

    const primaryScore = this.sumContribution(stackBreakdown, 'primary', 55);
    const secondaryScore = this.sumContribution(stackBreakdown, 'secondary', 20);
    const experienceScore = this.computeExperienceScore(job, stackBreakdown);
    const seniorityScore = this.computeSeniorityScore(job.seniority, candidate.seniority);
    const coherenceScore = this.computeCoherenceScore(job, candidate, stackBreakdown);
    const totalScore = this.round(primaryScore + secondaryScore + experienceScore + seniorityScore + coherenceScore);

    return {
      jobId: job.id,
      candidateId: candidate.id,
      score: totalScore,
      candidate,
      debug: {
        primaryScore: this.round(primaryScore),
        secondaryScore: this.round(secondaryScore),
        experienceScore: this.round(experienceScore),
        seniorityScore: this.round(seniorityScore),
        coherenceScore: this.round(coherenceScore),
        totalScore,
        reasons: this.buildReasons(job, candidate, stackBreakdown, totalScore),
        stackBreakdown,
      },
    };
  }

  private buildStackContribution(
    jobStack: MatchLabStackWeight,
    candidateStack: MatchLabStackWeight | undefined,
    candidateExperienceMonths: number,
  ): MatchLabStackContribution {
    const candidatePercent = candidateStack?.percent ?? 0;
    const stackCoverage = Math.min(1, candidatePercent / Math.max(jobStack.percent, 1));
    const stackScore = this.round(stackCoverage * 100);
    const experienceScore = Math.min(100, Math.round(candidateExperienceMonths * 4));

    return {
      stackId: jobStack.stackId,
      stackName: jobStack.stackName,
      vacancyPercent: jobStack.percent,
      candidatePercent,
      candidateExperienceMonths,
      band: jobStack.band,
      stackScore,
      experienceScore,
      weightedContribution: this.round((stackScore * 0.72) + (experienceScore * 0.28)),
    };
  }

  private sumContribution(
    stackBreakdown: MatchLabStackContribution[],
    band: MatchLabStackContribution['band'],
    cap: number,
  ): number {
    const scoped = stackBreakdown.filter((item) => item.band === band);
    if (!scoped.length) {
      return 0;
    }

    const weightSum = scoped.reduce((sum, item) => sum + item.vacancyPercent, 0);
    const weighted = scoped.reduce((sum, item) => {
      const relativeWeight = item.vacancyPercent / weightSum;
      return sum + (item.weightedContribution * relativeWeight);
    }, 0);

    return (weighted / 100) * cap;
  }

  private computeExperienceScore(job: MatchLabJob, stackBreakdown: MatchLabStackContribution[]): number {
    const relevantStacks = stackBreakdown.filter((item) => item.band !== 'support');
    if (!relevantStacks.length) {
      return 0;
    }

    const avgMonths = relevantStacks.reduce((sum, item) => sum + item.candidateExperienceMonths, 0) / relevantStacks.length;
    const top3Coverage = job.topStacks.filter((stack) =>
      relevantStacks.some((item) => item.stackId === stack.stackId && item.candidateExperienceMonths >= 10),
    ).length;

    const monthsScore = Math.min(12, avgMonths / 2);
    const top3Bonus = top3Coverage * 1;
    return this.round(Math.min(15, monthsScore + top3Bonus));
  }

  private computeSeniorityScore(jobSeniority: MatchLabSeniority, candidateSeniority: MatchLabSeniority): number {
    const ladder: MatchLabSeniority[] = ['Junior', 'Pleno', 'Senior', 'Especialista'];
    const gap = Math.abs(ladder.indexOf(jobSeniority) - ladder.indexOf(candidateSeniority));

    if (gap === 0) {
      return 5;
    }
    if (gap === 1) {
      return 3.2;
    }
    if (gap === 2) {
      return 1.4;
    }
    return 0.4;
  }

  private computeCoherenceScore(
    job: MatchLabJob,
    candidate: MatchLabCandidate,
    stackBreakdown: MatchLabStackContribution[],
  ): number {
    const hasStrongPrimary = job.topStacks.some((stack) =>
      stackBreakdown.some((item) => item.stackId === stack.stackId && item.candidatePercent >= 70),
    );
    const breadth = candidate.stacks.filter((stack) => stack.percent >= 40).length;
    const secondaryHits = stackBreakdown.filter((item) => item.band === 'secondary' && item.candidatePercent >= 30).length;

    let score = 0;
    if (hasStrongPrimary) {
      score += 2.2;
    }
    if (breadth >= 4) {
      score += 1.6;
    }
    score += Math.min(1.2, secondaryHits * 0.4);

    return this.round(Math.min(5, score));
  }

  private buildReasons(
    job: MatchLabJob,
    candidate: MatchLabCandidate,
    stackBreakdown: MatchLabStackContribution[],
    totalScore: number,
  ): string[] {
    const topMatches = stackBreakdown
      .filter((item) => item.candidatePercent > 0)
      .sort((left, right) => right.weightedContribution - left.weightedContribution)
      .slice(0, 3);

    const reasons = topMatches.map((item) =>
      `${item.stackName}: vaga ${item.vacancyPercent}% · talento ${item.candidatePercent}% · experiência ${item.candidateExperienceMonths}m`,
    );

    if (job.seniority === candidate.seniority) {
      reasons.push(`Senioridade coerente: ${candidate.seniority}`);
    }

    reasons.push(`Score final ${totalScore}%`);
    return reasons;
  }

  private buildExperienceMonthsMap(candidate: MatchLabCandidate): Map<string, number> {
    const monthsMap = new Map<string, number>();

    for (const experience of candidate.experiences) {
      const months = this.monthDiff(experience.start, experience.end);
      for (const stackId of experience.stackIds) {
        monthsMap.set(stackId, (monthsMap.get(stackId) ?? 0) + months);
      }
    }

    return monthsMap;
  }

  private monthDiff(start: string, end?: string): number {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date('2026-03-01');
    const diffMonths = ((endDate.getFullYear() - startDate.getFullYear()) * 12) + (endDate.getMonth() - startDate.getMonth());
    return Math.max(1, diffMonths);
  }

  private round(value: number): number {
    return Math.round(value * 10) / 10;
  }
}
