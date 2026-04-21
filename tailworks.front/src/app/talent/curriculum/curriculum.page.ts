import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { MatStepperModule } from '@angular/material/stepper';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { combineLatest, Subject } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { JobsFacade } from '../../core/facades/jobs.facade';
import { CandidateStage, MockJobCandidate } from '../../vagas/data/vagas.models';
import { SeededExperienceDraft, SeededTalentProfile, TalentProfileStoreService } from '../talent-profile-store.service';

interface CurriculumJourneyStep {
  stepNumber: number;
  label: string;
  ownerText: string;
  description: string;
  requiredDocuments?: string[];
  dateLabel: string;
  hourLabel: string;
  timeLabel?: string;
  completed: boolean;
  active: boolean;
}

interface CurriculumJourneyViewModel {
  activeIndex: number;
  currentStageLabel: string;
  steps: CurriculumJourneyStep[];
  statusAlertIcon: string;
  statusAlertMessage: string;
}

interface CurriculumJourneyActionsViewModel {
  showAdvanceToProcess: boolean;
  showRequestHiring: boolean;
  showValidateDocuments: boolean;
  disableValidateDocuments: boolean;
}

type CurriculumDocumentReviewDecision = 'accepted' | 'rejected' | null;

interface CurriculumDocumentStatusItem {
  label: string;
  sent: boolean;
  reviewDecision: CurriculumDocumentReviewDecision;
}

type CurriculumSkillItem = {
  label: string;
  score: number;
};

type CurriculumEducationItem = {
  title: string;
  meta: string;
  description: string;
};

type CurriculumExperienceItem = {
  title: string;
  meta: string;
  description: string;
  highlights: string[];
};

type CurriculumProfileViewModel = {
  avatarUrl: string;
  name: string;
  roleTitle: string;
  profileCopy: string;
  contactItems: Array<{ icon: string; label: string }>;
  socialLinks: Array<{ icon: string; label: string }>;
  personalSkills: Array<{ label: string; score: number }>;
  education: CurriculumEducationItem[];
  professionalSkills: CurriculumSkillItem[];
  proficiencies: CurriculumSkillItem[];
  experiences: CurriculumExperienceItem[];
};

@Component({
  standalone: true,
  selector: 'app-curriculum-page',
  imports: [CommonModule, MatStepperModule],
  templateUrl: './curriculum.page.html',
  styleUrl: './curriculum.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurriculumPage {
  private readonly route = inject(ActivatedRoute);
  private readonly jobsFacade = inject(JobsFacade);
  private readonly talentProfileStore = inject(TalentProfileStoreService);
  private readonly cdr = inject(ChangeDetectorRef);
  private journeySelectionKey = '';
  private documentReviewContextKey = '';
  private readonly documentReviewDecisions = new Map<string, Exclude<CurriculumDocumentReviewDecision, null>>();
  private readonly documentReviewRefresh$ = new Subject<void>();
  documentsModalOpen = false;
  hireCandidateModalOpen = false;
  journeySelectedIndex: number | null = null;
  private readonly jobsRefresh$ = this.jobsFacade.jobsChanged$.pipe(startWith(null));

  readonly candidateName$ = this.route.queryParamMap.pipe(
    map((params) => params.get('name')?.trim() || 'Candidato em análise'),
  );

  readonly curriculumProfile$ = this.route.queryParamMap.pipe(
    map((params) => {
      const candidateName = params.get('name')?.trim() || '';
      const profile = candidateName ? this.talentProfileStore.findProfileByName(candidateName) : null;
      return this.buildCurriculumProfileView(profile, candidateName, this.readCandidateOverrides(params));
    }),
  );

  readonly candidateJourney$ = combineLatest([
    this.route.queryParamMap,
    this.jobsRefresh$,
  ]).pipe(
    map(([params]) => {
      const jobId = params.get('jobId')?.trim() || '';
      const candidateId = params.get('candidate')?.trim() || '';
      const candidateName = params.get('name')?.trim() || '';
      const journey = this.buildCandidateJourneyView(jobId, candidateId, candidateName);
      if (journey) {
        const nextKey = `${journey.currentStageLabel}|${journey.steps.map((item) => `${item.label}:${item.completed}:${item.active}`).join('|')}`;
        if (this.journeySelectionKey !== nextKey) {
          this.journeySelectionKey = nextKey;
          this.journeySelectedIndex = journey.activeIndex;
        }
      }
      return journey;
    }),
  );

  readonly candidateJourneyActions$ = combineLatest([
    this.route.queryParamMap,
    this.jobsRefresh$,
    this.documentReviewRefresh$.pipe(startWith(null)),
  ]).pipe(
    map(([params]) => {
      const context = this.resolveJourneyContext(
        params.get('jobId')?.trim() || '',
        params.get('candidate')?.trim() || '',
        params.get('name')?.trim() || '',
      );

      if (!context) {
        return {
          showAdvanceToProcess: false,
          showRequestHiring: false,
          showValidateDocuments: false,
          disableValidateDocuments: true,
        } satisfies CurriculumJourneyActionsViewModel;
      }

      const stage = this.jobsFacade.getEffectiveCandidateStage(context.candidate);
      const workflow = this.jobsFacade.getRecruiterWorkflowActions(stage);
      const documentStatus = this.buildCandidateDocumentStatus(context.job, context.candidate);

      return {
        showAdvanceToProcess: workflow.advanceToProcess,
        showRequestHiring: workflow.requestHiring,
        showValidateDocuments: workflow.hireCandidate,
        disableValidateDocuments: workflow.hireCandidate
          ? !documentStatus.length || documentStatus.some((item) => !item.sent || item.reviewDecision !== 'accepted')
          : true,
      } satisfies CurriculumJourneyActionsViewModel;
    }),
  );

  readonly candidateDocumentStatus$ = combineLatest([
    this.route.queryParamMap,
    this.jobsRefresh$,
    this.documentReviewRefresh$.pipe(startWith(null)),
  ]).pipe(
    map(([params]) => {
      const context = this.resolveJourneyContext(
        params.get('jobId')?.trim() || '',
        params.get('candidate')?.trim() || '',
        params.get('name')?.trim() || '',
      );

      if (!context) {
        return [];
      }

      return this.buildCandidateDocumentStatus(context.job, context.candidate);
    }),
  );

  readonly focusedJob$ = this.route.queryParamMap.pipe(
    map((params) => {
      const id = params.get('jobId')?.trim() || '';
      const title = params.get('jobTitle')?.trim() || '';
      const company = params.get('jobCompany')?.trim() || '';

      if (!id && !title && !company) {
        return null;
      }

      return {
        id,
        title,
        company,
        location: params.get('jobLocation')?.trim() || '',
        workModel: params.get('jobWorkModel')?.trim() || '',
        salary: params.get('jobSalary')?.trim() || '',
        contractType: params.get('jobContractType')?.trim() || '',
        logo: params.get('jobLogo')?.trim() || '',
      };
    }),
  );

  experienceCompanyLine(meta: string): string {
    const parts = meta.split('|').map((part) => part.trim()).filter(Boolean);
    return parts.slice(0, -1).join(' / ') || meta;
  }

  experienceDateLine(meta: string): string {
    const parts = meta.split('|').map((part) => part.trim()).filter(Boolean);
    return parts.at(-1) ?? meta;
  }

  skillVisualTone(score: number): 'high' | 'medium' | 'soft' | 'muted' {
    if (score >= 88) {
      return 'high';
    }

    if (score >= 74) {
      return 'medium';
    }

    if (score >= 60) {
      return 'soft';
    }

    return 'muted';
  }

  private sortSkillsByScore(items: Array<{ label: string; score: number }>): Array<{ label: string; score: number }> {
    return items.slice().sort((left, right) => right.score - left.score || left.label.localeCompare(right.label, 'pt-BR'));
  }

  personalSkillDots(score: number): boolean[] {
    const filled = Math.max(1, Math.min(5, Math.round(score / 20)));
    return Array.from({ length: 5 }, (_, index) => index < filled);
  }

  focusedJobLogoLabel(title: string): string {
    const initial = title
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .find(Boolean);

    return (initial || title.slice(0, 1) || 'V').toUpperCase();
  }

  resolveJourneySelectedIndex(journey: CurriculumJourneyViewModel | null): number {
    if (!journey) {
      return 0;
    }

    if (this.journeySelectedIndex === null || this.journeySelectedIndex >= journey.steps.length) {
      this.journeySelectedIndex = journey.activeIndex;
    }

    return this.journeySelectedIndex;
  }

  onJourneySelectionChange(index: number): void {
    this.journeySelectedIndex = index;
  }

  openDocumentsModal(): void {
    this.documentsModalOpen = true;
    this.cdr.markForCheck();
  }

  closeDocumentsModal(): void {
    this.documentsModalOpen = false;
    this.cdr.markForCheck();
  }

  openHireCandidateModal(): void {
    this.hireCandidateModalOpen = true;
    this.cdr.markForCheck();
  }

  closeHireCandidateModal(): void {
    this.hireCandidateModalOpen = false;
    this.cdr.markForCheck();
  }

  advanceCandidateToProcess(): void {
    const params = this.route.snapshot.queryParamMap;
    const context = this.resolveJourneyContext(
      params.get('jobId')?.trim() || '',
      params.get('candidate')?.trim() || '',
      params.get('name')?.trim() || '',
    );

    if (!context) {
      return;
    }

    const stage = this.jobsFacade.getEffectiveCandidateStage(context.candidate);
    const workflow = this.jobsFacade.getRecruiterWorkflowActions(stage);
    if (!workflow.advanceToProcess) {
      return;
    }

    this.jobsFacade.updateCandidateStage(
      context.job.id,
      context.candidate.id ?? context.candidate.name,
      'processo',
    );
  }

  requestCandidateHiring(): void {
    const params = this.route.snapshot.queryParamMap;
    const context = this.resolveJourneyContext(
      params.get('jobId')?.trim() || '',
      params.get('candidate')?.trim() || '',
      params.get('name')?.trim() || '',
    );

    if (!context) {
      return;
    }

    const stage = this.jobsFacade.getEffectiveCandidateStage(context.candidate);
    const workflow = this.jobsFacade.getRecruiterWorkflowActions(stage);
    if (!workflow.requestHiring) {
      return;
    }

    this.jobsFacade.updateCandidateStage(
      context.job.id,
      context.candidate.id ?? context.candidate.name,
      'aguardando',
    );
  }

  setCandidateDocumentReview(label: string, decision: Exclude<CurriculumDocumentReviewDecision, null>): void {
    const params = this.route.snapshot.queryParamMap;
    const context = this.resolveJourneyContext(
      params.get('jobId')?.trim() || '',
      params.get('candidate')?.trim() || '',
      params.get('name')?.trim() || '',
    );

    if (!context) {
      return;
    }

    const currentStatus = this.buildCandidateDocumentStatus(context.job, context.candidate);
    const target = currentStatus.find((item) => item.label === label);
    if (!target?.sent) {
      return;
    }

    this.documentReviewDecisions.set(label, decision);
    this.jobsFacade.updateCandidateDocumentReview(
      context.job.id,
      context.candidate.id ?? context.candidate.name,
      label,
      decision,
    );
    this.documentReviewRefresh$.next();
    this.cdr.markForCheck();
  }

  documentStatusIcon(label: string): string {
    const normalized = label.trim().toLocaleLowerCase('pt-BR');

    if (normalized.includes('resid')) {
      return 'home';
    }

    if (normalized.includes('ensino') || normalized.includes('escolar') || normalized.includes('médio')) {
      return 'school';
    }

    if (normalized.includes('certificado') || normalized.includes('diploma') || normalized.includes('universit')) {
      return 'workspace_premium';
    }

    if (normalized.includes('identidade') || normalized.includes('rg') || normalized.includes('cpf')) {
      return 'badge';
    }

    return 'description';
  }

  receivedDocumentsCount(items: CurriculumDocumentStatusItem[]): number {
    return items.filter((item) => item.sent).length;
  }

  rejectedDocumentsCount(items: CurriculumDocumentStatusItem[]): number {
    return items.filter((item) => item.reviewDecision === 'rejected').length;
  }

  canHireCandidateFromDocuments(items: CurriculumDocumentStatusItem[]): boolean {
    return !!items.length && items.every((item) => item.sent && item.reviewDecision === 'accepted');
  }

  canShowHireCandidateChip(items: CurriculumDocumentStatusItem[]): boolean {
    if (!this.canHireCandidateFromDocuments(items)) {
      return false;
    }

    const params = this.route.snapshot.queryParamMap;
    const context = this.resolveJourneyContext(
      params.get('jobId')?.trim() || '',
      params.get('candidate')?.trim() || '',
      params.get('name')?.trim() || '',
    );

    if (!context) {
      return false;
    }

    return this.jobsFacade.getEffectiveCandidateStage(context.candidate) !== 'contratado';
  }

  hireCandidateEmailSubject(): string {
    const candidateName = this.route.snapshot.queryParamMap.get('name')?.trim() || 'Candidato';
    const jobTitle = this.route.snapshot.queryParamMap.get('jobTitle')?.trim() || 'vaga';
    return `Confirmação final de contratação | ${candidateName} | ${jobTitle}`;
  }

  hireCandidateEmailPreview(): string[] {
    const params = this.route.snapshot.queryParamMap;
    const candidateName = params.get('name')?.trim() || 'Candidato';
    const jobTitle = params.get('jobTitle')?.trim() || 'vaga';
    const company = params.get('jobCompany')?.trim() || 'empresa';
    const location = params.get('jobLocation')?.trim() || 'local combinado';
    const contractType = params.get('jobContractType')?.trim() || 'contratação definida';

    return [
      `Olá ${candidateName},`,
      `encerramos a validação final do seu processo para a posição de ${jobTitle} na ${company}.`,
      `Seu fluxo foi aprovado até a última etapa e estamos prontos para registrar a contratação com base nas condições já alinhadas entre as partes.`,
      `Resumo final do fechamento:`,
      `• posição: ${jobTitle}`,
      `• empresa: ${company}`,
      `• localização: ${location}`,
      `• contratação: ${contractType}`,
      `Obrigado por seguir com a gente até aqui. Assim que o fechamento for confirmado no sistema, você receberá a comunicação final de boas-vindas e próximos passos.`,
    ];
  }

  currentRecruiterFirstName(): string {
    const fullName = this.jobsFacade.getCurrentRecruiterIdentity().name?.trim() || 'Recruiter';
    return fullName.split(/\s+/)[0] || 'Recruiter';
  }

  showContractedSuccessArt(): boolean {
    const params = this.route.snapshot.queryParamMap;
    const context = this.resolveJourneyContext(
      params.get('jobId')?.trim() || '',
      params.get('candidate')?.trim() || '',
      params.get('name')?.trim() || '',
    );

    if (!context) {
      return false;
    }

    return this.jobsFacade.getEffectiveCandidateStage(context.candidate) === 'contratado';
  }

  sendHiringConfirmationEmail(): void {
    const params = this.route.snapshot.queryParamMap;
    const context = this.resolveJourneyContext(
      params.get('jobId')?.trim() || '',
      params.get('candidate')?.trim() || '',
      params.get('name')?.trim() || '',
    );

    if (!context) {
      return;
    }

    const documentStatus = this.buildCandidateDocumentStatus(context.job, context.candidate);
    const canHireCandidate = this.canHireCandidateFromDocuments(documentStatus);
    if (!canHireCandidate) {
      return;
    }

    this.jobsFacade.updateCandidateStage(
      context.job.id,
      context.candidate.id ?? context.candidate.name,
      'contratado',
    );

    this.documentsModalOpen = false;
    this.closeHireCandidateModal();
  }

  validateCandidateDocuments(): void {
    const params = this.route.snapshot.queryParamMap;
    const context = this.resolveJourneyContext(
      params.get('jobId')?.trim() || '',
      params.get('candidate')?.trim() || '',
      params.get('name')?.trim() || '',
    );

    if (!context) {
      return;
    }

    const stage = this.jobsFacade.getEffectiveCandidateStage(context.candidate);
    const workflow = this.jobsFacade.getRecruiterWorkflowActions(stage);
    const documentStatus = this.buildCandidateDocumentStatus(context.job, context.candidate);
    const canValidateDocuments = documentStatus.length > 0
      && documentStatus.every((item) => item.sent && item.reviewDecision === 'accepted');

    if (!workflow.hireCandidate || !canValidateDocuments) {
      return;
    }

    this.jobsFacade.updateCandidateStage(
      context.job.id,
      context.candidate.id ?? context.candidate.name,
      'contratado',
    );
  }

  curriculumAvatarLabel(name: string): string {
    const initial = name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .find(Boolean);

    return (initial || name.slice(0, 1) || 'C').toUpperCase();
  }

  private buildCurriculumProfileView(
    profile: SeededTalentProfile | null,
    candidateName: string,
    overrides: {
      avatarUrl?: string;
      roleTitle?: string;
      location?: string;
      summary?: string;
    } = {},
  ): CurriculumProfileViewModel {
    if (!profile) {
      return this.buildFallbackCurriculumProfile(candidateName, overrides);
    }

    const basic = profile.basicDraft.profile ?? {};
    const latestExperience = profile.experiencesDraft[0];
    const aggregatedStacks = this.talentProfileStore.aggregateStacksFromExperiences(profile.experiencesDraft);
    const professionalSkills = aggregatedStacks.slice(0, 8).map((item) => ({
      label: item.name,
      score: item.knowledge,
    }));
    const proficiencies = [...(profile.stacksDraft.primary ?? []), ...(profile.stacksDraft.extra ?? [])]
      .map((item) => ({
        label: item.name,
        score: Math.max(0, Math.min(100, Math.round(Number(item.knowledge ?? 0)))),
      }))
      .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label, 'pt-BR'))
      .slice(0, 8);

    return {
      avatarUrl: overrides.avatarUrl?.trim() || profile.basicDraft.photoPreviewUrl?.trim() || '/assets/avatars/john-doe.jpeg',
      name: basic.name?.trim() || candidateName || 'Candidato em análise',
      roleTitle: overrides.roleTitle?.trim() || latestExperience?.role?.trim() || 'Profissional em análise',
      profileCopy: overrides.summary?.trim()
        || latestExperience?.responsibilities?.trim()
        || `Perfil construído a partir das experiências e stacks cadastradas por ${basic.name?.trim() || 'este candidato'}.`,
      contactItems: this.buildContactItems(profile),
      socialLinks: this.buildSocialLinks(profile),
      personalSkills: this.buildPersonalSkills(profile),
      education: this.buildEducation(profile),
      professionalSkills: professionalSkills.length ? professionalSkills : proficiencies,
      proficiencies,
      experiences: profile.experiencesDraft
        .slice()
        .sort((left, right) => this.experienceSortValue(right) - this.experienceSortValue(left))
        .slice(0, 5)
        .map((experience) => this.toCurriculumExperienceItem(experience)),
    };
  }

  private buildFallbackCurriculumProfile(
    candidateName: string,
    overrides: {
      avatarUrl?: string;
      roleTitle?: string;
      location?: string;
      summary?: string;
    } = {},
  ): CurriculumProfileViewModel {
    return {
      avatarUrl: overrides.avatarUrl?.trim() || '/assets/avatars/john-doe.jpeg',
      name: candidateName || 'Candidato em análise',
      roleTitle: overrides.roleTitle?.trim() || 'Profissional em análise',
      profileCopy: overrides.summary?.trim()
        || (overrides.location?.trim()
          ? `Dados recebidos diretamente do contexto da vaga. Localização do candidato: ${overrides.location.trim()}.`
          : 'Os dados reais deste currículo ainda não foram encontrados no cadastro do candidato.'),
      contactItems: [
        { icon: 'location_on', label: overrides.location?.trim() || '' },
      ].filter((item) => !!item.label),
      socialLinks: [],
      personalSkills: [],
      education: [],
      professionalSkills: [],
      proficiencies: [],
      experiences: [],
    };
  }

  private buildContactItems(profile: SeededTalentProfile): Array<{ icon: string; label: string }> {
    const basic = profile.basicDraft.profile ?? {};
    return [
      { icon: 'call', label: basic.phone?.trim() || '' },
      { icon: 'mail', label: basic.email?.trim() || profile.email || '' },
      { icon: 'location_on', label: basic.location?.trim() || [basic.city?.trim(), basic.state?.trim()].filter(Boolean).join(' - ') },
      { icon: 'language', label: basic.portfolio?.trim() || '' },
    ].filter((item) => !!item.label);
  }

  private buildSocialLinks(profile: SeededTalentProfile): Array<{ icon: string; label: string }> {
    const basic = profile.basicDraft.profile ?? {};
    return [
      { icon: 'work', label: basic.linkedin?.trim() || '' },
      { icon: 'language', label: basic.portfolio?.trim() || '' },
    ].filter((item) => !!item.label);
  }

  private readCandidateOverrides(params: ParamMap): {
    avatarUrl?: string;
    roleTitle?: string;
    location?: string;
    summary?: string;
  } {
    return {
      avatarUrl: params.get('candidateAvatar')?.trim() || '',
      roleTitle: params.get('candidateRole')?.trim() || '',
      location: params.get('candidateLocation')?.trim() || '',
      summary: params.get('candidateSummary')?.trim() || '',
    };
  }

  private buildPersonalSkills(profile: SeededTalentProfile): Array<{ label: string; score: number }> {
    const experiences = profile.experiencesDraft;
    const averageActuation = experiences.length
      ? Math.round(experiences.reduce((sum, item) => sum + Math.max(10, Math.min(100, Number(item.actuation ?? 70))), 0) / experiences.length)
      : 0;
    const totalMonths = experiences.reduce((sum, item) => sum + this.getExperienceMonths(item), 0);
    const normalizedMonths = Math.max(45, Math.min(98, Math.round(Math.min(totalMonths, 144) / 144 * 100)));
    const seniorityBoost = experiences.some((item) => item.positionLevel === 'Tech Lead')
      ? 92
      : experiences.some((item) => item.positionLevel === 'Sênior')
        ? 84
        : experiences.some((item) => item.positionLevel === 'Pleno')
          ? 74
          : 62;

    return [
      { label: 'Atuação', score: averageActuation || 70 },
      { label: 'Consistência', score: normalizedMonths },
      { label: 'Senioridade', score: seniorityBoost },
    ];
  }

  private buildEducation(profile: SeededTalentProfile): CurriculumEducationItem[] {
    const formation = profile.formationCopy;
    if (!formation) {
      return [];
    }

    const items: CurriculumEducationItem[] = [];

    if (formation.graduation?.trim()) {
      items.push({
        title: formation.graduation.trim(),
        meta: this.buildFormationMeta(formation.startMonth, formation.startYear, formation.endMonth, formation.endYear, formation.graduated),
        description: formation.educationStatus?.trim() || 'Formação registrada no cadastro do candidato.',
      });
    }

    if (formation.specialization?.trim()) {
      items.push({
        title: formation.specialization.trim(),
        meta: formation.graduated === false ? 'Em andamento' : 'Especialização',
        description: 'Especialização informada pelo candidato durante o cadastro.',
      });
    }

    return items;
  }

  private buildFormationMeta(
    startMonth?: string,
    startYear?: string,
    endMonth?: string,
    endYear?: string,
    graduated?: boolean,
  ): string {
    const start = [startMonth?.trim(), startYear?.trim()].filter(Boolean).join(' ');
    const end = graduated === false ? 'Em andamento' : [endMonth?.trim(), endYear?.trim()].filter(Boolean).join(' ');
    return [start, end].filter(Boolean).join(' - ') || 'Formação';
  }

  private toCurriculumExperienceItem(experience: SeededExperienceDraft): CurriculumExperienceItem {
    const companyLine = [experience.company?.trim(), experience.workModel?.trim()].filter(Boolean).join(' / ');
    const dateLine = `${experience.startMonth} ${experience.startYear} - ${experience.currentlyWorkingHere ? 'Atual' : `${experience.endMonth} ${experience.endYear}`}`;
    const appliedStacks = (experience.appliedStacks ?? [])
      .slice()
      .sort((left, right) => Number(right.knowledge ?? 0) - Number(left.knowledge ?? 0))
      .slice(0, 3)
      .map((item) => `${item.name} ${Math.round(Number(item.knowledge ?? 0))}%`);

    return {
      title: experience.role?.trim() || 'Experiência registrada',
      meta: [companyLine, dateLine].filter(Boolean).join(' | '),
      description: experience.responsibilities?.trim() || 'Sem descrição detalhada.',
      highlights: appliedStacks.length ? appliedStacks : ['Sem stacks detalhadas nesta experiência.'],
    };
  }

  private experienceSortValue(experience: SeededExperienceDraft): number {
    const currentFlag = experience.currentlyWorkingHere ? 10_000_000 : 0;
    const endYear = Number(experience.currentlyWorkingHere ? '2026' : experience.endYear || '0');
    const endMonth = this.monthOrder(experience.currentlyWorkingHere ? 'Mar' : experience.endMonth);
    return currentFlag + (endYear * 100) + endMonth;
  }

  private getExperienceMonths(experience: SeededExperienceDraft): number {
    const start = this.toComparableMonth(experience.startYear, experience.startMonth);
    const end = experience.currentlyWorkingHere
      ? this.toComparableMonth('2026', 'Mar')
      : this.toComparableMonth(experience.endYear, experience.endMonth);

    if (!start || !end) {
      return 1;
    }

    return Math.max(1, end - start + 1);
  }

  private toComparableMonth(year?: string, month?: string): number {
    const parsedYear = Number(year ?? '');
    const parsedMonth = this.monthOrder(month);
    if (!Number.isFinite(parsedYear) || !parsedMonth) {
      return 0;
    }
    return (parsedYear * 12) + parsedMonth;
  }

  private monthOrder(month?: string): number {
    const map: Record<string, number> = {
      Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6,
      Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12, Atual: 3,
    };
    return map[month ?? ''] ?? 0;
  }

  private buildCandidateJourneyView(
    jobId: string,
    candidateId: string,
    candidateName: string,
  ): CurriculumJourneyViewModel | null {
    const context = this.resolveJourneyContext(jobId, candidateId, candidateName);
    if (!context) {
      return null;
    }

    const { job, candidate } = context;

    const stage = this.jobsFacade.getEffectiveCandidateStage(candidate) ?? 'radar';
    const activeIndex = this.getJourneyStageIndex(stage);
    const decisionAccepted = stage === 'aceito';
    const decisionNext = stage === 'proxima' || stage === 'cancelado';
    const hired = stage === 'contratado';
    const reviewingDocuments = stage === 'documentacao' || hired;
    const requiredDocuments = (job.hiringDocuments ?? []).map((item) => item.trim()).filter(Boolean);

    const steps = [
      {
        label: 'Talento no radar',
        description: 'O sistema encontrou esse talento no radar da vaga e ele ainda não iniciou candidatura.',
        ownerText: 'Movido pelo sistema',
      },
      {
        label: 'Candidatura enviada',
        description: 'O talento demonstrou interesse e a candidatura já entrou no seu funil.',
        ownerText: 'Ação do talento',
      },
      {
        label: 'Em processo',
        description: 'Você avançou o perfil para análise, conversa e próximas etapas do processo.',
        ownerText: 'Ação do recruiter',
      },
      {
        label: 'Contratação solicitada',
        description: 'A proposta ou solicitação final foi enviada e agora depende do retorno do talento.',
        ownerText: 'Ação do recruiter',
      },
      {
        label: decisionAccepted ? 'Aceito' : decisionNext ? 'Ficou pra próxima' : 'Aceito / Ficou pra próxima',
        description: decisionAccepted
          ? 'O talento aceitou a proposta e agora pode enviar os documentos da contratação.'
          : decisionNext
            ? 'Esse ciclo foi encerrado para esta vaga e o talento pode continuar elegível para novas oportunidades.'
            : 'Aqui o talento responde se aceita a proposta ou se prefere ficar para uma próxima oportunidade.',
        ownerText: 'Ação do talento',
      },
      {
        label: 'Validando documentos',
        description: 'Depois do envio dos documentos pelo talento, o recruiter revisa tudo e dá o ok para seguir.',
        ownerText: 'Ação do recruiter',
        requiredDocuments,
      },
      {
        label: decisionNext ? 'Não foi desta vez / segue no radar' : hired ? 'Contratado' : 'Contratado / encerrado',
        description: decisionNext
          ? 'Esse ciclo foi encerrado para esta vaga e o talento pode continuar elegível para novas oportunidades.'
          : hired
            ? 'Contratação concluída e fluxo encerrado com sucesso.'
            : 'Ao final da validação, você encerra o ciclo contratando o talento ou mantendo o perfil elegível para futuras vagas.',
        ownerText: 'Ação do recruiter',
      },
    ].map((item, index) => {
      const completed = this.isJourneyStepCompleted(index, stage, reviewingDocuments);
      const timeMeta = this.resolveJourneyTimeMeta(index, candidate);

      return {
        ...item,
        ...timeMeta,
        stepNumber: index + 1,
        completed,
        active: index === activeIndex,
      };
    });

    return {
      activeIndex,
      currentStageLabel: this.journeyStageDisplayLabel(stage),
      steps,
      statusAlertIcon: this.journeyAlertIcon(stage),
      statusAlertMessage: this.journeyAlertMessage(stage),
    };
  }

  private findJourneyCandidate(
    candidates: MockJobCandidate[],
    candidateId: string,
    candidateName: string,
  ): MockJobCandidate | undefined {
    const normalizedName = candidateName.trim().toLocaleLowerCase('pt-BR');

    return candidates.find((item) => !!candidateId && item.id === candidateId)
      ?? candidates.find((item) => item.name.trim().toLocaleLowerCase('pt-BR') === normalizedName);
  }

  private resolveJourneyContext(
    jobId: string,
    candidateId: string,
    candidateName: string,
  ): { job: NonNullable<ReturnType<JobsFacade['getJobById']>>; candidate: MockJobCandidate } | null {
    if (!jobId) {
      return null;
    }

    const job = this.jobsFacade.getJobById(jobId);
    if (!job) {
      return null;
    }

    const candidate = this.findJourneyCandidate(job.candidates ?? [], candidateId, candidateName);
    if (!candidate) {
      const fallbackName = candidateName.trim();
      if (!fallbackName) {
        return null;
      }

      return {
        job,
        candidate: {
          id: candidateId || `radar-${job.id}-${fallbackName.toLocaleLowerCase('pt-BR').replace(/\s+/g, '-')}`,
          name: fallbackName,
          role: job.title,
          location: job.location,
          match: Math.max(72, Math.min(98, job.match)),
          minutesAgo: 5,
          status: 'online',
          avatar: '',
          stage: 'radar',
          radarOnly: true,
          source: 'seed',
          availabilityLabel: 'Disponibilidade imediata',
          submittedDocuments: [],
          documentsConsentAccepted: false,
        },
      };
    }

    return { job, candidate };
  }

  private buildCandidateDocumentStatus(
    job: NonNullable<ReturnType<JobsFacade['getJobById']>>,
    candidate: MockJobCandidate,
  ): CurriculumDocumentStatusItem[] {
    const contextKey = `${job.id}|${candidate.id ?? candidate.name}`;
    if (this.documentReviewContextKey !== contextKey) {
      this.documentReviewContextKey = contextKey;
      this.documentReviewDecisions.clear();
    }

    const requiredDocuments = (job.hiringDocuments ?? [])
      .map((item) => item.trim())
      .filter(Boolean);

    const submittedDocuments = new Set(
      (candidate.submittedDocuments ?? [])
        .map((item) => item.trim()),
    );

    return requiredDocuments.map((label) => ({
      label,
      sent: submittedDocuments.has(label),
      reviewDecision: (candidate.documentReviewStatuses?.[label] as CurriculumDocumentReviewDecision | undefined)
        ?? this.documentReviewDecisions.get(label)
        ?? null,
    }));
  }

  private resolveJourneyTimeMeta(index: number, candidate: MockJobCandidate): Pick<CurriculumJourneyStep, 'dateLabel' | 'hourLabel' | 'timeLabel'> {
    if (index === 0 && Number.isFinite(candidate.minutesAgo)) {
      const radarFoundAt = new Date(Date.now() - Math.max(0, candidate.minutesAgo) * 60_000);
      if (!Number.isNaN(radarFoundAt.getTime())) {
        return {
          dateLabel: this.formatJourneyDate(radarFoundAt),
          hourLabel: this.formatJourneyHour(radarFoundAt),
          timeLabel: undefined,
        };
      }
    }

    const stageTimestamp = this.resolveJourneyStageTimestamp(index, candidate);
    if (stageTimestamp) {
      const committedAt = new Date(stageTimestamp);
      if (!Number.isNaN(committedAt.getTime())) {
        return {
          dateLabel: this.formatJourneyDate(committedAt),
          hourLabel: this.formatJourneyHour(committedAt),
          timeLabel: undefined,
        };
      }
    }

    return {
      dateLabel: 'Aguardando',
      hourLabel: '__:__',
      timeLabel: undefined,
    };
  }

  private resolveJourneyStageTimestamp(index: number, candidate: MockJobCandidate): string | undefined {
    const timeline = candidate.stageTimeline;
    if (!timeline) {
      return index === 2 || index === 3 ? candidate.recruiterStageCommittedAt : undefined;
    }

    switch (index) {
      case 1:
        return timeline.candidatura;
      case 2:
        return timeline.processo ?? timeline.tecnica ?? candidate.recruiterStageCommittedAt;
      case 3:
        return timeline.aguardando ?? candidate.recruiterStageCommittedAt;
      case 4:
        return timeline.aceito ?? timeline.proxima ?? timeline.cancelado;
      case 5:
        return timeline.documentacao;
      case 6:
        return timeline.contratado ?? timeline.proxima ?? timeline.cancelado;
      default:
        return undefined;
    }
  }

  private formatJourneyDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
    }).formatToParts(date);
    const day = parts.find((item) => item.type === 'day')?.value ?? '';
    const month = (parts.find((item) => item.type === 'month')?.value ?? '')
      .replace('.', '')
      .trim()
      .toLocaleLowerCase('pt-BR');

    return `${day} ${month}`.trim();
  }

  private formatJourneyHour(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private getJourneyStageIndex(stage: CandidateStage): number {
    switch (stage) {
      case 'radar':
        return 0;
      case 'candidatura':
        return 1;
      case 'processo':
      case 'tecnica':
        return 2;
      case 'aguardando':
        return 3;
      case 'aceito':
      case 'proxima':
      case 'cancelado':
        return 4;
      case 'documentacao':
        return 5;
      case 'contratado':
        return 6;
      default:
        return 0;
    }
  }

  private isJourneyStepCompleted(index: number, stage: CandidateStage, reviewingDocuments: boolean): boolean {
    if (stage === 'radar') {
      return index === 0;
    }

    if (stage === 'proxima' || stage === 'cancelado') {
      return index <= 4 || index === 6;
    }

    if (stage === 'contratado') {
      return true;
    }

    if (reviewingDocuments) {
      return index <= 5;
    }

    switch (stage) {
      case 'candidatura':
        return index <= 1;
      case 'processo':
      case 'tecnica':
        return index <= 2;
      case 'aguardando':
        return index <= 3;
      case 'aceito':
        return index <= 4;
      default:
        return index === 0;
    }
  }

  private journeyStageDisplayLabel(stage: CandidateStage): string {
    switch (stage) {
      case 'radar':
        return 'No radar';
      case 'candidatura':
        return 'Candidatura enviada';
      case 'processo':
      case 'tecnica':
        return 'Em processo';
      case 'aguardando':
        return 'Aguardando resposta';
      case 'aceito':
        return 'Aceito';
      case 'documentacao':
        return 'Documentação';
      case 'contratado':
        return 'Contratado';
      case 'proxima':
      case 'cancelado':
        return 'Ficou pra próxima';
      default:
        return 'No radar';
    }
  }

  private journeyAlertIcon(stage: CandidateStage): string {
    switch (stage) {
      case 'radar':
        return 'person_search';
      case 'candidatura':
        return 'touch_app';
      case 'processo':
      case 'tecnica':
        return 'manage_search';
      case 'aguardando':
        return 'hourglass_top';
      case 'aceito':
        return 'verified';
      case 'documentacao':
        return 'description';
      case 'contratado':
        return 'celebration';
      case 'proxima':
      case 'cancelado':
        return 'autorenew';
      default:
        return 'info';
    }
  }

  private journeyAlertMessage(stage: CandidateStage): string {
    switch (stage) {
      case 'radar':
        return 'Este candidato parece promissor, mas ainda precisa clicar em Candidatar-se para entrar no funil da vaga.';
      case 'candidatura':
        return 'O candidato ja demonstrou interesse. O proximo passo e o recruiter avancar o perfil para processo.';
      case 'processo':
      case 'tecnica':
        return 'O candidato esta em avaliacao. Vale aprofundar entrevistas, teste tecnico e sinais de aderencia.';
      case 'aguardando':
        return 'A contratacao foi solicitada e agora o fluxo depende da resposta final do candidato.';
      case 'aceito':
        return 'O candidato aceitou a proposta. O proximo passo e seguir com documentos e validacoes.';
      case 'documentacao':
        return 'Os documentos estao em validacao. Se estiver tudo certo, o fluxo pode seguir para contratacao.';
      case 'contratado':
        return 'Fluxo concluido com sucesso. Este candidato ja foi contratado para a vaga.';
      case 'proxima':
      case 'cancelado':
        return 'Este ciclo foi encerrado para esta vaga, mas o perfil ainda pode voltar ao radar em novas oportunidades.';
      default:
        return 'Acompanhe aqui a etapa atual do candidato e o proximo movimento esperado no fluxo.';
    }
  }
}
