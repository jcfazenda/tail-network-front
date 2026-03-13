import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

type RegistrationStep = {
  label: string;
  index: number | string;
  route?: string;
  active?: boolean;
};

type CandidateBasicProfile = {
  name: string;
  formation: string;
};

type CandidateBasicDraft = {
  profile?: Partial<CandidateBasicProfile>;
  photoPreviewUrl?: string;
};

type FormationCopyDraft = {
  graduation: string;
  specialization: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  graduated: boolean;
  educationStatus: string;
};

@Component({
  standalone: true,
  selector: 'app-formacao-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './formacao.page.html',
  styleUrls: ['./formacao.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormacaoPage implements OnInit {
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly logoDraftStorageKey = 'tailworks:candidate-experience-logo-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';
  private static readonly radarAvailabilityStorageKey = 'tailworks:candidate-experience-radar-availability:v1';

  private readonly router = inject(Router);

  readonly steps: RegistrationStep[] = [
    { index: 1, label: 'Dados Básicos', route: '/usuario/dados-cadastrais' },
    { index: 2, label: 'Suas Stacks', route: '/usuario/dados-cadastrais/stacks' },
    { index: 3, label: 'Experiência', route: '/usuario/dados-cadastrais/experiencia' },
    { index: 4, label: 'Formação', route: '/usuario/dados-cadastrais/formacao', active: true },
  ];

  readonly monthOptions = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  readonly yearOptions = Array.from({ length: 21 }, (_value, index) => String(2026 - index));
  readonly acceptedLogoMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  readonly maxLogoSizeBytes = 5 * 1024 * 1024;
  readonly defaultIntroLogoUrl = '/assets/images/logo-estacio.png';

  profile: CandidateBasicProfile = {
    name: '',
    formation: '',
  };
  photoPreviewUrl = '';
  introLogoUrl = this.defaultIntroLogoUrl;
  introLogoError = '';
  isFormationModalOpen = false;
  isAvailableInRadar = true;
  formationCopy: FormationCopyDraft = {
    graduation: 'Bacharelado em Sistemas de Informação',
    specialization: 'Especialização em Arquitetura de Software',
    startMonth: 'Jan',
    startYear: '2021',
    endMonth: 'Dez',
    endYear: '2025',
    graduated: true,
    educationStatus: 'Concluído',
  };
  formationDraft: FormationCopyDraft = { ...this.formationCopy };

  get displayName(): string {
    return this.profile.name.trim() || 'Julio Fazenda';
  }

  get displayGraduation(): string {
    return this.formationCopy.graduation;
  }

  get displaySpecialization(): string {
    return this.formationCopy.specialization;
  }

  get displayEducationStatus(): string {
    return this.formationCopy.educationStatus;
  }

  get displayFormationHeading(): string {
    return this.formationCopy.graduated
      ? `Formado em ${this.formationCopy.endMonth} ${this.formationCopy.endYear}`
      : 'Cursando';
  }

  ngOnInit(): void {
    this.restoreBasicDraft();
    this.restoreIntroLogo();
    this.restoreFormationCopy();
    this.restoreRadarAvailability();
  }

  openFormationModal(): void {
    this.formationDraft = { ...this.formationCopy };
    this.isFormationModalOpen = true;
  }

  closeFormationModal(): void {
    this.isFormationModalOpen = false;
  }

  saveFormationCopy(form: NgForm): void {
    if (form.invalid) {
      return;
    }

    this.formationCopy = {
      graduation: this.formationDraft.graduation.trim(),
      specialization: this.formationDraft.specialization.trim(),
      startMonth: this.formationDraft.startMonth,
      startYear: this.formationDraft.startYear,
      endMonth: this.formationDraft.endMonth,
      endYear: this.formationDraft.endYear,
      graduated: this.formationDraft.graduated,
      educationStatus: this.formationDraft.graduated ? 'Concluído' : `${this.formationDraft.startMonth}/${this.formationDraft.startYear}`,
    };
    this.persistFormationCopy();
    this.closeFormationModal();
  }

  openIntroLogoPicker(input: HTMLInputElement): void {
    input.click();
  }

  onIntroLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.handleIntroLogoFile(input?.files?.[0] ?? null);

    if (input) {
      input.value = '';
    }
  }

  onIntroLogoKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openIntroLogoPicker(input);
  }

  updateRadarAvailability(nextValue: boolean): void {
    this.isAvailableInRadar = nextValue;
    this.persistRadarAvailability();
  }

  private restoreBasicDraft(): void {
    const rawDraft = localStorage.getItem(FormacaoPage.basicDraftStorageKey);

    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as CandidateBasicDraft;
      this.profile = {
        ...this.profile,
        ...draft.profile,
      };
      this.photoPreviewUrl = draft.photoPreviewUrl ?? '';
    } catch {
      localStorage.removeItem(FormacaoPage.basicDraftStorageKey);
    }
  }

  private restoreIntroLogo(): void {
    const savedLogo = localStorage.getItem(FormacaoPage.logoDraftStorageKey);

    if (!savedLogo) {
      return;
    }

    this.introLogoUrl = savedLogo;
  }

  private persistIntroLogo(): void {
    localStorage.setItem(FormacaoPage.logoDraftStorageKey, this.introLogoUrl);
  }

  private restoreFormationCopy(): void {
    const rawDraft = localStorage.getItem(FormacaoPage.formationCopyStorageKey);

    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as Partial<FormationCopyDraft>;
      this.formationCopy = {
        graduation: draft.graduation?.trim() || this.formationCopy.graduation,
        specialization: draft.specialization?.trim() || this.formationCopy.specialization,
        startMonth: draft.startMonth || this.formationCopy.startMonth,
        startYear: draft.startYear || this.formationCopy.startYear,
        endMonth: draft.endMonth || this.formationCopy.endMonth,
        endYear: draft.endYear || this.formationCopy.endYear,
        graduated: typeof draft.graduated === 'boolean' ? draft.graduated : this.formationCopy.graduated,
        educationStatus: draft.educationStatus?.trim() || this.formationCopy.educationStatus,
      };
    } catch {
      localStorage.removeItem(FormacaoPage.formationCopyStorageKey);
    }
  }

  private persistFormationCopy(): void {
    localStorage.setItem(FormacaoPage.formationCopyStorageKey, JSON.stringify(this.formationCopy));
  }

  private restoreRadarAvailability(): void {
    const rawDraft = localStorage.getItem(FormacaoPage.radarAvailabilityStorageKey);

    if (rawDraft === null) {
      return;
    }

    this.isAvailableInRadar = rawDraft === 'true';
  }

  private persistRadarAvailability(): void {
    localStorage.setItem(FormacaoPage.radarAvailabilityStorageKey, String(this.isAvailableInRadar));
  }

  private handleIntroLogoFile(file: File | null): void {
    this.introLogoError = '';

    if (!file) {
      return;
    }

    if (!this.acceptedLogoMimeTypes.includes(file.type)) {
      this.introLogoError = 'Use JPG, PNG, GIF ou WEBP.';
      return;
    }

    if (file.size > this.maxLogoSizeBytes) {
      this.introLogoError = 'A imagem deve ter no máximo 5MB.';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      this.introLogoUrl = typeof reader.result === 'string' ? reader.result : this.defaultIntroLogoUrl;
      this.persistIntroLogo();
    };

    reader.readAsDataURL(file);
  }
}
