import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { RecruiterIdentity } from '../vagas/data/vagas.models';
import { RecruiterDraft, RecruiterRecord } from './recruiter.models';
import { RecruiterDirectoryRepository, RecruiterWorkspaceState } from './recruiter-directory.repository';

@Injectable({ providedIn: 'root' })
export class RecruiterDirectoryService {
  private readonly defaultMasterId = 'julio-fazenda-recruiter';
  private readonly changesSubject = new Subject<void>();
  private readonly repository = inject(RecruiterDirectoryRepository);
  private cache: RecruiterRecord[] | null = null;

  readonly changes$ = this.changesSubject.asObservable();
  readonly areaOptions = [
    'Backend',
    'Frontend',
    'Cloud',
    'Dados',
    'DevOps',
    'Produto',
    'People',
    'Tech Recruiting',
  ];

  listRecruiters(companyName?: string): RecruiterRecord[] {
    const company = companyName?.trim() || this.getCurrentRecruiter().company;
    return this.ensureCompanyDirectory(company)
      .filter((recruiter) => recruiter.company === company)
      .sort((left, right) => {
        if (left.isMaster !== right.isMaster) {
          return left.isMaster ? -1 : 1;
        }

        if (left.active !== right.active) {
          return left.active ? -1 : 1;
        }

        return left.name.localeCompare(right.name, 'pt-BR');
      });
  }

  listAllRecruiters(): RecruiterRecord[] {
    return [...this.loadDirectory()].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  }

  getRecruiterById(id: string, companyName?: string): RecruiterRecord | undefined {
    return this.listRecruiters(companyName).find((recruiter) => recruiter.id === id);
  }

  findRecruiterByEmail(email: string, companyName?: string): RecruiterRecord | undefined {
    const normalizedEmail = email.trim().toLocaleLowerCase('pt-BR');
    if (!normalizedEmail) {
      return undefined;
    }

    const directory = companyName?.trim()
      ? this.listRecruiters(companyName)
      : this.loadDirectory();

    return directory.find((recruiter) => recruiter.email.trim().toLocaleLowerCase('pt-BR') === normalizedEmail);
  }

  getCurrentRecruiter(): RecruiterRecord {
    const workspace = this.readWorkspace();
    const company = workspace?.company || 'Banco Itaú';
    const recruiterId = workspace?.recruiterId || this.defaultMasterId;
    const recruiters = this.listRecruiters(company);

    return recruiters.find((recruiter) => recruiter.id === recruiterId)
      ?? recruiters[0]
      ?? this.seedMasterRecruiter(company);
  }

  getCurrentRecruiterIdentity(): RecruiterIdentity {
    const recruiter = this.getCurrentRecruiter();
    return this.asIdentity(recruiter);
  }

  getRecruiterCompanies(recruiterId?: string, companyName?: string): string[] {
    const recruiter = recruiterId
      ? this.getRecruiterById(recruiterId, companyName) ?? this.getCurrentRecruiter()
      : this.getCurrentRecruiter();

    return this.normalizeManagedCompanies(recruiter.company, recruiter.managedCompanies);
  }

  signInAsRecruiter(recruiterId: string, companyName?: string): RecruiterRecord {
    const company = companyName?.trim() || this.getCurrentRecruiter().company;
    const recruiter = this.getRecruiterById(recruiterId, company)
      ?? (recruiterId === this.defaultMasterId
        ? this.seedMasterRecruiter(company)
        : this.listRecruiters(company)[0]
          ?? this.seedMasterRecruiter(company));

    this.repository.writeWorkspace({
      recruiterId: recruiter.id,
      company: recruiter.company,
    } satisfies RecruiterWorkspaceState);

    this.emitChanges();
    return recruiter;
  }

  saveRecruiter(draft: RecruiterDraft): RecruiterRecord {
    const normalizedCompany = draft.company.trim() || this.getCurrentRecruiter().company;
    const currentDirectory = this.loadDirectory();
    const now = new Date().toISOString();
    const normalizedEmail = draft.email.trim().toLocaleLowerCase('pt-BR');
    const existing = draft.id
      ? currentDirectory.find((recruiter) => recruiter.company === normalizedCompany && recruiter.id === draft.id)
      : currentDirectory.find((recruiter) => (
          recruiter.company === normalizedCompany
          && recruiter.email.trim().toLocaleLowerCase('pt-BR') === normalizedEmail
        ));

    const nextRecord: RecruiterRecord = {
      id: existing?.id ?? this.createRecruiterId(draft.name),
      name: draft.name.trim() || 'Recruiter',
      email: draft.email.trim(),
      role: draft.role.trim() || 'Talent Acquisition',
      company: normalizedCompany,
      isMaster: draft.isMaster,
      active: draft.active,
      avatarUrl: undefined,
      managedCompanies: this.normalizeManagedCompanies(normalizedCompany, draft.managedCompanies),
      areas: draft.areas.map((area) => area.trim()).filter(Boolean),
      viewScope: draft.viewScope,
      canCreateJobs: draft.canCreateJobs,
      canEditJobs: draft.canEditJobs,
      canAdvanceCandidates: draft.canAdvanceCandidates,
      canManageSubordinates: draft.canManageSubordinates,
      canViewTalentRadar: draft.canViewTalentRadar,
      canExportData: draft.canExportData,
      notes: draft.notes?.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.cache = existing
      ? currentDirectory.map((recruiter) => (
          recruiter.company === normalizedCompany && recruiter.id === nextRecord.id
            ? nextRecord
            : recruiter
        ))
      : [nextRecord, ...currentDirectory];

    this.persist();
    return nextRecord;
  }

  toggleRecruiterActive(recruiterId: string, companyName?: string): RecruiterRecord | undefined {
    const company = companyName?.trim() || this.getCurrentRecruiter().company;
    const directory = this.ensureCompanyDirectory(company);
    const target = directory.find((recruiter) => recruiter.company === company && recruiter.id === recruiterId);

    if (!target) {
      return undefined;
    }

    const nextRecord: RecruiterRecord = {
      ...target,
      active: !target.active,
      updatedAt: new Date().toISOString(),
    };

    this.cache = directory.map((recruiter) => (
      recruiter.company === company && recruiter.id === recruiterId
        ? nextRecord
        : recruiter
    ));
    this.persist();
    return nextRecord;
  }

  replaceCompanyName(previousName: string, nextName: string): void {
    const normalizedPrevious = previousName.trim();
    const normalizedNext = nextName.trim();

    if (!normalizedPrevious || !normalizedNext || normalizedPrevious === normalizedNext) {
      return;
    }

    this.cache = this.loadDirectory().map((recruiter) => {
      const nextCompany = recruiter.company === normalizedPrevious ? normalizedNext : recruiter.company;
      const nextManagedCompanies = recruiter.managedCompanies.map((company) => (
        company === normalizedPrevious ? normalizedNext : company
      ));

      return this.normalizeRecruiter({
        ...recruiter,
        company: nextCompany,
        managedCompanies: this.normalizeManagedCompanies(nextCompany, nextManagedCompanies),
      });
    });

    const workspace = this.readWorkspace();
    if (workspace && workspace.company === normalizedPrevious) {
      this.repository.writeWorkspace({
        recruiterId: workspace.recruiterId,
        company: normalizedNext,
      } satisfies RecruiterWorkspaceState);
    }

    this.persist();
  }

  resetDirectory(): void {
    this.cache = [];
    this.repository.clearDirectory();
    this.repository.clearWorkspace();
    this.emitChanges();
  }

  clearCurrentWorkspace(): void {
    this.repository.clearWorkspace();
    this.emitChanges();
  }

  ensureMasterForCompany(companyName: string): RecruiterRecord {
    return this.seedMasterRecruiter(companyName.trim() || 'Banco Itaú');
  }

  private ensureCompanyDirectory(companyName: string): RecruiterRecord[] {
    const directory = this.loadDirectory();
    if (directory.some((recruiter) => recruiter.company === companyName)) {
      return directory;
    }

    this.cache = [...directory, ...this.defaultCompanySeeds(companyName)];
    this.persist(false);
    return this.cache;
  }

  private seedMasterRecruiter(companyName: string): RecruiterRecord {
    const existing = this.getRecruiterById(this.defaultMasterId, companyName);
    if (existing) {
      return existing;
    }

    const master = this.defaultCompanySeeds(companyName)[0];
    this.cache = [...this.loadDirectory(), master];
    this.persist(false);
    return master;
  }

  private loadDirectory(): RecruiterRecord[] {
    if (this.cache) {
      return this.cache;
    }

    const stored = this.repository.readAll();
    if (!stored) {
      this.cache = this.defaultCompanySeeds('Banco Itaú');
      return this.cache;
    }

    if (!stored.length) {
      this.cache = this.defaultCompanySeeds('Banco Itaú');
      this.persist(false);
      return this.cache;
    }

    this.cache = stored.map((recruiter) => this.normalizeRecruiter(recruiter));
    return this.cache;
  }

  private persist(emit = true): void {
    if (!this.cache) {
      return;
    }

    this.repository.writeAll(this.cache);
    if (emit) {
      this.emitChanges();
    }
  }

  private emitChanges(): void {
    this.changesSubject.next();
  }

  private normalizeRecruiter(recruiter: RecruiterRecord): RecruiterRecord {
    return {
      ...recruiter,
      role: recruiter.role?.trim() || 'Talent Acquisition',
      company: recruiter.company?.trim() || 'Banco Itaú',
      active: recruiter.active !== false,
      email: recruiter.email?.trim() || '',
      avatarUrl: undefined,
      managedCompanies: this.normalizeManagedCompanies(
        recruiter.company?.trim() || 'Banco Itaú',
        Array.isArray(recruiter.managedCompanies) ? recruiter.managedCompanies : [],
      ),
      areas: Array.isArray(recruiter.areas) ? recruiter.areas.map((area) => area.trim()).filter(Boolean) : [],
      viewScope: recruiter.viewScope || (recruiter.isMaster ? 'company' : 'own'),
      canCreateJobs: recruiter.canCreateJobs !== false,
      canEditJobs: recruiter.canEditJobs !== false,
      canAdvanceCandidates: recruiter.canAdvanceCandidates !== false,
      canManageSubordinates: recruiter.canManageSubordinates ?? recruiter.isMaster,
      canViewTalentRadar: recruiter.canViewTalentRadar !== false,
      canExportData: recruiter.canExportData ?? recruiter.isMaster,
      createdAt: recruiter.createdAt || new Date().toISOString(),
      updatedAt: recruiter.updatedAt || recruiter.createdAt || new Date().toISOString(),
    };
  }

  private defaultCompanySeeds(companyName: string): RecruiterRecord[] {
    if (companyName === 'Banco Itaú') {
      return [
        this.createRecruiterRecord({
          id: this.defaultMasterId,
          name: 'Julio Fazenda',
          email: 'julio.fazenda@itau.com.br',
          role: 'Talent Acquisition Lead',
          company: companyName,
          isMaster: true,
          active: true,
          managedCompanies: ['Banco Itaú'],
          areas: ['Backend', 'Cloud', 'Tech Recruiting'],
          viewScope: 'company',
          canCreateJobs: true,
          canEditJobs: true,
          canAdvanceCandidates: true,
          canManageSubordinates: true,
          canViewTalentRadar: true,
          canExportData: true,
          notes: 'Recruiter master responsável pela operação da empresa no TailWorks.',
        }),
        this.createRecruiterRecord({
          id: 'bianca-costa',
          name: 'Bianca Costa',
          email: 'bianca.costa@itau.com.br',
          role: 'Talent Acquisition',
          company: companyName,
          isMaster: false,
          active: true,
          managedCompanies: ['Banco Itaú'],
          areas: ['Backend', 'Dados'],
          viewScope: 'own',
          canCreateJobs: true,
          canEditJobs: true,
          canAdvanceCandidates: true,
          canManageSubordinates: false,
          canViewTalentRadar: true,
          canExportData: false,
          notes: 'Responsável pelas vagas do squad de engenharia e dados.',
        }),
        this.createRecruiterRecord({
          id: 'caio-moura',
          name: 'Caio Moura',
          email: 'caio.moura@itau.com.br',
          role: 'Talent Acquisition',
          company: companyName,
          isMaster: false,
          active: false,
          managedCompanies: ['Banco Itaú'],
          areas: ['Produto', 'Frontend'],
          viewScope: 'following',
          canCreateJobs: true,
          canEditJobs: false,
          canAdvanceCandidates: true,
          canManageSubordinates: false,
          canViewTalentRadar: true,
          canExportData: false,
          notes: 'Recruiter em pausa temporária, mantido para histórico de operação.',
        }),
      ];
    }

    return [
      this.createRecruiterRecord({
        id: this.defaultMasterId,
        name: 'Julio Fazenda',
        email: `julio.fazenda@${this.companyEmailDomain(companyName)}`,
        role: 'Talent Acquisition Lead',
        company: companyName,
        isMaster: true,
        active: true,
        managedCompanies: [companyName],
        areas: ['Tech Recruiting'],
        viewScope: 'company',
        canCreateJobs: true,
        canEditJobs: true,
        canAdvanceCandidates: true,
        canManageSubordinates: true,
        canViewTalentRadar: true,
        canExportData: true,
        notes: 'Recruiter master gerado automaticamente para a empresa.',
      }),
    ];
  }

  private createRecruiterRecord(draft: RecruiterDraft): RecruiterRecord {
    const now = new Date().toISOString();
    return {
      id: draft.id ?? this.createRecruiterId(draft.name),
      name: draft.name.trim(),
      email: draft.email.trim(),
      role: draft.role.trim(),
      company: draft.company.trim(),
      isMaster: draft.isMaster,
      active: draft.active,
      avatarUrl: undefined,
      managedCompanies: this.normalizeManagedCompanies(draft.company.trim(), draft.managedCompanies),
      areas: [...draft.areas],
      viewScope: draft.viewScope,
      canCreateJobs: draft.canCreateJobs,
      canEditJobs: draft.canEditJobs,
      canAdvanceCandidates: draft.canAdvanceCandidates,
      canManageSubordinates: draft.canManageSubordinates,
      canViewTalentRadar: draft.canViewTalentRadar,
      canExportData: draft.canExportData,
      notes: draft.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
  }

  private createRecruiterId(name: string): string {
    const base = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return base || `recruiter-${Date.now()}`;
  }

  private companyEmailDomain(companyName: string): string {
    const normalized = companyName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');

    return `${normalized || 'empresa'}.com.br`;
  }

  private asIdentity(recruiter: RecruiterRecord): RecruiterIdentity {
    return {
      id: recruiter.id,
      name: recruiter.name,
      role: recruiter.role,
      company: recruiter.company,
      isMaster: recruiter.isMaster,
    };
  }

  private normalizeManagedCompanies(primaryCompany: string, managedCompanies: string[]): string[] {
    const normalizedPrimary = primaryCompany.trim() || 'Banco Itaú';

    return Array.from(new Set([
      normalizedPrimary,
      ...managedCompanies
        .map((company) => company.trim())
        .filter(Boolean),
    ])).sort((left, right) => left.localeCompare(right, 'pt-BR'));
  }

  private readWorkspace(): RecruiterWorkspaceState | null {
    const workspace = this.repository.readWorkspace();
    const recruiterId = workspace?.recruiterId?.trim();
    const company = workspace?.company?.trim();

    if (!recruiterId || !company) {
      this.repository.clearWorkspace();
      return null;
    }

    return {
      recruiterId,
      company,
    };
  }
}
