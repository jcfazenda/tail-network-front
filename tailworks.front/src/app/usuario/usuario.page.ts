import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { DadosCadastraisPage } from './dados-cadastrais/dados-cadastrais.page';
import { FormacaoPage } from './formacao/formacao.page';
import { CandidateRegistrationStripComponent } from './shared/candidate-registration-strip.component';

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

type ProfileWorkspaceCard = {
  icon: string;
  title: string;
  description: string;
  route?: string;
  action?: 'basic' | 'formation';
};

@Component({
  standalone: true,
  selector: 'app-usuario-page',
  imports: [CommonModule, RouterLink, CandidateRegistrationStripComponent, DadosCadastraisPage, FormacaoPage],
  templateUrl: './usuario.page.html',
  styleUrls: ['./usuario.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioPage implements OnInit, AfterViewInit, OnDestroy {
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';
  private static readonly formationLogoStorageKey = 'tailworks:candidate-experience-logo-draft:v1';
  private static readonly ecosystemVisibilityStorageKey = 'tailworks:candidate-experience-ecosystem-visibility:v1';
  private static readonly candidacyAvailabilityStorageKey = 'tailworks:candidate-experience-candidacy-availability:v1';
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
  formationLogoUrl = '/assets/images/formacao-default.png';
  photoPreviewUrl = '';
  isBasicDataModalOpen = false;
  isVisibleInEcosystem = true;
  isAvailableForApplications = true;
  private shouldOpenFormationModalFromRoute = false;

  readonly workspaceCards: ProfileWorkspaceCard[] = [
    {
      icon: 'badge',
      title: 'Dados Básicos',
      description: 'Atualize seus dados principais, links profissionais e localização.',
      action: 'basic',
    },
    {
      icon: 'description',
      title: 'Documentos',
      description: 'Separe os documentos que podem ser exigidos ao longo da sua jornada.',
      route: '/usuario/documentos',
    },
    {
      icon: 'deployed_code',
      title: 'Minhas Stacks',
      description: 'Mantenha seu radar técnico em uma tela dedicada e mais simples de evoluir.',
      route: '/usuario/stacks',
    },
    {
      icon: 'business_center',
      title: 'Experiências',
      description: 'Trabalhe seu histórico profissional sem misturar tudo na mesma manutenção.',
      route: '/usuario/experiencia',
    },
    {
      icon: 'school',
      title: 'Formação',
      description: 'Revise graduação, especialização e a identidade acadêmica exibida no perfil.',
      action: 'formation',
    },
  ];

  @ViewChild(FormacaoPage) private formacaoPage?: FormacaoPage;

  ngOnInit(): void {
    this.restoreHeaderData();
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        const modal = params.get('modal');
        const section = params.get('section');

        if (section === 'stacks') {
          void this.router.navigate(['/usuario/stacks'], { replaceUrl: true });
          return;
        }

        if (section === 'experiencia') {
          void this.router.navigate(['/usuario/experiencia'], { replaceUrl: true });
          return;
        }

        if (section === 'formacao') {
          this.isBasicDataModalOpen = false;
          this.shouldOpenFormationModalFromRoute = true;
          this.tryOpenFormationModalFromRoute();
          return;
        }

        this.isBasicDataModalOpen = modal === 'basic';
        this.shouldOpenFormationModalFromRoute = modal === 'formacao';
        this.tryOpenFormationModalFromRoute();
      }),
    );
  }

  ngAfterViewInit(): void {
    this.tryOpenFormationModalFromRoute();
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

  openWorkspaceCard(card: ProfileWorkspaceCard): void {
    if (card.action === 'basic') {
      this.openBasicDataModal();
      return;
    }

    if (card.action === 'formation') {
      this.openFormationEditor();
    }
  }

  trackWorkspaceCard(_index: number, card: ProfileWorkspaceCard): string {
    return card.title;
  }

  private restoreHeaderData(): void {
    this.restoreBasicDraft();
    this.restoreFormationCopy();
    this.restoreFormationLogo();
    this.restoreAvailabilityControls();
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

    if (!savedLogo?.trim()) {
      this.formationLogoUrl = '/assets/images/formacao-default.png';
      return;
    }

    this.formationLogoUrl = savedLogo.trim();
  }

  private composeCityState(city?: string, state?: string, location?: string): string {
    const safeCity = city?.trim();
    const safeState = state?.trim();

    if (safeCity && safeState) {
      return `${safeCity} - ${safeState}`;
    }

    return location?.trim() || 'Rio de Janeiro - RJ';
  }

  updateVisibleInEcosystem(nextValue: boolean): void {
    this.isVisibleInEcosystem = nextValue;
    this.persistAvailabilityControls();
  }

  updateAvailableForApplications(nextValue: boolean): void {
    this.isAvailableForApplications = nextValue;
    this.persistAvailabilityControls();
  }

  private restoreAvailabilityControls(): void {
    const ecosystemVisibility = localStorage.getItem(UsuarioPage.ecosystemVisibilityStorageKey);
    const candidacyAvailability = localStorage.getItem(UsuarioPage.candidacyAvailabilityStorageKey);

    if (ecosystemVisibility !== null) {
      this.isVisibleInEcosystem = ecosystemVisibility === 'true';
    }

    if (candidacyAvailability !== null) {
      this.isAvailableForApplications = candidacyAvailability === 'true';
    }
  }

  private persistAvailabilityControls(): void {
    localStorage.setItem(UsuarioPage.ecosystemVisibilityStorageKey, String(this.isVisibleInEcosystem));
    localStorage.setItem(UsuarioPage.candidacyAvailabilityStorageKey, String(this.isAvailableForApplications));
  }

  private tryOpenFormationModalFromRoute(): void {
    if (!this.shouldOpenFormationModalFromRoute || !this.formacaoPage) {
      return;
    }

    this.shouldOpenFormationModalFromRoute = false;
    this.formacaoPage.openFormationModal();
    this.clearQueryParam('modal');
    this.clearQueryParam('section');
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
