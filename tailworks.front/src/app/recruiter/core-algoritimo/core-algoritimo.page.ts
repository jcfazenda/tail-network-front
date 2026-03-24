import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthFacade } from '../../core/facades/auth.facade';
import { JobsFacade } from '../../core/facades/jobs.facade';
import { MatchingLabService } from '../../core/matching-lab/matching-lab.service';
import { MatchLabJob, MatchLabJobResult, MatchLabRankingEntry, MatchLabSeniority } from '../../core/matching-lab/matching-lab.models';
import { TalentSystemSeedService } from '../../talent/talent-system-seed.service';
import { EcosystemEntryService } from '../../usuario/home/ecosystem-entry.service';
import { AuthAccount } from '../../auth/mock-auth.service';
import { TalentProfileStoreService } from '../../talent/talent-profile-store.service';
import { CoreMatchSpotlightComponent, CoreMatchSpotlightViewModel } from './core-match-spotlight.component';
import { EmpresaDirectoryService } from '../../empresa/empresa-directory.service';
import { BrowserStorageService } from '../../core/storage/browser-storage.service';

@Component({
  standalone: true,
  selector: 'app-core-algoritimo-page',
  imports: [CommonModule, FormsModule, CoreMatchSpotlightComponent],
  templateUrl: './core-algoritimo.page.html',
  styleUrls: ['./core-algoritimo.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoreAlgoritimoPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authService = inject(AuthFacade);
  private readonly jobsFacade = inject(JobsFacade);
  private readonly ecosystemEntryService = inject(EcosystemEntryService);
  private readonly matchingLabService = inject(MatchingLabService);
  private readonly talentSystemSeedService = inject(TalentSystemSeedService);
  private readonly talentProfileStore = inject(TalentProfileStoreService);
  private readonly companyDirectoryService = inject(EmpresaDirectoryService);
  private readonly browserStorage = inject(BrowserStorageService);

  dataset = this.matchingLabService.getDataset();
  selectedJobId = this.dataset.jobs[0]?.id ?? '';
  searchTerm = '';
  candidateSearch = '';
  seniorityFilter: MatchLabSeniority | 'all' = 'all';
  scoreThreshold = 0;
  seedStatus = '';
  loginStatus = '';
  private refreshTimer: number | null = null;

  ngOnInit(): void {
    void this.refreshDatasetFromProfiles();
    if (typeof window !== 'undefined') {
      this.refreshTimer = window.setInterval(() => {
        void this.refreshDatasetFromProfiles(true);
      }, 4000);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.refreshTimer);
    }
  }

  get hasDataset(): boolean {
    return this.dataset.jobs.length > 0 && this.dataset.candidates.length > 0;
  }

  get jobs(): MatchLabJob[] {
    const query = this.searchTerm.trim().toLocaleLowerCase('pt-BR');
    if (!query) {
      return this.dataset.jobs;
    }

    return this.dataset.jobs.filter((job) =>
      `${job.title} ${job.company} ${job.location}`.toLocaleLowerCase('pt-BR').includes(query),
    );
  }

  get selectedResult(): MatchLabJobResult | null {
    return this.dataset.results.find((result) => result.job.id === this.selectedJobId) ?? this.dataset.results[0] ?? null;
  }

  get selectedJob(): MatchLabJob | null {
    return this.selectedResult?.job ?? null;
  }

  get spotlightEntry(): MatchLabRankingEntry | null {
    return this.visibleRanking[0] ?? this.selectedResult?.ranking[0] ?? null;
  }

  get spotlightViewModel(): CoreMatchSpotlightViewModel | null {
    return this.spotlightEntry ? this.buildSpotlightViewModel(this.spotlightEntry) : null;
  }

  get visibleSpotlights(): Array<{ entry: MatchLabRankingEntry; viewModel: CoreMatchSpotlightViewModel }> {
    return this.visibleRanking.map((entry) => ({
      entry,
      viewModel: this.buildSpotlightViewModel(entry),
    }));
  }

  get visibleRanking(): MatchLabRankingEntry[] {
    if (!this.selectedResult) {
      return [];
    }

    const query = this.candidateSearch.trim().toLocaleLowerCase('pt-BR');

    return this.selectedResult.ranking.filter((entry) => {
      if (this.seniorityFilter !== 'all' && entry.candidate.seniority !== this.seniorityFilter) {
        return false;
      }

      if (entry.score < this.scoreThreshold) {
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

  talentAccountForCandidate(entry: MatchLabRankingEntry): AuthAccount | null {
    const seededEmail = this.seededTalentEmail(entry);
    const byEmail = this.authService.listTalentAccounts().find((account) =>
      account.email.trim().toLocaleLowerCase('pt-BR') === seededEmail,
    );

    if (byEmail) {
      return byEmail;
    }

    const normalizedName = entry.candidate.name.trim().toLocaleLowerCase('pt-BR');
    return this.authService.listTalentAccounts().find((account) =>
      account.name.trim().toLocaleLowerCase('pt-BR') === normalizedName,
    ) ?? null;
  }

  candidateEmail(entry: MatchLabRankingEntry): string {
    return this.talentAccountForCandidate(entry)?.email ?? this.seededTalentEmail(entry);
  }

  get strongFitCount(): number {
    return this.visibleRanking.filter((entry) => entry.score >= 80).length;
  }

  get mediumFitCount(): number {
    return this.visibleRanking.filter((entry) => entry.score >= 60 && entry.score < 80).length;
  }

  get lowFitCount(): number {
    return this.visibleRanking.filter((entry) => entry.score < 60).length;
  }

  get averageScore(): number {
    const ranking = this.visibleRanking;
    if (!ranking.length) {
      return 0;
    }

    return Math.round(ranking.reduce((sum, entry) => sum + entry.score, 0) / ranking.length);
  }

  get filteredJobsCount(): number {
    return this.jobs.length;
  }

  get laboratoryStackPressure(): Array<{ name: string; percent: number }> {
    const stackMap = new Map<string, { total: number; count: number }>();
    for (const job of this.jobs) {
      for (const stack of [...job.topStacks, ...job.secondaryStacks]) {
        const current = stackMap.get(stack.stackName) ?? { total: 0, count: 0 };
        current.total += stack.percent;
        current.count += 1;
        stackMap.set(stack.stackName, current);
      }
    }

    return [...stackMap.entries()]
      .map(([name, value]) => ({
        name,
        percent: this.matchingStackPressurePercent(value.total, value.count),
      }))
      .sort((left, right) => right.percent - left.percent)
      .slice(0, 7);
  }

  get visibleRankingCount(): number {
    return this.visibleRanking.length;
  }

  get totalRankingCount(): number {
    return this.selectedResult?.ranking.length ?? 0;
  }

  selectJob(jobId: string): void {
    this.selectedJobId = jobId;
  }

  async resetDataset(): Promise<void> {
    await this.refreshDatasetFromProfiles(false);
    this.seedStatus = '';
  }

  async seedSystemTalents(): Promise<void> {
    const generated = this.matchingLabService.generateLocalMass();
    const jobs = await this.jobsFacade.seedJobsFromMatchingLab(generated);
    const result = await this.talentSystemSeedService.seedTalentsFromLab(generated);
    await this.refreshDatasetFromProfiles(false);
    this.seedStatus = `${result.companies} empresas, ${jobs} vagas, ${generated.candidates.length} candidatos, ${result.accounts} acessos e ${result.profiles} perfis preparados no sistema.`;
    this.loginStatus = '';
  }

  async clearLabLoad(): Promise<void> {
    this.matchingLabService.clear();
    await this.jobsFacade.clearJobsAndSync();
    await this.authService.clearTalentAccounts();
    await this.talentProfileStore.clear();
    this.companyDirectoryService.clearDirectory();
    this.browserStorage.removeByPrefixes([
      'tailworks.front.mock-vagas.',
      'tailworks:matching-lab-',
      'tailworks:matching-lab',
      'tailworks:company-directory',
      'tailworks:talent-directory',
      'tailworks:seeded-talent-profiles',
      'tailworks:candidate-',
      'tailworks.front.ecosystem-entry-mode',
      'tailworks:recruiter-workspace',
      'tailworks:recruiter-directory',
    ]);
    await this.refreshDatasetFromProfiles(false);
    this.seedStatus = 'Sistema operacional zerado: empresas, vagas, talentos e perfis removidos.';
    this.loginStatus = '';
  }

  private async refreshDatasetFromProfiles(silent = false): Promise<void> {
    const currentJobId = this.selectedJobId;
    await this.authService.syncAccountsFromRemote();
    await this.jobsFacade.syncFromRemote();
    await this.talentProfileStore.syncFromRemote();
    const next = this.matchingLabService.reset();
    this.dataset = next;
    this.selectedJobId = next.jobs.some((job) => job.id === currentJobId)
      ? currentJobId
      : next.jobs[0]?.id ?? '';
    if (!silent) {
      this.searchTerm = '';
      this.candidateSearch = '';
      this.seniorityFilter = 'all';
      this.scoreThreshold = 0;
    }
    this.cdr.markForCheck();
  }

  async signInAsTalent(account: AuthAccount): Promise<void> {
    const session = await this.authService.login(account.email, account.password);
    if (!session) {
      this.loginStatus = `Não foi possível entrar com ${account.name}.`;
      return;
    }

    this.ecosystemEntryService.setMode('talent');
    this.jobsFacade.signInAsTalent(session.name, session.location);
    this.loginStatus = `Entrando como ${account.name}.`;
    void this.router.navigateByUrl('/usuario/ecossistema');
  }

  async signInAsCandidateEntry(entry: MatchLabRankingEntry): Promise<void> {
    const account = this.talentAccountForCandidate(entry) ?? {
      id: `seeded-${entry.candidateId}`,
      name: entry.candidate.name,
      email: this.seededTalentEmail(entry),
      password: this.seededTalentPassword(entry),
      canUseRecruiter: false,
      canUseTalent: true,
      location: entry.candidate.location,
    };

    await this.signInAsTalent(account);
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

  scoreTone(score: number): 'high' | 'medium' | 'low' {
    if (score >= 80) {
      return 'high';
    }
    if (score >= 60) {
      return 'medium';
    }
    return 'low';
  }

  scoreThresholdLabel(): string {
    return `${this.scoreThreshold}%+`;
  }

  jobPrimaryStacks(job: MatchLabJob): Array<{ name: string; percent: number }> {
    return [...job.topStacks]
      .sort((left, right) => right.percent - left.percent)
      .slice(0, 3)
      .map((stack) => ({ name: stack.stackName, percent: stack.percent }));
  }

  jobBoostStacks(job: MatchLabJob): string[] {
    const topNames = new Set(job.topStacks.map((stack) => stack.stackId));
    return [...job.stacks]
      .filter((stack) => !topNames.has(stack.stackId))
      .sort((left, right) => right.percent - left.percent)
      .slice(0, 3)
      .map((stack) => `${stack.stackName} ${stack.percent}%`);
  }

  jobSalarySingle(job: MatchLabJob): string {
    if (job.salaryMax) {
      return job.salaryMax.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    if (job.salaryMin) {
      return job.salaryMin.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    return '';
  }

  jobWorkModelLabel(job: MatchLabJob): string {
    const value = (job.workModel || '').trim();
    if (!value) {
      return 'HOME';
    }

    if (value.toLocaleLowerCase('pt-BR').includes('hibr')) {
      return 'HIBRIDO';
    }

    if (value.toLocaleLowerCase('pt-BR').includes('pres')) {
      return 'PRESENCIAL';
    }

    return 'HOME';
  }

  stackPressureWidth(percent: number): number {
    return Math.max(8, Math.min(100, percent));
  }

  trackCandidate(_index: number, item: { entry: MatchLabRankingEntry; viewModel: CoreMatchSpotlightViewModel }): string {
    return item.entry.candidateId;
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  candidateRole(entry: MatchLabRankingEntry): string {
    const topStack = [...entry.candidate.stacks].sort((left, right) => right.percent - left.percent)[0]?.stackName;
    return topStack ? `${entry.candidate.seniority} · ${topStack}` : entry.candidate.seniority;
  }

  vacancyStacks(entry: MatchLabRankingEntry): MatchLabRankingEntry['debug']['stackBreakdown'] {
    return [...entry.debug.stackBreakdown]
      .filter((item) => item.vacancyPercent > 0)
      .sort((left, right) => right.vacancyPercent - left.vacancyPercent)
      .slice(0, 3);
  }

  candidateStacks(entry: MatchLabRankingEntry): MatchLabRankingEntry['debug']['stackBreakdown'] {
    return [...entry.debug.stackBreakdown]
      .filter((item) => item.candidatePercent > 0)
      .sort((left, right) => right.candidatePercent - left.candidatePercent)
      .slice(0, 3);
  }

  experienceStacks(entry: MatchLabRankingEntry): MatchLabRankingEntry['debug']['stackBreakdown'] {
    return [...entry.debug.stackBreakdown]
      .filter((item) => item.candidateExperienceMonths > 0)
      .sort((left, right) => right.candidateExperienceMonths - left.candidateExperienceMonths)
      .slice(0, 3);
  }

  breakdownStacks(entry: MatchLabRankingEntry): MatchLabRankingEntry['debug']['stackBreakdown'] {
    return [...entry.debug.stackBreakdown]
      .filter((item) => item.vacancyPercent > 0)
      .sort((left, right) => right.vacancyPercent - left.vacancyPercent)
      .slice(0, 5);
  }

  experienceBarWidth(entry: MatchLabRankingEntry, months: number): number {
    const topMonths = this.experienceStacks(entry)[0]?.candidateExperienceMonths ?? 0;
    if (!topMonths || !months) {
      return 8;
    }
    return Math.max(8, Math.round((months / topMonths) * 100));
  }

  experienceStackPercent(entry: MatchLabRankingEntry, months: number): number {
    return this.experienceBarWidth(entry, months);
  }

  summaryPercent(count: number): number {
    if (!this.visibleRankingCount) {
      return 0;
    }
    return Math.round((count / this.visibleRankingCount) * 100);
  }

  contributionSegments(entry: MatchLabRankingEntry): Array<{ label: string; width: number; tone: string }> {
    const segments = [
      { label: 'Primary', value: entry.debug.primaryScore, tone: 'high' },
      { label: 'Secondary', value: entry.debug.secondaryScore, tone: 'medium' },
      { label: 'Experience', value: entry.debug.experienceScore, tone: 'accent' },
      { label: 'Coherence', value: entry.debug.coherenceScore + entry.debug.seniorityScore, tone: 'neutral' },
    ];
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    return segments.map((segment) => ({
      label: segment.label,
      tone: segment.tone,
      width: total > 0 ? Math.max(6, Math.round((segment.value / total) * 100)) : 0,
    }));
  }

  jobAverage(jobId: string): number {
    const result = this.dataset.results.find((item) => item.job.id === jobId);
    if (!result?.ranking.length) {
      return 0;
    }
    return Math.round(result.ranking.reduce((sum, entry) => sum + entry.score, 0) / result.ranking.length);
  }

  jobCandidateCount(jobId: string): number {
    const syncedJob = this.jobsFacade.getJobById(jobId) ?? this.jobsFacade.getJobById(`lab-${jobId}`);
    if (syncedJob) {
      return Math.max(0, syncedJob.radarCount ?? 0);
    }

    const result = this.dataset.results.find((item) => item.job.id === jobId);
    const threshold = result ? this.jobRadarAdherenceThreshold(result.job) : 50;

    return result?.ranking
      .filter((entry) => entry.score >= threshold)
      .length ?? 0;
  }

  scoreIcon(score: number): string {
    if (score >= 80) {
      return 'trending_up';
    }
    if (score >= 60) {
      return 'trending_flat';
    }
    return 'south';
  }

  decisiveStackLabels(entry: MatchLabRankingEntry): string[] {
    return entry.debug.stackBreakdown
      .filter((item) => item.band === 'primary' && item.candidatePercent > 0)
      .sort((left, right) => right.weightedContribution - left.weightedContribution)
      .slice(0, 3)
      .map((item) => `${item.stackName} ${item.candidatePercent}%`);
  }

  currentStackLabels(entry: MatchLabRankingEntry): string[] {
    return [...entry.candidate.stacks]
      .sort((left, right) => right.percent - left.percent)
      .slice(0, 4)
      .map((item) => `${item.stackName} ${item.percent}%`);
  }

  experienceStackLabels(entry: MatchLabRankingEntry): string[] {
    return entry.debug.stackBreakdown
      .filter((item) => item.candidateExperienceMonths > 0)
      .sort((left, right) => right.candidateExperienceMonths - left.candidateExperienceMonths)
      .slice(0, 4)
      .map((item) => `${item.stackName} ${item.candidateExperienceMonths}m`);
  }

  sourceTagLabel(item: MatchLabRankingEntry['debug']['stackBreakdown'][number]): string {
    if (item.candidatePercent > 0 && item.candidateExperienceMonths > 0) {
      return 'Cadastro + experiência';
    }
    if (item.candidateExperienceMonths > 0) {
      return 'Experiência';
    }
    if (item.candidatePercent > 0) {
      return 'Cadastro';
    }
    return 'Sem aderência';
  }

  strengthLabel(value: number): string {
    if (value >= 85) {
      return 'Alta';
    }
    if (value >= 60) {
      return 'Média';
    }
    return 'Baixa';
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

  private buildSpotlightViewModel(entry: MatchLabRankingEntry): CoreMatchSpotlightViewModel {
    return {
      avatar: this.initials(entry.candidate.name),
      candidateName: entry.candidate.name,
      candidateMeta: `${entry.candidate.location} , ${entry.candidate.seniority}`,
      candidateRole: entry.candidate.summary,
      score: entry.score,
      scoreBarPercent: entry.score,
      scoreLabel: this.scoreLabel(entry.score),
      scoreTone: this.scoreTone(entry.score),
      requirements: this.vacancyStacks(entry).map((stack) => ({
        label: stack.stackName,
        minimumPercent: stack.vacancyPercent,
        checked: stack.candidatePercent >= stack.vacancyPercent,
      })),
      companyExperiencePercent: this.spotlightExperiencePercent(entry),
      skills: this.candidateStacks(entry).map((stack) => ({
        label: stack.stackName,
        percent: stack.candidatePercent,
      })),
      alternativeTasks: this.buildAlternativeTasks(entry),
      breakdownRows: this.breakdownStacks(entry).map((item) => ({
        label: item.stackName,
        source: this.sourceTagLabel(item),
        candidatePercent: item.candidatePercent,
        vacancyPercent: item.vacancyPercent,
        strengthLabel: this.strengthLabel(item.weightedContribution),
        strengthPercent: item.weightedContribution,
        hasCheck: item.candidateExperienceMonths > 0,
        timeLabel: `${item.candidateExperienceMonths}m`,
      })),
      contributionSegments: this.contributionSegments(entry).map((segment) => ({
        width: segment.width,
        tone: segment.tone,
      })),
      insights: [
        {
          label: 'Principal gap',
          value: this.spotlightGap(entry),
        },
        {
          label: 'Maior força',
          value: this.spotlightStrength(entry),
          warm: true,
        },
      ],
    };
  }

  private buildAlternativeTasks(entry: MatchLabRankingEntry): string[] {
    const tasks: string[] = [];
    const relevantByStackId = new Map(entry.debug.stackBreakdown.map((item) => [item.stackId, item]));

    for (const experience of entry.candidate.experiences) {
      const relevantStacks = experience.stackIds
        .map((stackId) => relevantByStackId.get(stackId))
        .filter((item): item is NonNullable<typeof item> => !!item)
        .sort((left, right) => right.weightedContribution - left.weightedContribution)
        .slice(0, 2);

      if (!relevantStacks.length) {
        continue;
      }

      const names = relevantStacks.map((item) => item.stackName).join(' e ');
      tasks.push(`Experiência com ${names} na ${experience.company}.`);
    }

    const mainGap = [...entry.debug.stackBreakdown]
      .filter((item) => item.vacancyPercent > item.candidatePercent)
      .sort((left, right) => (right.vacancyPercent - right.candidatePercent) - (left.vacancyPercent - left.candidatePercent))[0];

    if (mainGap) {
      tasks.push(`Reforçar ${mainGap.stackName} para se aproximar dos ${mainGap.vacancyPercent}% da vaga.`);
    }

    const strongest = [...entry.debug.stackBreakdown]
      .filter((item) => item.candidateExperienceMonths > 0)
      .sort((left, right) => right.candidateExperienceMonths - left.candidateExperienceMonths)[0];

    if (strongest) {
      tasks.push(`Uso prático de ${strongest.stackName} por ${strongest.candidateExperienceMonths}m.`);
    }

    return Array.from(new Set(tasks)).slice(0, 3);
  }

  private matchingStackPressurePercent(totalPercent: number, occurrenceCount: number): number {
    if (!occurrenceCount) {
      return 0;
    }

    return Math.round(Math.max(0, Math.min(100, totalPercent / occurrenceCount)));
  }

  private jobRadarAdherenceThreshold(job: MatchLabJob): number {
    const primaryStacks = [...job.topStacks]
      .filter((stack) => Number.isFinite(stack.percent) && stack.percent > 0)
      .sort((left, right) => right.percent - left.percent)
      .slice(0, 3);

    if (!primaryStacks.length) {
      return 50;
    }

    const average = primaryStacks.reduce((sum, stack) => sum + stack.percent, 0) / primaryStacks.length;
    return Math.max(35, Math.min(95, Math.round(average)));
  }

  trackRanking(_index: number, entry: MatchLabRankingEntry): string {
    return entry.candidateId;
  }

  spotlightPrimaryPercent(entry: MatchLabRankingEntry): number {
    return this.normalizeMetric(entry.debug.primaryScore, 55);
  }

  spotlightSecondaryPercent(entry: MatchLabRankingEntry): number {
    return this.normalizeMetric(entry.debug.secondaryScore, 20);
  }

  spotlightExperiencePercent(entry: MatchLabRankingEntry): number {
    return this.normalizeMetric(entry.debug.experienceScore, 15);
  }

  spotlightExperienceYears(entry: MatchLabRankingEntry): number {
    const topMonths = this.experienceStacks(entry)[0]?.candidateExperienceMonths ?? 0;
    return Math.max(1, Math.round(topMonths / 12));
  }

  spotlightGap(entry: MatchLabRankingEntry): string {
    const gap = [...entry.debug.stackBreakdown]
      .filter((item) => item.vacancyPercent > 0 && item.candidatePercent === 0)
      .sort((left, right) => right.vacancyPercent - left.vacancyPercent)[0];

    return gap ? `${gap.stackName} sem aderência` : 'Gap crítico não identificado';
  }

  spotlightStrength(entry: MatchLabRankingEntry): string {
    const best = [...entry.debug.stackBreakdown]
      .sort((left, right) => right.weightedContribution - left.weightedContribution)[0];

    return best ? `${best.stackName} + experiência prática` : 'Perfil equilibrado';
  }

  private normalizeMetric(value: number, max: number): number {
    if (!max) {
      return 0;
    }

    return Math.max(8, Math.min(100, Math.round((value / max) * 100)));
  }

  private seededTalentEmail(entry: MatchLabRankingEntry): string {
    const index = this.seededTalentIndex(entry);
    return `${this.slug(entry.candidate.name)}.${index}@talent.local`;
  }

  private seededTalentPassword(entry: MatchLabRankingEntry): string {
    return `talento@${String(this.seededTalentIndex(entry)).padStart(3, '0')}`;
  }

  private seededTalentIndex(entry: MatchLabRankingEntry): number {
    const match = entry.candidateId.match(/(\d+)$/);
    return Number(match?.[1] ?? '0');
  }

  private slug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '');
  }
}
