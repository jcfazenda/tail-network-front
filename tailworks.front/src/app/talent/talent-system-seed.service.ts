import { Injectable, inject } from '@angular/core';
import { MatchingLabService } from '../core/matching-lab/matching-lab.service';
import { MatchLabCandidate, MatchLabSeniority } from '../core/matching-lab/matching-lab.models';
import { MockAuthService, TalentSignupDraft } from '../auth/mock-auth.service';
import {
  SeededCandidateBasicDraft,
  SeededExperienceDraft,
  SeededStackChip,
  SeededStacksDraft,
  SeededTalentProfile,
  TalentProfileStoreService,
} from './talent-profile-store.service';

@Injectable({ providedIn: 'root' })
export class TalentSystemSeedService {
  private readonly matchingLabService = inject(MatchingLabService);
  private readonly authService = inject(MockAuthService);
  private readonly talentProfileStore = inject(TalentProfileStoreService);

  async seedTalentsFromLab(): Promise<{ accounts: number; profiles: number }> {
    const candidates = this.matchingLabService.getDataset().candidates;
    if (!candidates.length) {
      return { accounts: 0, profiles: 0 };
    }

    const profiles = candidates.map((candidate, index) => this.buildSeededTalentProfile(candidate, index));
    const accounts = profiles.map((profile, index) => this.toSignupDraft(profile, index));
    const accountCount = this.authService.seedTalentAccounts(accounts);
    const profileCount = await this.talentProfileStore.upsertProfiles(profiles);
    return { accounts: accountCount, profiles: profileCount };
  }

  private buildSeededTalentProfile(candidate: MatchLabCandidate, index: number): SeededTalentProfile {
    const email = this.emailFromCandidate(candidate.name, index);
    const [city, state] = this.extractLocationParts(candidate.location);

    return {
      email,
      basicDraft: {
        profile: {
          name: candidate.name,
          email,
          phone: this.phoneFromIndex(index),
          linkedin: `https://linkedin.com/in/${this.slug(candidate.name)}`,
          state,
          city,
          location: candidate.location,
          portfolio: `https://portfolio.tail/${this.slug(candidate.name)}`,
          formation: this.formationFromSeniority(candidate.seniority),
        },
      },
      stacksDraft: this.toStacksDraft(candidate),
      experiencesDraft: this.toExperienceDrafts(candidate),
    };
  }

  private toSignupDraft(profile: SeededTalentProfile, index: number): TalentSignupDraft {
    return {
      name: profile.basicDraft.profile?.name ?? `Talento ${index + 1}`,
      email: profile.email,
      password: `talento@${String(index + 1).padStart(3, '0')}`,
      location: profile.basicDraft.profile?.location ?? 'Brasil',
    };
  }

  private toStacksDraft(candidate: MatchLabCandidate): SeededStacksDraft {
    const ordered = [...candidate.stacks]
      .sort((left, right) => right.percent - left.percent)
      .map((stack) => this.toStackChip(stack.stackId, stack.stackName, stack.percent));

    return {
      primary: ordered.slice(0, 3),
      extra: ordered.slice(3, 8),
    };
  }

  private toExperienceDrafts(candidate: MatchLabCandidate): SeededExperienceDraft[] {
    const experiences = candidate.experiences.slice(0, 5).map((experience, index) => ({
      id: experience.id,
      company: experience.company,
      role: experience.role,
      workModel: (index % 3 === 0 ? 'Remoto' : index % 2 === 0 ? 'Híbrido' : 'Presencial') as SeededExperienceDraft['workModel'],
      startMonth: this.monthLabel(experience.start),
      startYear: this.yearLabel(experience.start),
      endMonth: this.monthLabel(experience.end),
      endYear: this.yearLabel(experience.end),
      currentlyWorkingHere: !experience.end,
      responsibilities: experience.summary,
      positionLevel: this.positionLevelFromCandidate(candidate.seniority),
      companySize: (index % 2 === 0 ? 'Grande' : 'Média') as SeededExperienceDraft['companySize'],
      companySegment: this.segmentFromRole(experience.role),
      sector: this.sectorFromRole(experience.role),
      actuation: 78 - (index * 6),
      appliedStacks: experience.stackIds.map((stackId) => ({
        repoId: this.repoId(stackId),
        name: this.stackName(stackId),
        knowledge: this.stackKnowledge(candidate, stackId),
        description: `Uso prático de ${this.stackName(stackId)} em contexto real.`,
      })),
    }));

    if (experiences.length >= 3) {
      return experiences;
    }

    const filler = this.buildFillerExperiences(candidate, 3 - experiences.length);
    return [...experiences, ...filler];
  }

  private buildFillerExperiences(candidate: MatchLabCandidate, missing: number): SeededExperienceDraft[] {
    const fallbackCompanies = ['Accenture', 'CI&T', 'Stefanini', 'Capgemini', 'TIVIT'];

    return Array.from({ length: missing }, (_value, index) => {
      const primaryStacks = candidate.stacks.slice(0, 2);
      return {
        id: `${candidate.id}-filler-${index + 1}`,
        company: fallbackCompanies[index % fallbackCompanies.length],
        role: `${candidate.seniority} Developer`,
        workModel: 'Presencial',
        startMonth: 'Jan',
        startYear: String(2018 + index),
        endMonth: 'Dez',
        endYear: String(2019 + index),
        currentlyWorkingHere: false,
        responsibilities: 'Experiência complementar para reforçar contexto técnico e histórico realista.',
        positionLevel: this.positionLevelFromCandidate(candidate.seniority),
        companySize: 'Startup',
        companySegment: 'Tecnologia',
        sector: 'Produto',
        actuation: 68 - (index * 5),
        appliedStacks: primaryStacks.map((stack) => ({
          repoId: this.repoId(stack.stackId),
          name: stack.stackName,
          knowledge: stack.percent,
          description: `Atuação prática com ${stack.stackName}.`,
        })),
      };
    });
  }

  private toStackChip(stackId: string, stackName: string, knowledge: number): SeededStackChip {
    return {
      id: this.repoId(stackId),
      name: stackName,
      short: stackName.slice(0, 14),
      tone: this.stackTone(stackId),
      category: this.stackCategory(stackId),
      knowledge,
      description: `Dominio declarado em ${stackName} com foco em compatibilidade de radar.`,
    };
  }

  private emailFromCandidate(name: string, index: number): string {
    const base = this.slug(name);
    return `${base}.${index + 1}@talent.local`;
  }

  private phoneFromIndex(index: number): string {
    const suffix = String(1000 + index).padStart(4, '0');
    return `(21) 9 88${suffix.slice(0, 2)}-${suffix.slice(2)}`;
  }

  private formationFromSeniority(seniority: MatchLabSeniority): string {
    switch (seniority) {
      case 'Especialista':
        return 'Mestrado em Computação';
      case 'Senior':
        return 'Pós-graduação em Engenharia de Software';
      case 'Pleno':
        return 'Bacharelado em Sistemas de Informação';
      default:
        return 'Tecnólogo em Análise e Desenvolvimento';
    }
  }

  private positionLevelFromCandidate(seniority: MatchLabSeniority): SeededExperienceDraft['positionLevel'] {
    switch (seniority) {
      case 'Especialista':
        return 'Tech Lead';
      case 'Senior':
        return 'Sênior';
      case 'Pleno':
        return 'Pleno';
      default:
        return 'Júnior';
    }
  }

  private segmentFromRole(role: string): string {
    if (role.toLocaleLowerCase('pt-BR').includes('data')) {
      return 'Dados';
    }
    if (role.toLocaleLowerCase('pt-BR').includes('mobile')) {
      return 'Mobile';
    }
    return 'Tecnologia';
  }

  private sectorFromRole(role: string): string {
    if (role.toLocaleLowerCase('pt-BR').includes('engineer')) {
      return 'Produto';
    }
    return 'Tecnologia';
  }

  private stackKnowledge(candidate: MatchLabCandidate, stackId: string): number {
    return candidate.stacks.find((stack) => stack.stackId === stackId)?.percent ?? 52;
  }

  private stackName(stackId: string): string {
    return this.matchingLabService.getDataset().jobs
      .flatMap((job) => job.stacks)
      .find((stack) => stack.stackId === stackId)?.stackName ?? stackId;
  }

  private repoId(stackId: string): string {
    const map: Record<string, string> = {
      dotnet: 'repo:dotnet',
      java: 'repo:java',
      node: 'repo:nodejs',
      angular: 'repo:angular',
      react: 'repo:react',
      typescript: 'repo:typescript',
      flutter: 'repo:flutter',
      'react-native': 'repo:react-native',
      python: 'repo:python',
      data: 'repo:sql-server',
      ml: 'repo:python-ml',
      aws: 'repo:aws',
      azure: 'repo:azure',
      gcp: 'repo:gcp',
      docker: 'repo:docker',
      kubernetes: 'repo:kubernetes',
      qa: 'repo:qa-automation',
      security: 'repo:security',
      ux: 'repo:ux',
      figma: 'repo:figma',
    };
    return map[stackId] ?? `repo:${stackId}`;
  }

  private stackCategory(stackId: string): SeededStackChip['category'] {
    if (['dotnet', 'java', 'node'].includes(stackId)) {
      return 'backend';
    }
    if (['angular', 'react', 'typescript', 'ux', 'figma'].includes(stackId)) {
      return 'frontend';
    }
    if (['data'].includes(stackId)) {
      return 'database';
    }
    if (['aws', 'azure', 'gcp'].includes(stackId)) {
      return 'cloud';
    }
    if (['docker', 'kubernetes', 'qa', 'security'].includes(stackId)) {
      return 'devops';
    }
    if (['flutter', 'react-native'].includes(stackId)) {
      return 'mobile';
    }
    if (['python', 'ml'].includes(stackId)) {
      return 'data';
    }
    return 'other';
  }

  private stackTone(stackId: string): SeededStackChip['tone'] {
    if (['aws', 'azure', 'gcp'].includes(stackId)) {
      return 'azure';
    }
    if (['angular', 'react', 'typescript'].includes(stackId)) {
      return 'orange';
    }
    if (['dotnet', 'java', 'node', 'python'].includes(stackId)) {
      return 'gold';
    }
    return 'neutral';
  }

  private monthLabel(value?: string): string {
    if (!value) {
      return 'Atual';
    }

    const month = new Date(value).getMonth();
    return ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][month] ?? 'Jan';
  }

  private yearLabel(value?: string): string {
    if (!value) {
      return '2026';
    }

    return String(new Date(value).getFullYear());
  }

  private extractLocationParts(location: string): [string, string] {
    const [city, state] = location.split(' - ').map((item) => item.trim());
    return [city || location, state || 'RJ'];
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
