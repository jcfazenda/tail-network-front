import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CompaniesFacade } from '../../core/facades/companies.facade';
import { JobsFacade } from '../../core/facades/jobs.facade';
import { RecruitersFacade } from '../../core/facades/recruiters.facade';
import { CompanyDraft, CompanyRecord } from '../empresa.models';

@Component({
  standalone: true,
  selector: 'app-empresa-cadastro-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './empresa-cadastro.page.html',
  styleUrls: ['./empresa-cadastro.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpresaCadastroPage implements OnDestroy {
  readonly countryOptions = ['Brasil', 'Portugal'];
  readonly brazilStateAbbreviations: Record<string, string> = {
    Acre: 'AC',
    Alagoas: 'AL',
    Amapa: 'AP',
    Amazonas: 'AM',
    Bahia: 'BA',
    Ceara: 'CE',
    'Distrito Federal': 'DF',
    'Espirito Santo': 'ES',
    Goias: 'GO',
    Maranhao: 'MA',
    'Mato Grosso': 'MT',
    'Mato Grosso do Sul': 'MS',
    'Minas Gerais': 'MG',
    Para: 'PA',
    Paraiba: 'PB',
    Parana: 'PR',
    Pernambuco: 'PE',
    Piaui: 'PI',
    'Rio de Janeiro': 'RJ',
    'Rio Grande do Norte': 'RN',
    'Rio Grande do Sul': 'RS',
    Rondonia: 'RO',
    Roraima: 'RR',
    'Santa Catarina': 'SC',
    'Sao Paulo': 'SP',
    Sergipe: 'SE',
    Tocantins: 'TO',
  };
  readonly statesByCountry: Record<string, string[]> = {
    Brasil: [
      'Acre',
      'Alagoas',
      'Amapa',
      'Amazonas',
      'Bahia',
      'Ceara',
      'Distrito Federal',
      'Espirito Santo',
      'Goias',
      'Maranhao',
      'Mato Grosso',
      'Mato Grosso do Sul',
      'Minas Gerais',
      'Para',
      'Paraiba',
      'Parana',
      'Pernambuco',
      'Piaui',
      'Rio de Janeiro',
      'Rio Grande do Norte',
      'Rio Grande do Sul',
      'Rondonia',
      'Roraima',
      'Santa Catarina',
      'Sao Paulo',
      'Sergipe',
      'Tocantins',
    ],
    Portugal: [
      'Aveiro',
      'Beja',
      'Braga',
      'Braganca',
      'Castelo Branco',
      'Coimbra',
      'Evora',
      'Faro',
      'Guarda',
      'Leiria',
      'Lisboa',
      'Portalegre',
      'Porto',
      'Santarem',
      'Setubal',
      'Viana do Castelo',
      'Vila Real',
      'Viseu',
      'Acores',
      'Madeira',
    ],
  };

  private readonly companiesFacade = inject(CompaniesFacade);
  private readonly recruitersFacade = inject(RecruitersFacade);
  private readonly jobsFacade = inject(JobsFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();

  draft: CompanyDraft = this.createEmptyDraft();
  editingCompanyId: string | null = null;
  editingCompanyName = '';
  isEditMode = false;
  selectedCountry = 'Brasil';
  selectedState = 'Rio de Janeiro';

  constructor() {
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        const editingId = params.get('edit')?.trim() || null;
        const company = editingId ? this.companiesFacade.getCompanyById(editingId) : undefined;

        this.editingCompanyId = company?.id ?? editingId;
        this.editingCompanyName = company?.name ?? '';
        this.isEditMode = !!company;
        this.draft = company ? this.toDraft(company) : this.createEmptyDraft();
        this.syncLocationControlsFromDraft();
        this.cdr.markForCheck();
      }),
    );

    this.subscriptions.add(
      this.companiesFacade.changes$.subscribe(() => {
        if (!this.isEditMode || !this.editingCompanyId) {
          this.cdr.markForCheck();
          return;
        }

        const company = this.companiesFacade.getCompanyById(this.editingCompanyId);
        if (company) {
          this.draft = this.toDraft(company);
          this.syncLocationControlsFromDraft();
        }
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Manutencao de empresa' : 'Cadastro de empresa';
  }

  get pageDescription(): string {
    return this.isEditMode
      ? 'Atualize perfil, logo, contexto e disponibilidade da empresa no ecossistema.'
      : 'Cadastre uma empresa para que ela possa ser vinculada aos recruiters e usada na abertura de vagas.';
  }

  get canSave(): boolean {
    return !!this.draft.name.trim() && !!this.draft.location.trim();
  }

  get stateOptions(): string[] {
    return this.statesByCountry[this.selectedCountry] ?? [];
  }

  getStateOptionLabel(state: string): string {
    if (this.selectedCountry !== 'Brasil') {
      return state;
    }

    const uf = this.brazilStateAbbreviations[state];
    return uf ? `${state} ${uf}` : state;
  }

  onCountryChange(country: string): void {
    this.selectedCountry = country;
    this.selectedState = this.stateOptions[0] ?? '';
    this.updateDraftLocation();
  }

  onStateChange(state: string): void {
    this.selectedState = state;
    this.updateDraftLocation();
  }

  saveCompany(): void {
    if (!this.canSave) {
      return;
    }

    const wasCreatingCompany = !this.isEditMode;
    const previousCompanyName = this.editingCompanyName;
    const savedCompany = this.companiesFacade.saveCompany({
      ...this.draft,
      name: this.draft.name.trim(),
      sector: this.draft.sector.trim(),
      location: this.draft.location.trim(),
      description: this.draft.description.trim(),
      followers: this.draft.followers.trim(),
      linkedinCount: this.draft.linkedinCount.trim(),
      logoLabel: this.draft.logoLabel.trim(),
      logoUrl: this.draft.logoUrl?.trim() || undefined,
      website: this.draft.website?.trim() || undefined,
      emailDomain: this.draft.emailDomain?.trim() || undefined,
      notes: this.draft.notes?.trim() || undefined,
    });

    if (wasCreatingCompany) {
      this.linkCompanyToCurrentRecruiter(savedCompany.name);
    }

    if (this.isEditMode && previousCompanyName && previousCompanyName !== savedCompany.name) {
      this.recruitersFacade.replaceCompanyName(previousCompanyName, savedCompany.name);
      this.jobsFacade.renameCompany(previousCompanyName, savedCompany.name);
    }

    void this.router.navigateByUrl('/empresa');
  }

  private linkCompanyToCurrentRecruiter(companyName: string): void {
    const normalizedCompanyName = companyName.trim();
    if (!normalizedCompanyName) {
      return;
    }

    const currentRecruiter = this.recruitersFacade.getCurrentRecruiter();
    if (currentRecruiter.managedCompanies.includes(normalizedCompanyName)) {
      return;
    }

    this.recruitersFacade.saveRecruiter({
      ...currentRecruiter,
      managedCompanies: [...currentRecruiter.managedCompanies, normalizedCompanyName],
    });
  }

  private createEmptyDraft(): CompanyDraft {
    return {
      name: '',
      sector: 'Tecnologia',
      location: 'Rio de Janeiro - Brasil',
      description: '',
      followers: '',
      linkedinCount: '',
      logoLabel: '',
      logoUrl: '',
      website: '',
      emailDomain: '',
      monthlyHiringCount: 18,
      active: true,
      notes: '',
    };
  }

  private updateDraftLocation(): void {
    this.draft = {
      ...this.draft,
      location: [this.selectedState, this.selectedCountry].filter(Boolean).join(' - '),
    };
  }

  private syncLocationControlsFromDraft(): void {
    const normalizedLocation = this.draft.location.trim();
    const [rawState = '', rawCountry = ''] = normalizedLocation.split(' - ').map((item) => item.trim());
    const matchedCountry = this.countryOptions.find((country) => country === rawCountry) ?? 'Brasil';
    const matchedState = this.statesByCountry[matchedCountry]?.find((state) => state === rawState)
      ?? this.statesByCountry[matchedCountry]?.[0]
      ?? '';

    this.selectedCountry = matchedCountry;
    this.selectedState = matchedState;
    this.updateDraftLocation();
  }

  private toDraft(company: CompanyRecord): CompanyDraft {
    return {
      id: company.id,
      name: company.name,
      sector: company.sector,
      location: company.location,
      description: company.description,
      followers: company.followers,
      linkedinCount: company.linkedinCount,
      logoLabel: company.logoLabel,
      logoUrl: company.logoUrl || '',
      website: company.website || '',
      emailDomain: company.emailDomain || '',
      monthlyHiringCount: company.monthlyHiringCount,
      active: company.active,
      notes: company.notes || '',
    };
  }
}
