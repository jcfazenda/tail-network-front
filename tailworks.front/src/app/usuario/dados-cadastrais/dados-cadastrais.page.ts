import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

type RegistrationStep = {
  label: string;
  index: number | string;
  route?: string;
  active?: boolean;
};

type CandidateBasicProfile = {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
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
};

@Component({
  standalone: true,
  selector: 'app-dados-cadastrais-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dados-cadastrais.page.html',
  styleUrls: ['./dados-cadastrais.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DadosCadastraisPage implements OnInit, OnDestroy {
  private static readonly draftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';

  private readonly router = inject(Router);

  readonly steps: RegistrationStep[] = [
    { index: 1, label: 'Dados Básicos', route: '/usuario/dados-cadastrais', active: true },
    { index: 2, label: 'Suas Stacks', route: '/usuario/dados-cadastrais/stacks' },
    { index: 3, label: 'Experiência', route: '/usuario/dados-cadastrais/experiencia' },
    { index: 4, label: 'Geral', route: '/usuario/dados-cadastrais/geral' },
  ];

  readonly stateOptions = [
    'São Paulo - SP',
    'Rio de Janeiro - RJ',
    'Belo Horizonte - MG',
    'Curitiba - PR',
    'Porto Alegre - RS',
  ];

  readonly acceptedPhotoMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
  readonly maxPhotoSizeBytes = 5 * 1024 * 1024;

  profile: CandidateBasicProfile = {
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    location: '',
    portfolio: '',
    formation: '',
  };

  submitAttempted = false;
  isPhotoDragging = false;
  photoPreviewUrl = '';
  photoFileName = '';
  photoError = '';
  formationCopy: FormationCopyDraft = {
    graduation: 'Bacharelado em Sistemas de Informação',
    specialization: 'Especialização em Arquitetura de Software',
  };

  get displayName(): string {
    return this.profile.name.trim() || 'Julio Fazenda';
  }

  get displayGraduation(): string {
    return this.formationCopy.graduation;
  }

  get displaySpecialization(): string {
    return this.formationCopy.specialization;
  }

  ngOnInit(): void {
    this.restoreDraft();
    this.restoreFormationCopy();
  }

  ngOnDestroy(): void {
    this.revokePhotoPreviewUrl();
  }

  submitBasicData(form: NgForm): void {
    this.submitAttempted = true;

    if (form.invalid) {
      return;
    }

    this.persistDraft();
    void this.router.navigate(['/usuario/dados-cadastrais/stacks']);
  }

  onPhoneInput(rawValue: string): void {
    const digits = rawValue.replace(/\D/g, '').slice(0, 11);
    this.profile.phone = this.formatPhone(digits);
  }

  showFieldError(control: NgModel | null): boolean {
    return Boolean(control && control.invalid && (control.touched || this.submitAttempted));
  }

  openPhotoPicker(input: HTMLInputElement): void {
    input.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.handlePhotoFile(input?.files?.[0] ?? null);

    if (input) {
      input.value = '';
    }
  }

  onPhotoDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isPhotoDragging = true;
  }

  onPhotoDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isPhotoDragging = false;
  }

  onPhotoDropped(event: DragEvent, input: HTMLInputElement): void {
    event.preventDefault();
    this.isPhotoDragging = false;
    this.handlePhotoFile(event.dataTransfer?.files?.[0] ?? null);
    input.value = '';
  }

  onPhotoKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openPhotoPicker(input);
  }

  private handlePhotoFile(file: File | null): void {
    this.photoError = '';

    if (!file) {
      return;
    }

    if (!this.acceptedPhotoMimeTypes.includes(file.type)) {
      this.photoError = 'Use apenas JPG, PNG ou GIF.';
      return;
    }

    if (file.size > this.maxPhotoSizeBytes) {
      this.photoError = 'A foto deve ter no máximo 5MB.';
      return;
    }

    this.photoFileName = file.name;
    this.readPhotoAsDataUrl(file);
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
      };
    } catch {
      localStorage.removeItem(DadosCadastraisPage.formationCopyStorageKey);
    }
  }

  private persistDraft(): void {
    localStorage.setItem(
      DadosCadastraisPage.draftStorageKey,
      JSON.stringify({
        profile: this.profile,
        photoPreviewUrl: this.photoPreviewUrl,
        photoFileName: this.photoFileName,
      }),
    );
  }

  private readPhotoAsDataUrl(file: File): void {
    const reader = new FileReader();

    reader.onload = () => {
      this.revokePhotoPreviewUrl();
      this.photoPreviewUrl = typeof reader.result === 'string' ? reader.result : '';
      this.persistDraft();
    };

    reader.readAsDataURL(file);
  }

  private revokePhotoPreviewUrl(): void {
    if (!this.photoPreviewUrl.startsWith('blob:')) {
      return;
    }

    URL.revokeObjectURL(this.photoPreviewUrl);
  }
}
