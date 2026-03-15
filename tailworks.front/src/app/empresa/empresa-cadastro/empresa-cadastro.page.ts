import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { RecruiterDirectoryService } from '../../recruiter/recruiter-directory.service';
import { VagasMockService } from '../../vagas/data/vagas-mock.service';
import { EmpresaDirectoryService } from '../empresa-directory.service';
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
  private readonly companyDirectoryService = inject(EmpresaDirectoryService);
  private readonly recruiterDirectoryService = inject(RecruiterDirectoryService);
  private readonly vagasMockService = inject(VagasMockService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();

  draft: CompanyDraft = this.createEmptyDraft();
  editingCompanyId: string | null = null;
  editingCompanyName = '';
  isEditMode = false;

  constructor() {
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        const editingId = params.get('edit')?.trim() || null;
        const company = editingId ? this.companyDirectoryService.getCompanyById(editingId) : undefined;

        this.editingCompanyId = company?.id ?? editingId;
        this.editingCompanyName = company?.name ?? '';
        this.isEditMode = !!company;
        this.draft = company ? this.toDraft(company) : this.createEmptyDraft();
        this.cdr.markForCheck();
      }),
    );

    this.subscriptions.add(
      this.companyDirectoryService.changes$.subscribe(() => {
        if (!this.isEditMode || !this.editingCompanyId) {
          this.cdr.markForCheck();
          return;
        }

        const company = this.companyDirectoryService.getCompanyById(this.editingCompanyId);
        if (company) {
          this.draft = this.toDraft(company);
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

  get avatarPreviewUrl(): string {
    return this.draft.logoUrl?.trim() || '';
  }

  get avatarInitials(): string {
    const base = this.draft.logoLabel.trim() || this.draft.name.trim().slice(0, 2);
    return (base || 'em').slice(0, 2).toUpperCase();
  }

  saveCompany(): void {
    if (!this.canSave) {
      return;
    }

    const previousCompanyName = this.editingCompanyName;
    const savedCompany = this.companyDirectoryService.saveCompany({
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

    if (this.isEditMode && previousCompanyName && previousCompanyName !== savedCompany.name) {
      this.recruiterDirectoryService.replaceCompanyName(previousCompanyName, savedCompany.name);
      this.vagasMockService.renameCompany(previousCompanyName, savedCompany.name);
    }

    void this.router.navigateByUrl('/empresa');
  }

  private createEmptyDraft(): CompanyDraft {
    return {
      name: '',
      sector: 'Tecnologia',
      location: 'Brasil',
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
