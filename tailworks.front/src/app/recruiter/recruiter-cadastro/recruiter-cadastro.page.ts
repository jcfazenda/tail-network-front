import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CompaniesFacade } from '../../core/facades/companies.facade';
import { RecruitersFacade } from '../../core/facades/recruiters.facade';
import { CompanyRecord } from '../../empresa/empresa.models';
import { RecruiterDraft, RecruiterRecord, RecruiterViewScope } from '../recruiter.models';

type PermissionKey =
  | 'canCreateJobs'
  | 'canEditJobs'
  | 'canAdvanceCandidates'
  | 'canManageSubordinates'
  | 'canViewTalentRadar'
  | 'canExportData';

type ViewScopeOption = {
  value: RecruiterViewScope;
  label: string;
  description: string;
};

type PermissionDefinition = {
  key: PermissionKey;
  label: string;
  description: string;
};

@Component({
  standalone: true,
  selector: 'app-recruiter-cadastro-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recruiter-cadastro.page.html',
  styleUrls: ['./recruiter-cadastro.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecruiterCadastroPage implements OnDestroy {
  readonly defaultRecruiterAvatarUrl = '/assets/avatars/avatar-default.svg';
  private readonly companiesFacade = inject(CompaniesFacade);
  private readonly recruitersFacade = inject(RecruitersFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();

  readonly areaOptions = this.recruitersFacade.areaOptions;
  readonly viewScopeOptions: ViewScopeOption[] = [
    {
      value: 'own',
      label: 'Vagas proprias',
      description: 'Ve e opera somente vagas que criou.',
    },
    {
      value: 'following',
      label: 'Vagas acompanhadas',
      description: 'Opera vagas proprias e vagas em que foi incluido como apoio.',
    },
    {
      value: 'company',
      label: 'Toda a empresa',
      description: 'Visao completa do funil e das vagas da empresa.',
    },
  ];
  readonly permissionDefinitions: PermissionDefinition[] = [
    {
      key: 'canCreateJobs',
      label: 'Criar vagas',
      description: 'Pode abrir novas vagas na empresa.',
    },
    {
      key: 'canEditJobs',
      label: 'Editar vagas',
      description: 'Pode ajustar texto, status e detalhes das vagas.',
    },
    {
      key: 'canAdvanceCandidates',
      label: 'Movimentar candidatos',
      description: 'Pode avancar ou encerrar candidatos no pipeline.',
    },
    {
      key: 'canManageSubordinates',
      label: 'Gerenciar subordinados',
      description: 'Pode cadastrar ou manter outros recruiters.',
    },
    {
      key: 'canViewTalentRadar',
      label: 'Ver radar',
      description: 'Pode consultar talentos e alcance do radar.',
    },
    {
      key: 'canExportData',
      label: 'Exportar dados',
      description: 'Pode tirar extracoes e relatorios da operacao.',
    },
  ];

  draft: RecruiterDraft = this.createEmptyDraft();
  editingRecruiterId: string | null = null;
  editingCompany = '';
  isEditMode = false;

  constructor() {
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        const company = params.get('company')?.trim() || this.currentRecruiter.company;
        const recruiterId = params.get('edit')?.trim() || null;
        const recruiter = recruiterId
          ? this.recruitersFacade.getRecruiterById(recruiterId, company)
          : undefined;

        this.editingCompany = company;
        this.editingRecruiterId = recruiter?.id ?? recruiterId;
        this.isEditMode = !!recruiter;
        this.draft = recruiter ? this.toDraft(recruiter) : this.createEmptyDraft(company);
        this.applyMasterDefaults();
        this.cdr.markForCheck();
      }),
    );

    this.subscriptions.add(
      this.recruitersFacade.changes$.subscribe(() => {
        if (!this.isEditMode || !this.editingRecruiterId) {
          this.cdr.markForCheck();
          return;
        }

        const recruiter = this.recruitersFacade.getRecruiterById(this.editingRecruiterId, this.editingCompany);
        if (recruiter) {
          this.draft = this.toDraft(recruiter);
          this.applyMasterDefaults();
        }
        this.cdr.markForCheck();
      }),
    );

    this.subscriptions.add(
      this.companiesFacade.changes$.subscribe(() => {
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get currentRecruiter(): RecruiterRecord {
    return this.recruitersFacade.getCurrentRecruiter();
  }

  get canManageDirectory(): boolean {
    return this.currentRecruiter.isMaster;
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Manutencao de recruiter' : 'Cadastro de recruiter';
  }

  get pageDescription(): string {
    return this.isEditMode
      ? 'Ajuste escopo, permissoes e status operacional do recruiter.'
      : 'Cadastre um novo recruiter e defina exatamente o que ele pode ver e operar.';
  }

  get canSave(): boolean {
    return this.canManageDirectory
      && !!this.draft.name.trim()
      && !!this.draft.email.trim()
      && !!this.draft.company.trim();
  }

  get enabledPermissionLabels(): string[] {
    return this.permissionDefinitions
      .filter((permission) => this.draft[permission.key])
      .map((permission) => permission.label);
  }

  get companyCatalog(): CompanyRecord[] {
    const selected = new Set(this.managedCompanies);

    return this.companiesFacade
      .listCompanies(true)
      .filter((company) => company.active || selected.has(company.name));
  }

  get hasCompanyCatalog(): boolean {
    return this.companyCatalog.length > 0;
  }

  get managedCompanies(): string[] {
    return Array.from(new Set([
      this.draft.company.trim(),
      ...this.draft.managedCompanies.map((company) => company.trim()).filter(Boolean),
    ].filter(Boolean)));
  }

  toggleArea(area: string): void {
    if (!this.canManageDirectory) {
      return;
    }

    this.draft = {
      ...this.draft,
      areas: this.draft.areas.includes(area)
        ? this.draft.areas.filter((item) => item !== area)
        : [...this.draft.areas, area],
    };
  }

  isManagedCompanySelected(companyName: string): boolean {
    return this.managedCompanies.includes(companyName);
  }

  onPrimaryCompanyChange(companyName: string): void {
    if (!this.canManageDirectory) {
      return;
    }

    this.draft = {
      ...this.draft,
      company: companyName,
      managedCompanies: Array.from(new Set([
        ...this.draft.managedCompanies.filter((company) => company.trim() !== this.draft.company.trim()),
        companyName,
      ].filter(Boolean))),
    };
  }

  toggleManagedCompanySelection(companyName: string): void {
    if (!this.canManageDirectory || companyName === this.draft.company.trim()) {
      return;
    }

    const isSelected = this.isManagedCompanySelected(companyName);

    this.draft = {
      ...this.draft,
      managedCompanies: isSelected
        ? this.draft.managedCompanies.filter((item) => item !== companyName)
        : [...this.draft.managedCompanies, companyName],
    };
  }

  isAreaSelected(area: string): boolean {
    return this.draft.areas.includes(area);
  }

  setViewScope(scope: RecruiterViewScope): void {
    if (!this.canManageDirectory) {
      return;
    }

    this.draft = {
      ...this.draft,
      viewScope: scope,
    };
  }

  togglePermission(key: PermissionKey): void {
    if (!this.canManageDirectory) {
      return;
    }

    this.draft = {
      ...this.draft,
      [key]: !this.draft[key],
    };
  }

  onMasterChange(): void {
    if (!this.canManageDirectory) {
      return;
    }

    this.applyMasterDefaults();
  }

  saveRecruiter(): void {
    if (!this.canSave) {
      return;
    }

    const savedRecruiter = this.recruitersFacade.saveRecruiter({
      ...this.draft,
      name: this.draft.name.trim(),
      email: this.draft.email.trim(),
      role: this.draft.role.trim(),
      company: this.draft.company.trim(),
      managedCompanies: this.managedCompanies,
      areas: this.draft.areas.map((area) => area.trim()).filter(Boolean),
      avatarUrl: undefined,
      notes: this.draft.notes?.trim() || undefined,
    });

    if (savedRecruiter.id === this.currentRecruiter.id) {
      this.recruitersFacade.signInAsRecruiter(savedRecruiter.id, savedRecruiter.company);
    }

    void this.router.navigate(['/recruiter/panel'], {
      queryParams: { company: savedRecruiter.company },
    });
  }

  private createEmptyDraft(company = this.currentRecruiter.company): RecruiterDraft {
    const fallbackCompany = this.companiesFacade.getCompanyByName(company)?.name
      || this.companiesFacade.listCompanies()[0]?.name
      || company;

    return {
      name: '',
      email: '',
      role: 'Talent Acquisition',
      company: fallbackCompany,
      isMaster: false,
      active: true,
      avatarUrl: '',
      managedCompanies: [fallbackCompany],
      areas: ['Tech Recruiting'],
      viewScope: 'own',
      canCreateJobs: true,
      canEditJobs: true,
      canAdvanceCandidates: true,
      canManageSubordinates: false,
      canViewTalentRadar: true,
      canExportData: false,
      notes: '',
    };
  }

  private toDraft(recruiter: RecruiterRecord): RecruiterDraft {
    return {
      id: recruiter.id,
      name: recruiter.name,
      email: recruiter.email,
      role: recruiter.role,
      company: recruiter.company,
      isMaster: recruiter.isMaster,
      active: recruiter.active,
      avatarUrl: recruiter.avatarUrl || '',
      managedCompanies: [...recruiter.managedCompanies],
      areas: [...recruiter.areas],
      viewScope: recruiter.viewScope,
      canCreateJobs: recruiter.canCreateJobs,
      canEditJobs: recruiter.canEditJobs,
      canAdvanceCandidates: recruiter.canAdvanceCandidates,
      canManageSubordinates: recruiter.canManageSubordinates,
      canViewTalentRadar: recruiter.canViewTalentRadar,
      canExportData: recruiter.canExportData,
      notes: recruiter.notes || '',
    };
  }

  private applyMasterDefaults(): void {
    if (!this.draft.isMaster) {
      return;
    }

    this.draft = {
      ...this.draft,
      active: true,
      viewScope: 'company',
      canCreateJobs: true,
      canEditJobs: true,
      canAdvanceCandidates: true,
      canManageSubordinates: true,
      canViewTalentRadar: true,
      canExportData: true,
    };
  }
}
