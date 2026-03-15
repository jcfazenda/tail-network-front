import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { EmpresaDirectoryService } from '../empresa/empresa-directory.service';
import { RecruiterDirectoryService } from '../recruiter/recruiter-directory.service';
import { VagasMockService } from '../vagas/data/vagas-mock.service';

export type RecruiterInviteDraft = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export type RecruiterSignupDraft = {
  name: string;
  email: string;
  password: string;
  role: string;
  companyName: string;
  companySector: string;
  companyLocation: string;
  companyDescription: string;
  subordinateRecruiters: RecruiterInviteDraft[];
};

export type TalentSignupDraft = {
  name: string;
  email: string;
  password: string;
  location: string;
};

export type AuthAccount = {
  id: string;
  name: string;
  email: string;
  password: string;
  canUseRecruiter: boolean;
  canUseTalent: boolean;
  recruiterId?: string;
  company?: string;
  location?: string;
};

export type AuthSession = Omit<AuthAccount, 'password'>;

@Injectable({ providedIn: 'root' })
export class MockAuthService {
  private readonly accountsStorageKey = 'tailworks:auth-accounts:v1';
  private readonly sessionStorageKey = 'tailworks:auth-session:v1';
  private readonly bootstrapStorageKey = 'tailworks:auth-bootstrap:v1';
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(null);

  readonly session$ = this.sessionSubject.asObservable();

  constructor(
    private readonly companyDirectoryService: EmpresaDirectoryService,
    private readonly recruiterDirectoryService: RecruiterDirectoryService,
    private readonly vagasMockService: VagasMockService,
  ) {
    this.bootstrapFreshStart();
    const session = this.readSession();
    this.sessionSubject.next(session);
    this.syncRecruiterWorkspace(session);
  }

  bootstrapFreshStart(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    const alreadyBootstrapped = storage.getItem(this.bootstrapStorageKey) === 'done';
    const hasAccounts = !!storage.getItem(this.accountsStorageKey);

    if (alreadyBootstrapped || hasAccounts) {
      return;
    }

    [
      'tailworks.front.mock-vagas.publish-only',
      'tailworks.front.mock-vagas.sync',
      'tailworks:recruiter-directory:v1',
      'tailworks:recruiter-workspace:v1',
      'tailworks:company-directory:v1',
      'tailworks:candidate-basic-draft:v1',
      'tailworks:candidate-stacks-draft:v2',
      'tailworks:company-directory:v1',
      'tailworks:recruiter-radar-categories-selection:v1',
      'tailworks:radar-categories-selection:v1',
      'tailworks:candidate-experience-formation-copy:v1',
      'tailworks:candidate-experience-logo-draft:v1',
      this.sessionStorageKey,
    ].forEach((key) => storage.removeItem(key));

    storage.setItem('tailworks:recruiter-directory:v1', '[]');
    storage.setItem('tailworks:company-directory:v1', '[]');
    this.companyDirectoryService.resetDirectory();
    this.recruiterDirectoryService.resetDirectory();
    this.vagasMockService.clearPublishedJobsForTesting();
    storage.setItem(this.bootstrapStorageKey, 'done');
  }

  getSession(): AuthSession | null {
    return this.sessionSubject.value;
  }

  hasSession(): boolean {
    const session = this.getSession();
    return !!session;
  }

  canCurrentSessionUseRecruiter(): boolean {
    return this.getSession()?.canUseRecruiter === true;
  }

  canCurrentSessionUseTalent(): boolean {
    return this.getSession()?.canUseTalent !== false;
  }

  activateRecruiterWorkspace(): boolean {
    return this.syncRecruiterWorkspace(this.getSession());
  }

  login(email: string, password: string): AuthSession | null {
    const normalizedEmail = email.trim().toLocaleLowerCase('pt-BR');
    const account = this.loadAccounts().find((item) => (
      item.email.toLocaleLowerCase('pt-BR') === normalizedEmail && item.password === password
    ));

    if (!account) {
      return null;
    }

    const session = this.toSession(account);
    this.persistSession(session);
    return session;
  }

  loginWithProvider(email: string): AuthSession | null {
    const normalizedEmail = email.trim().toLocaleLowerCase('pt-BR');
    const account = this.loadAccounts().find((item) => item.email.toLocaleLowerCase('pt-BR') === normalizedEmail);

    if (!account) {
      return null;
    }

    const session = this.toSession(account);
    this.persistSession(session);
    return session;
  }

  logout(): void {
    const storage = this.getStorage();
    storage?.removeItem(this.sessionStorageKey);
    this.recruiterDirectoryService.clearCurrentWorkspace();
    this.sessionSubject.next(null);
  }

  registerRecruiterOrganization(draft: RecruiterSignupDraft): AuthAccount {
    const sanitizedMasterEmail = draft.email.trim();
    this.assertAccountEmailAvailable(sanitizedMasterEmail);

    const company = this.companyDirectoryService.saveCompany({
      name: draft.companyName.trim(),
      sector: draft.companySector.trim() || 'Tecnologia',
      location: draft.companyLocation.trim() || 'Brasil',
      description: draft.companyDescription.trim() || 'Empresa cadastrada durante o onboarding inicial.',
      followers: '0 seguidores',
      linkedinCount: '0 no LinkedIn',
      logoLabel: draft.companyName.trim().slice(0, 2),
      logoUrl: '',
      website: '',
      emailDomain: this.emailDomainFromEmail(sanitizedMasterEmail),
      monthlyHiringCount: 18,
      active: true,
      notes: 'Empresa criada no fluxo de primeira entrada.',
    });

    const masterRecruiter = this.recruiterDirectoryService.saveRecruiter({
      name: draft.name.trim(),
      email: sanitizedMasterEmail,
      role: draft.role.trim() || 'Talent Acquisition Lead',
      company: company.name,
      isMaster: true,
      active: true,
      avatarUrl: '',
      managedCompanies: [company.name],
      areas: ['Tech Recruiting'],
      viewScope: 'company',
      canCreateJobs: true,
      canEditJobs: true,
      canAdvanceCandidates: true,
      canManageSubordinates: true,
      canViewTalentRadar: true,
      canExportData: true,
      notes: 'Recruiter master criado no primeiro acesso.',
    });

    const nextAccounts = [...this.loadAccounts()];
    const masterAccount: AuthAccount = {
      id: `auth-${masterRecruiter.id}`,
      name: masterRecruiter.name,
      email: sanitizedMasterEmail,
      password: draft.password,
      canUseRecruiter: true,
      canUseTalent: true,
      recruiterId: masterRecruiter.id,
      company: company.name,
      location: draft.companyLocation.trim() || 'Rio de Janeiro - RJ',
    };
    nextAccounts.push(masterAccount);

    for (const subordinate of draft.subordinateRecruiters) {
      const hasAnyValue = subordinate.name.trim() || subordinate.email.trim() || subordinate.password.trim() || subordinate.role.trim();
      if (!hasAnyValue) {
        continue;
      }

      if (!subordinate.name.trim() || !subordinate.email.trim() || !subordinate.password.trim()) {
        throw new Error('Preencha nome, e-mail e senha de cada recruiter adicional.');
      }

      this.assertAccountEmailAvailable(subordinate.email.trim(), nextAccounts);

      const recruiter = this.recruiterDirectoryService.saveRecruiter({
        name: subordinate.name.trim(),
        email: subordinate.email.trim(),
        role: subordinate.role.trim() || 'Talent Acquisition',
        company: company.name,
        isMaster: false,
        active: true,
        avatarUrl: '',
        managedCompanies: [company.name],
        areas: ['Tech Recruiting'],
        viewScope: 'own',
        canCreateJobs: true,
        canEditJobs: true,
        canAdvanceCandidates: true,
        canManageSubordinates: false,
        canViewTalentRadar: true,
        canExportData: false,
        notes: 'Recruiter subordinado criado no onboarding inicial.',
      });

      nextAccounts.push({
        id: `auth-${recruiter.id}`,
        name: recruiter.name,
        email: subordinate.email.trim(),
        password: subordinate.password,
        canUseRecruiter: true,
        canUseTalent: true,
        recruiterId: recruiter.id,
        company: company.name,
        location: draft.companyLocation.trim() || 'Rio de Janeiro - RJ',
      });
    }

    this.persistAccounts(nextAccounts);
    return masterAccount;
  }

  registerTalent(draft: TalentSignupDraft): AuthAccount {
    const sanitizedEmail = draft.email.trim();
    this.assertAccountEmailAvailable(sanitizedEmail);

    const nextAccount: AuthAccount = {
      id: `auth-talent-${Date.now()}`,
      name: draft.name.trim(),
      email: sanitizedEmail,
      password: draft.password,
      canUseRecruiter: false,
      canUseTalent: true,
      location: draft.location.trim() || 'Rio de Janeiro - RJ',
    };

    this.persistAccounts([...this.loadAccounts(), nextAccount]);
    return nextAccount;
  }

  resetWorkspace(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    [
      this.accountsStorageKey,
      this.sessionStorageKey,
      'tailworks.front.mock-vagas.publish-only',
      'tailworks:recruiter-directory:v1',
      'tailworks:recruiter-workspace:v1',
      'tailworks:company-directory:v1',
      'tailworks:candidate-basic-draft:v1',
      'tailworks:candidate-stacks-draft:v2',
      'tailworks:recruiter-radar-categories-selection:v1',
      'tailworks:radar-categories-selection:v1',
      'tailworks:candidate-experience-formation-copy:v1',
      'tailworks:candidate-experience-logo-draft:v1',
    ].forEach((key) => storage.removeItem(key));

    storage.setItem('tailworks:recruiter-directory:v1', '[]');
    storage.setItem('tailworks:company-directory:v1', '[]');
    storage.setItem(this.bootstrapStorageKey, 'done');
    this.companyDirectoryService.resetDirectory();
    this.recruiterDirectoryService.resetDirectory();
    this.vagasMockService.clearPublishedJobsForTesting();
    this.sessionSubject.next(null);
  }

  private assertAccountEmailAvailable(email: string, accounts = this.loadAccounts()): void {
    const normalizedEmail = email.toLocaleLowerCase('pt-BR');
    const exists = accounts.some((account) => account.email.toLocaleLowerCase('pt-BR') === normalizedEmail);

    if (exists) {
      throw new Error('Ja existe um acesso cadastrado com esse e-mail.');
    }
  }

  private toSession(account: AuthAccount): AuthSession {
    const { password: _password, ...session } = account;
    return session;
  }

  private persistSession(session: AuthSession): void {
    const storage = this.getStorage();
    storage?.setItem(this.sessionStorageKey, JSON.stringify(session));
    this.syncRecruiterWorkspace(session);
    this.sessionSubject.next(session);
  }

  private loadAccounts(): AuthAccount[] {
    const storage = this.getStorage();
    if (!storage) {
      return [];
    }

    const raw = storage.getItem(this.accountsStorageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as Array<Partial<AuthAccount> & { role?: 'recruiter' | 'talent' }>;
      return Array.isArray(parsed)
        ? parsed.map((account) => this.normalizeAccount(account))
        : [];
    } catch {
      storage.removeItem(this.accountsStorageKey);
      return [];
    }
  }

  private persistAccounts(accounts: AuthAccount[]): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    storage.setItem(this.accountsStorageKey, JSON.stringify(accounts));
  }

  private normalizeAccount(account: Partial<AuthAccount> & { role?: 'recruiter' | 'talent' }): AuthAccount {
    const legacyRole = account.role;
    const canUseRecruiter = account.canUseRecruiter ?? legacyRole === 'recruiter';
    const canUseTalent = account.canUseTalent ?? true;

    return {
      id: account.id?.trim() || `auth-${Date.now()}`,
      name: account.name?.trim() || 'Usuario TailWorks',
      email: account.email?.trim() || '',
      password: account.password?.trim() || '',
      canUseRecruiter,
      canUseTalent,
      recruiterId: account.recruiterId?.trim() || undefined,
      company: account.company?.trim() || undefined,
      location: account.location?.trim() || undefined,
    };
  }

  private syncRecruiterWorkspace(session: AuthSession | null): boolean {
    if (!session?.company || !session.canUseRecruiter) {
      this.recruiterDirectoryService.clearCurrentWorkspace();
      return false;
    }

    const recruiter = this.recruiterDirectoryService.findRecruiterByEmail(session.email, session.company)
      ?? (session.recruiterId
        ? this.recruiterDirectoryService.getRecruiterById(session.recruiterId, session.company)
        : undefined);

    if (!recruiter) {
      this.recruiterDirectoryService.clearCurrentWorkspace();
      return false;
    }

    this.recruiterDirectoryService.signInAsRecruiter(recruiter.id, recruiter.company);
    return true;
  }

  private readSession(): AuthSession | null {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }

    const raw = storage.getItem(this.sessionStorageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      storage.removeItem(this.sessionStorageKey);
      return null;
    }
  }

  private emailDomainFromEmail(email: string): string {
    const atIndex = email.indexOf('@');
    return atIndex >= 0 ? email.slice(atIndex + 1).trim() : '';
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }

    return window.localStorage;
  }
}
