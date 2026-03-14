import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CandidateRegistrationStripComponent } from './shared/candidate-registration-strip.component';
import { DadosCadastraisPage } from './dados-cadastrais/dados-cadastrais.page';
import { StacksPage } from './stacks/stacks.page';
import { ExperienciaPage } from './experiencia/experiencia.page';
import { FormacaoPage } from './formacao/formacao.page';

type CandidateBasicProfile = {
  name: string;
  email: string;
  phone: string;
  state: string;
  city: string;
  location: string;
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
  graduated?: boolean;
};

@Component({
  standalone: true,
  selector: 'app-usuario-page',
  imports: [CommonModule, CandidateRegistrationStripComponent, DadosCadastraisPage, StacksPage, ExperienciaPage, FormacaoPage],
  templateUrl: './usuario.page.html',
  styleUrls: ['./usuario.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioPage implements OnInit, OnDestroy {
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';
  private static readonly formationLogoStorageKey = 'tailworks:candidate-experience-logo-draft:v1';
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly subscriptions = new Subscription();

  displayName = 'Julio Fazenda';
  displayEmail = 'jfazenda@gmail.com';
  displayPhone = '(11) 1111-1111';
  displayCityState = 'Rio de Janeiro - RJ';
  displayFormationHeading = 'Formado em Dez 2025';
  displayGraduation = 'Bacharelado em Sistemas de Informação';
  displaySpecialization = 'Especialização em Arquitetura de Software';
  formationLogoUrl = '/assets/images/logo-estacio.png';
  photoPreviewUrl = '';
  isBasicDataModalOpen = false;

  @ViewChild(FormacaoPage) private formacaoPage?: FormacaoPage;

  ngOnInit(): void {
    this.restoreHeaderData();
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        const modal = params.get('modal');
        const section = params.get('section');

        this.isBasicDataModalOpen = modal === 'basic';

        if (section) {
          this.scrollToSection(section);
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  openBasicDataModal(): void {
    this.isBasicDataModalOpen = true;
  }

  closeBasicDataModal(): void {
    this.isBasicDataModalOpen = false;
    this.clearQueryParam('modal');
  }

  handleBasicDataSaved(): void {
    this.restoreHeaderData();
    this.closeBasicDataModal();
  }

  handleFormationSaved(): void {
    this.restoreHeaderData();
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
      this.displayEmail = 'jfazenda@gmail.com';
      this.displayPhone = '(11) 1111-1111';
      this.displayCityState = 'Rio de Janeiro - RJ';
      this.photoPreviewUrl = '';
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as CandidateBasicDraft;
      this.displayName = draft.profile?.name?.trim() || 'Julio Fazenda';
      this.displayEmail = draft.profile?.email?.trim() || 'jfazenda@gmail.com';
      this.displayPhone = draft.profile?.phone?.trim() || '(11) 1111-1111';
      this.displayCityState = this.composeCityState(draft.profile?.city, draft.profile?.state, draft.profile?.location);
      this.photoPreviewUrl = draft.photoPreviewUrl ?? '';
    } catch {
      localStorage.removeItem(UsuarioPage.basicDraftStorageKey);
      this.displayName = 'Julio Fazenda';
      this.displayEmail = 'jfazenda@gmail.com';
      this.displayPhone = '(11) 1111-1111';
      this.displayCityState = 'Rio de Janeiro - RJ';
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
        draft.graduated === false
          ? 'Em andamento'
          : draft.endMonth && draft.endYear
            ? `Formado em ${draft.endMonth} ${draft.endYear}`
            : 'Formado em Dez 2025';
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

  private composeCityState(city?: string, state?: string, location?: string): string {
    const safeCity = city?.trim();
    const safeState = state?.trim();

    if (safeCity && safeState) {
      return `${safeCity} - ${safeState}`;
    }

    return location?.trim() || 'Rio de Janeiro - RJ';
  }

  private scrollToSection(section: string): void {
    const sectionId = this.resolveSectionId(section);
    if (!sectionId || typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      const target = document.getElementById(sectionId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private resolveSectionId(section: string): string | null {
    switch (section) {
      case 'stacks':
        return 'usuario-stacks';
      case 'experiencia':
        return 'usuario-experiencia';
      case 'formacao':
        return 'usuario-formacao';
      default:
        return null;
    }
  }

  private clearQueryParam(param: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        [param]: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
