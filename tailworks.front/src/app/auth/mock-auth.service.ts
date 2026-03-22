import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { EmpresaDirectoryService } from '../empresa/empresa-directory.service';
import { RecruiterDirectoryService } from '../recruiter/recruiter-directory.service';
import { VagasMockService } from '../vagas/data/vagas-mock.service';
import { BrowserStorageService } from '../core/storage/browser-storage.service';
import { AuthSyncApiService } from './auth-sync-api.service';
import { TalentDirectoryService } from '../talent/talent-directory.service';
import { TalentProfileStoreService } from '../talent/talent-profile-store.service';

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
  private readonly defaultRecruiterEmail = 'julio@tailworks.com';
  private readonly defaultRecruiterPassword = 'julio@56';
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(null);
  private readonly browserStorage = inject(BrowserStorageService);
  private readonly authSyncApi = inject(AuthSyncApiService);
  private readonly talentProfileStore = inject(TalentProfileStoreService);

  readonly session$ = this.sessionSubject.asObservable();

  constructor(
    private readonly companyDirectoryService: EmpresaDirectoryService,
    private readonly recruiterDirectoryService: RecruiterDirectoryService,
    private readonly vagasMockService: VagasMockService,
    private readonly talentDirectoryService: TalentDirectoryService,
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
      'tailworks:talent-directory:v1',
      'tailworks:candidate-basic-draft:v1',
      'tailworks:candidate-stacks-draft:v2',
      'tailworks:candidate-stacks-draft:v5',
      'tailworks:candidate-experiences-draft:v1',
      'tailworks:company-directory:v1',
      'tailworks:recruiter-radar-categories-selection:v1',
      'tailworks:radar-categories-selection:v1',
      'tailworks:candidate-experience-formation-copy:v1',
      'tailworks:candidate-experience-logo-draft:v1',
      'tailworks:matching-lab-dataset:v1',
      this.sessionStorageKey,
    ].forEach((key) => storage.removeItem(key));

    storage.setItem('tailworks:recruiter-directory:v1', '[]');
    storage.setItem('tailworks:company-directory:v1', '[]');
    this.companyDirectoryService.resetDirectory();
    this.recruiterDirectoryService.resetDirectory();
    this.vagasMockService.clearPublishedJobsForTesting();
    this.talentProfileStore.clear();
    this.ensureDefaultMockAccess();
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

  async login(email: string, password?: string): Promise<AuthSession | null> {
    const normalizedEmail = email.trim().toLocaleLowerCase('pt-BR');
    const normalizedPassword = password?.trim() ?? '';
    let accounts = this.loadAccounts();
    let account = accounts.find((item) => {
      if (item.email.toLocaleLowerCase('pt-BR') !== normalizedEmail) {
        return false;
      }

      if (!normalizedPassword) {
        return true;
      }

      return item.password === password;
    });

    if (!account) {
      const remoteAccounts = await this.authSyncApi.readAll();
      if (remoteAccounts?.length) {
        this.persistAccounts(remoteAccounts.map((item) => this.normalizeAccount(item)));
        accounts = this.loadAccounts();
        account = accounts.find((item) => {
          if (item.email.toLocaleLowerCase('pt-BR') !== normalizedEmail) {
            return false;
          }

          if (!normalizedPassword) {
            return true;
          }

          return item.password === password;
        });
      }
    }

    if (!account) {
      return null;
    }

    const session = this.toSession(account);
    await this.persistSession(session);
    return session;
  }

  async loginWithProvider(email: string): Promise<AuthSession | null> {
    const normalizedEmail = email.trim().toLocaleLowerCase('pt-BR');
    let account = this.loadAccounts().find((item) => item.email.toLocaleLowerCase('pt-BR') === normalizedEmail);

    if (!account) {
      const remoteAccounts = await this.authSyncApi.readAll();
      if (remoteAccounts?.length) {
        this.persistAccounts(remoteAccounts.map((item) => this.normalizeAccount(item)));
        account = this.loadAccounts().find((item) => item.email.toLocaleLowerCase('pt-BR') === normalizedEmail);
      }
    }

    if (!account) {
      return null;
    }

    const session = this.toSession(account);
    await this.persistSession(session);
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
    void this.authSyncApi.writeAll(nextAccounts);
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

    const nextAccounts = [...this.loadAccounts(), nextAccount];
    this.persistAccounts(nextAccounts);
    this.syncTalentDirectory(nextAccount);
    void this.authSyncApi.writeAll(nextAccounts);
    return nextAccount;
  }

  listTalentAccounts(): AuthAccount[] {
    return this.loadAccounts()
      .filter((account) => account.canUseTalent && !account.canUseRecruiter)
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  }

  async syncAccountsFromRemote(): Promise<number> {
    const remoteAccounts = await this.authSyncApi.readAll();
    if (!remoteAccounts?.length) {
      return this.loadAccounts().length;
    }

    this.persistAccounts(remoteAccounts.map((item) => this.normalizeAccount(item)));
    return remoteAccounts.length;
  }

  seedTalentAccounts(drafts: TalentSignupDraft[]): number {
    const nextAccounts = [...this.loadAccounts()];

    for (const draft of drafts) {
      const normalizedEmail = draft.email.trim().toLocaleLowerCase('pt-BR');
      const existingIndex = nextAccounts.findIndex((account) => account.email.toLocaleLowerCase('pt-BR') === normalizedEmail);
      const nextAccount: AuthAccount = {
        id: existingIndex >= 0 ? nextAccounts[existingIndex].id : `auth-talent-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        name: draft.name.trim(),
        email: normalizedEmail,
        password: draft.password,
        canUseRecruiter: false,
        canUseTalent: true,
        location: draft.location.trim() || 'Rio de Janeiro - RJ',
      };

      if (existingIndex >= 0) {
        nextAccounts[existingIndex] = nextAccount;
      } else {
        nextAccounts.push(nextAccount);
      }

      this.syncTalentDirectory(nextAccount);
    }

    this.persistAccounts(nextAccounts);
    void this.authSyncApi.writeAll(nextAccounts);
    return drafts.length;
  }

  resetWorkspace(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    this.browserStorage.removeByPrefixes([
      'tailworks:',
      'tailworks.front.',
      'tailworks.sidebar.',
    ]);

    storage.setItem('tailworks:recruiter-directory:v1', '[]');
    storage.setItem('tailworks:company-directory:v1', '[]');
    storage.setItem(this.bootstrapStorageKey, 'done');
    this.companyDirectoryService.resetDirectory();
    this.recruiterDirectoryService.resetDirectory();
    this.recruiterDirectoryService.clearCurrentWorkspace();
    this.vagasMockService.clearPublishedJobsForTesting();
    this.talentProfileStore.clear();
    void this.authSyncApi.writeAll([]);
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

  private async persistSession(session: AuthSession): Promise<void> {
    const storage = this.getStorage();
    storage?.setItem(this.sessionStorageKey, JSON.stringify(session));
    this.syncRecruiterWorkspace(session);
    this.syncTalentDirectory(session);
    await this.syncTalentWorkspace(session);
    this.sessionSubject.next(session);
  }

  private async syncTalentWorkspace(session: AuthSession | null): Promise<void> {
    if (!session?.email || session.canUseTalent !== true || session.canUseRecruiter === true) {
      return;
    }

    await this.talentProfileStore.restoreProfileToCurrentWorkspace(session.email);
  }

  private syncTalentDirectory(session: Pick<AuthSession, 'name' | 'email' | 'location' | 'canUseTalent' | 'canUseRecruiter'> | null): void {
    if (!session || session.canUseTalent !== true || session.canUseRecruiter === true) {
      return;
    }

    this.talentDirectoryService.upsertTalent({
      name: session.name,
      email: session.email,
      location: session.location?.trim() || 'Rio de Janeiro - RJ',
      visibleInEcosystem: true,
      availableForHiring: true,
    });
  }

  private ensureDefaultMockAccess(): void {
    const normalizedEmail = this.defaultRecruiterEmail.toLocaleLowerCase('pt-BR');
    const accounts = this.loadAccounts();
    if (accounts.some((account) => account.email.toLocaleLowerCase('pt-BR') === normalizedEmail)) {
      return;
    }

    const company = this.companyDirectoryService.getCompanyByName('Banco Itaú')
      ?? this.companyDirectoryService.saveCompany({
        name: 'Banco Itaú',
        sector: 'Banco e serviços financeiros',
        location: 'Rio de Janeiro - RJ',
        description: 'Banco e serviços financeiros',
        followers: '5.248.921 seguidores',
        linkedinCount: '5.248.921 no LinkedIn',
        logoLabel: 'it',
        logoUrl: '/assets/images/logo-itau.png',
        website: 'https://www.itau.com.br',
        emailDomain: 'itau.com.br',
        monthlyHiringCount: 43,
        active: true,
        notes: 'Conta recruiter padrão disponível em qualquer dispositivo.',
      });

    const recruiter = this.recruiterDirectoryService.findRecruiterByEmail(this.defaultRecruiterEmail, company.name)
      ?? this.recruiterDirectoryService.saveRecruiter({
        id: 'julio-fazenda-recruiter',
        name: 'Julio Fazenda',
        email: this.defaultRecruiterEmail,
        role: 'Recruiter Sr.',
        company: company.name,
        isMaster: true,
        active: true,
        avatarUrl: '',
        managedCompanies: [company.name],
        areas: ['Backend', 'Cloud', 'Tech Recruiting'],
        viewScope: 'company',
        canCreateJobs: true,
        canEditJobs: true,
        canAdvanceCandidates: true,
        canManageSubordinates: true,
        canViewTalentRadar: true,
        canExportData: true,
        notes: 'Recruiter padrão para acesso multi-dispositivo no mock.',
      });

    const nextAccounts = [
      ...accounts,
      {
        id: `auth-${recruiter.id}`,
        name: recruiter.name,
        email: this.defaultRecruiterEmail,
        password: this.defaultRecruiterPassword,
        canUseRecruiter: true,
        canUseTalent: true,
        recruiterId: recruiter.id,
        company: recruiter.company,
        location: 'Rio de Janeiro - RJ',
      },
    ];

    this.persistAccounts(nextAccounts);
    void this.authSyncApi.writeAll(nextAccounts);
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
      this.companyDirectoryService.saveCompany({
        name: session.company,
        sector: 'Tecnologia',
        location: session.location || 'Rio de Janeiro - RJ',
        description: 'Empresa sincronizada a partir do acesso compartilhado.',
        followers: '0 seguidores',
        linkedinCount: '0 no LinkedIn',
        logoLabel: session.company.slice(0, 2),
        logoUrl: '',
        website: '',
        emailDomain: this.emailDomainFromEmail(session.email),
        monthlyHiringCount: 0,
        active: true,
        notes: 'Empresa recriada localmente para sincronizar login entre dispositivos.',
      });

      const seededRecruiter = this.recruiterDirectoryService.saveRecruiter({
        id: session.recruiterId,
        name: session.name,
        email: session.email,
        role: 'Recruiter',
        company: session.company,
        isMaster: true,
        active: true,
        avatarUrl: '',
        managedCompanies: [session.company],
        areas: ['Tech Recruiting'],
        viewScope: 'company',
        canCreateJobs: true,
        canEditJobs: true,
        canAdvanceCandidates: true,
        canManageSubordinates: true,
        canViewTalentRadar: true,
        canExportData: true,
        notes: 'Recruiter recriado localmente a partir da sessão compartilhada.',
      });

      this.recruiterDirectoryService.signInAsRecruiter(seededRecruiter.id, seededRecruiter.company);
      return true;
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
    return this.browserStorage.storage;
  }
}
