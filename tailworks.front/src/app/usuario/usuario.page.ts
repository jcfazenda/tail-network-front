import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { CandidateRegistrationStripComponent } from './shared/candidate-registration-strip.component';
import { DadosCadastraisPage } from './dados-cadastrais/dados-cadastrais.page';
import { StacksPage } from './stacks/stacks.page';
import { ExperienciaPage } from './experiencia/experiencia.page';
import { FormacaoPage } from './formacao/formacao.page';

type CandidateBasicProfile = {
  name: string;
};

type CandidateBasicDraft = {
  profile?: Partial<CandidateBasicProfile>;
  photoPreviewUrl?: string;
};

type FormationCopyDraft = {
  endMonth: string;
  endYear: string;
  graduation: string;
  specialization: string;
};

@Component({
  standalone: true,
  selector: 'app-usuario-page',
  imports: [CommonModule, CandidateRegistrationStripComponent, DadosCadastraisPage, StacksPage, ExperienciaPage, FormacaoPage],
  templateUrl: './usuario.page.html',
  styleUrls: ['./usuario.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioPage implements OnInit {
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';
  private static readonly formationLogoStorageKey = 'tailworks:candidate-experience-logo-draft:v1';

  displayName = 'Julio Fazenda';
  displayFormationHeading = 'Formado em Dez 2025';
  displayGraduation = 'Bacharelado em Sistemas de Informação';
  displaySpecialization = 'Especialização em Arquitetura de Software';
  formationLogoUrl = '/assets/images/logo-estacio.png';
  photoPreviewUrl = '';
  isBasicDataModalOpen = false;

  @ViewChild(FormacaoPage) private formacaoPage?: FormacaoPage;

  ngOnInit(): void {
    this.restoreHeaderData();
  }

  openBasicDataModal(): void {
    this.isBasicDataModalOpen = true;
  }

  closeBasicDataModal(): void {
    this.isBasicDataModalOpen = false;
  }

  openFormationEditor(): void {
    this.formacaoPage?.openFormationModal();
  }

  private restoreHeaderData(): void {
    this.restoreBasicDraft();
    this.restoreFormationCopy();
    this.restoreFormationLogo();
  }

  private restoreBasicDraft(): void {
    const rawDraft = localStorage.getItem(UsuarioPage.basicDraftStorageKey);

    if (!rawDraft) {
      this.displayName = 'Julio Fazenda';
      this.photoPreviewUrl = '';
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as CandidateBasicDraft;
      this.displayName = draft.profile?.name?.trim() || 'Julio Fazenda';
      this.photoPreviewUrl = draft.photoPreviewUrl ?? '';
    } catch {
      localStorage.removeItem(UsuarioPage.basicDraftStorageKey);
      this.displayName = 'Julio Fazenda';
      this.photoPreviewUrl = '';
    }
  }

  private restoreFormationCopy(): void {
    const rawDraft = localStorage.getItem(UsuarioPage.formationCopyStorageKey);

    if (!rawDraft) {
      this.displayFormationHeading = 'Formado em Dez 2025';
      this.displayGraduation = 'Bacharelado em Sistemas de Informação';
      this.displaySpecialization = 'Especialização em Arquitetura de Software';
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as Partial<FormationCopyDraft>;
      this.displayFormationHeading =
        draft.endMonth && draft.endYear ? `Formado em ${draft.endMonth} ${draft.endYear}` : 'Formado em Dez 2025';
      this.displayGraduation = draft.graduation?.trim() || 'Bacharelado em Sistemas de Informação';
      this.displaySpecialization = draft.specialization?.trim() || 'Especialização em Arquitetura de Software';
    } catch {
      localStorage.removeItem(UsuarioPage.formationCopyStorageKey);
      this.displayFormationHeading = 'Formado em Dez 2025';
      this.displayGraduation = 'Bacharelado em Sistemas de Informação';
      this.displaySpecialization = 'Especialização em Arquitetura de Software';
    }
  }

  private restoreFormationLogo(): void {
    const savedLogo = localStorage.getItem(UsuarioPage.formationLogoStorageKey);

    if (!savedLogo) {
      this.formationLogoUrl = '/assets/images/logo-estacio.png';
      return;
    }

    this.formationLogoUrl = savedLogo;
  }
}
