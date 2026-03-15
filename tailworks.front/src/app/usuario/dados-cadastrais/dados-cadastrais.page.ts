import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Router } from '@angular/router';

type CandidateBasicProfile = {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  state: string;
  city: string;
  location: string;
  portfolio: string;
  formation: string;
};

type CandidateBasicDraft = {
  profile?: Partial<CandidateBasicProfile>;
  photoPreviewUrl?: string;
  photoFileName?: string;
};

type FormationCopyDraft = {
  graduation: string;
  specialization: string;
  endMonth: string;
  endYear: string;
  educationStatus: string;
};

@Component({
  standalone: true,
  selector: 'app-dados-cadastrais-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './dados-cadastrais.page.html',
  styleUrls: ['./dados-cadastrais.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DadosCadastraisPage implements OnInit, OnDestroy {
  private static readonly draftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';
  private static readonly logoDraftStorageKey = 'tailworks:candidate-experience-logo-draft:v1';
  private static readonly photoUpdatedEventName = 'tailworks:candidate-photo-updated';

  private readonly router = inject(Router);
  private readonly photoUpdatedListener = (event: Event) => {
    const customEvent = event as CustomEvent<{ photoPreviewUrl?: string; photoFileName?: string }>;
    this.photoPreviewUrl = customEvent.detail?.photoPreviewUrl ?? this.photoPreviewUrl;
    this.photoFileName = customEvent.detail?.photoFileName ?? this.photoFileName;
    this.photoError = '';
  };

  readonly stateOptions = [
    { value: 'SP', label: 'São Paulo' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PR', label: 'Paraná' },
    { value: 'RS', label: 'Rio Grande do Sul' },
  ];

  profile: CandidateBasicProfile = {
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    state: '',
    city: '',
    location: '',
    portfolio: '',
    formation: '',
  };

  submitAttempted = false;
  isPhotoDragging = false;
  photoPreviewUrl = '';
  photoFileName = '';
  photoError = '';
  formationLogoUrl = '/assets/images/formacao-default.png';
  formationCopy: FormationCopyDraft = {
    graduation: 'Bacharelado em Sistemas de Informação',
    specialization: 'Especialização em Arquitetura de Software',
    endMonth: 'Dez',
    endYear: '2025',
    educationStatus: 'Concluído',
  };

  @Output() readonly cancelRequested = new EventEmitter<void>();
  @Output() readonly saveCompleted = new EventEmitter<void>();

  get displayName(): string {
    return this.profile.name.trim() || 'Julio Fazenda';
  }

  get displayGraduation(): string {
    return this.formationCopy.graduation;
  }

  get displaySpecialization(): string {
    return this.formationCopy.specialization;
  }

  get displayFormationHeading(): string {
    return `Formado em ${this.formationCopy.endMonth} ${this.formationCopy.endYear}`;
  }

  get displayEducationStatus(): string {
    return this.formationCopy.educationStatus;
  }

  ngOnInit(): void {
    this.restoreDraft();
    this.restoreFormationLogo();
    this.restoreFormationCopy();
    window.addEventListener(DadosCadastraisPage.photoUpdatedEventName, this.photoUpdatedListener as EventListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener(DadosCadastraisPage.photoUpdatedEventName, this.photoUpdatedListener as EventListener);
    this.revokePhotoPreviewUrl();
  }

  submitBasicData(form: NgForm): void {
    this.submitAttempted = true;

    if (form.invalid) {
      return;
    }

    this.syncLocationFromFields();
    this.persistDraft();
    this.saveCompleted.emit();
  }

  cancelBasicData(): void {
    this.cancelRequested.emit();
  }

  onPhoneInput(rawValue: string): void {
    const digits = rawValue.replace(/\D/g, '').slice(0, 11);
    this.profile.phone = this.formatPhone(digits);
  }

  showFieldError(control: NgModel | null): boolean {
    return Boolean(control && control.invalid && (control.touched || this.submitAttempted));
  }

  openFormationSection(): void {
    void this.router.navigate(['/usuario/dados-cadastrais'], {
      queryParams: { modal: 'formacao' },
    });
  }

  private formatPhone(digits: string): string {
    if (!digits) {
      return '';
    }

    const ddd = digits.slice(0, 2);
    const first = digits.slice(2, 3);
    const middle = digits.slice(3, 7);
    const last = digits.slice(7, 11);

    let formatted = `(${ddd}`;

    if (ddd.length === 2) {
      formatted += ')';
    }

    if (first) {
      formatted += ` ${first}`;
    }

    if (middle) {
      formatted += ` ${middle}`;
    }

    if (last) {
      formatted += `-${last}`;
    }

    return formatted;
  }

  private restoreDraft(): void {
    const rawDraft = localStorage.getItem(DadosCadastraisPage.draftStorageKey);

    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as CandidateBasicDraft;

      this.profile = {
        ...this.profile,
        ...draft.profile,
      };
      this.restoreLocationParts();
      this.photoPreviewUrl = draft.photoPreviewUrl ?? '';
      this.photoFileName = draft.photoFileName ?? '';
    } catch {
      localStorage.removeItem(DadosCadastraisPage.draftStorageKey);
    }
  }

  private restoreFormationCopy(): void {
    const rawDraft = localStorage.getItem(DadosCadastraisPage.formationCopyStorageKey);

    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as Partial<FormationCopyDraft>;
      this.formationCopy = {
        graduation: draft.graduation?.trim() || this.formationCopy.graduation,
        specialization: draft.specialization?.trim() || this.formationCopy.specialization,
        endMonth: draft.endMonth || this.formationCopy.endMonth,
        endYear: draft.endYear || this.formationCopy.endYear,
        educationStatus: draft.educationStatus?.trim() || this.formationCopy.educationStatus,
      };
    } catch {
      localStorage.removeItem(DadosCadastraisPage.formationCopyStorageKey);
    }
  }

  private restoreFormationLogo(): void {
    const savedLogo = localStorage.getItem(DadosCadastraisPage.logoDraftStorageKey);

    if (!savedLogo?.trim()) {
      this.formationLogoUrl = '/assets/images/formacao-default.png';
      return;
    }

    this.formationLogoUrl = savedLogo.trim();
  }

  private persistDraft(): void {
    this.syncLocationFromFields();

    localStorage.setItem(
      DadosCadastraisPage.draftStorageKey,
      JSON.stringify({
        profile: this.profile,
        photoPreviewUrl: this.photoPreviewUrl,
        photoFileName: this.photoFileName,
      }),
    );
  }

  private revokePhotoPreviewUrl(): void {
    if (!this.photoPreviewUrl.startsWith('blob:')) {
      return;
    }

    URL.revokeObjectURL(this.photoPreviewUrl);
  }

  private scrollToSection(sectionId: string, fallbackRoute: string): void {
    const target = document.getElementById(sectionId);

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    void this.router.navigate([fallbackRoute]);
  }

  private syncLocationFromFields(): void {
    const city = this.profile.city.trim();
    const state = this.profile.state.trim();

    this.profile.location = city && state ? `${city} - ${state}` : city || state || '';
  }

  private restoreLocationParts(): void {
    if (this.profile.city || this.profile.state) {
      this.syncLocationFromFields();
      return;
    }

    const location = this.profile.location.trim();

    if (!location) {
      return;
    }

    const parts = location.split(' - ').map((item) => item.trim()).filter(Boolean);

    if (parts.length >= 2) {
      this.profile.city = parts[0];
      this.profile.state = parts[1];
      return;
    }

    this.profile.city = location;
  }
}
