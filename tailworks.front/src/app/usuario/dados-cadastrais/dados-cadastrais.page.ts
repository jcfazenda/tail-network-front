import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthFacade } from '../../core/facades/auth.facade';
import { LocalMediaStorageService } from '../../core/storage/local-media-storage.service';
import { TalentProfileStoreService } from '../../talent/talent-profile-store.service';

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
  availabilitySignal?: 'available' | 'open' | '';
  photoPreviewUrl?: string;
  photoFileName?: string;
  candidateVideoUrl?: string;
  candidateVideoFileName?: string;
  candidateVideoPosterUrl?: string;
  candidateVideoPosterFileName?: string;
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
  private readonly authFacade = inject(AuthFacade);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly localMediaStorage = inject(LocalMediaStorageService);
  private readonly talentProfileStore = inject(TalentProfileStoreService);
  private readonly photoUpdatedListener = (event: Event) => {
    const customEvent = event as CustomEvent<{ photoPreviewUrl?: string; photoFileName?: string }>;
    this.photoPreviewUrl = customEvent.detail?.photoPreviewUrl ?? this.photoPreviewUrl;
    this.photoFileName = customEvent.detail?.photoFileName ?? this.photoFileName;
    this.photoError = '';
  };
  private readonly acceptedPhotoMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly maxPhotoSizeBytes = 5 * 1024 * 1024;

  readonly stateOptions = [
    { value: 'SP', label: 'São Paulo' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PR', label: 'Paraná' },
    { value: 'RS', label: 'Rio Grande do Sul' },
  ];
  readonly availabilityOptions = [
    { value: '', label: 'Não informar' },
    { value: 'available', label: 'Disponível agora' },
    { value: 'open', label: 'Aberto a conversas' },
  ] as const;

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
  availabilitySignal: 'available' | 'open' | '' = '';
  isPhotoDragging = false;
  photoPreviewUrl = '';
  photoFileName = '';
  photoError = '';
  candidateVideoUrl = '';
  candidateVideoFileName = '';
  candidateVideoPreviewUrl = '';
  candidateVideoError = '';
  candidateVideoPosterUrl = '';
  candidateVideoPosterFileName = '';
  candidateVideoPosterPreviewUrl = '';
  candidateVideoPosterError = '';
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

  get hasCandidateVideo(): boolean {
    return !!this.candidateVideoPreviewUrl.trim();
  }

  get hasPhotoPreview(): boolean {
    return !!this.photoPreviewUrl.trim();
  }

  get currentCandidateVideoPosterUrl(): string {
    return this.candidateVideoPosterPreviewUrl.trim() || this.photoPreviewUrl || 'assets/images/image-video.png';
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
    this.revokeCandidateVideoPreviewUrl();
    this.revokeCandidateVideoPosterPreviewUrl();
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

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.handlePhotoFile(input?.files?.[0] ?? null);

    if (input) {
      input.value = '';
    }
  }

  clearPhoto(): void {
    this.revokePhotoPreviewUrl();
    this.photoPreviewUrl = '';
    this.photoFileName = '';
    this.photoError = '';
    this.persistDraft();
    window.dispatchEvent(
      new CustomEvent(DadosCadastraisPage.photoUpdatedEventName, {
        detail: {
          photoPreviewUrl: '',
          photoFileName: '',
        },
      }),
    );
    this.cdr.markForCheck();
  }

  async onCandidateVideoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    await this.handleCandidateVideoFile(input?.files?.[0] ?? null);

    if (input) {
      input.value = '';
    }
  }

  onCandidateVideoUrlChange(value: string): void {
    this.candidateVideoUrl = value.trim();
    this.candidateVideoFileName = '';
    this.candidateVideoError = '';
    void this.refreshCandidateVideoPreview();
  }

  onCandidateVideoPosterUrlChange(value: string): void {
    this.candidateVideoPosterUrl = value.trim();
    this.candidateVideoPosterFileName = '';
    this.candidateVideoPosterError = '';
    void this.refreshCandidateVideoPosterPreview();
  }

  async onCandidateVideoPosterSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    await this.handleCandidateVideoPosterFile(input?.files?.[0] ?? null);

    if (input) {
      input.value = '';
    }
  }

  clearCandidateVideo(): void {
    this.revokeCandidateVideoPreviewUrl();
    this.candidateVideoUrl = '';
    this.candidateVideoFileName = '';
    this.candidateVideoError = '';
    this.persistDraft();
    this.cdr.markForCheck();
  }

  clearCandidateVideoPoster(): void {
    this.revokeCandidateVideoPosterPreviewUrl();
    this.candidateVideoPosterUrl = '';
    this.candidateVideoPosterFileName = '';
    this.candidateVideoPosterError = '';
    this.persistDraft();
    this.cdr.markForCheck();
  }

  scrollToMediaSection(): void {
    document.getElementById('candidate-profile-media')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      this.availabilitySignal = draft.availabilitySignal === 'available' || draft.availabilitySignal === 'open'
        ? draft.availabilitySignal
        : '';
      this.restoreLocationParts();
      this.photoPreviewUrl = draft.photoPreviewUrl ?? '';
      this.photoFileName = draft.photoFileName ?? '';
      this.candidateVideoUrl = draft.candidateVideoUrl?.trim() ?? '';
      this.candidateVideoFileName = draft.candidateVideoFileName ?? '';
      this.candidateVideoPosterUrl = draft.candidateVideoPosterUrl?.trim() ?? '';
      this.candidateVideoPosterFileName = draft.candidateVideoPosterFileName ?? '';
      void this.refreshCandidateVideoPreview();
      void this.refreshCandidateVideoPosterPreview();
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
        availabilitySignal: this.availabilitySignal,
        photoPreviewUrl: this.photoPreviewUrl,
        photoFileName: this.photoFileName,
        candidateVideoUrl: this.candidateVideoUrl,
        candidateVideoFileName: this.candidateVideoFileName,
        candidateVideoPosterUrl: this.candidateVideoPosterUrl,
        candidateVideoPosterFileName: this.candidateVideoPosterFileName,
      }),
    );
    void this.syncSeededTalentProfile();
  }

  private async syncSeededTalentProfile(): Promise<void> {
    const email = this.authFacade.getSession()?.email?.trim();
    if (!email) {
      return;
    }

    await this.talentProfileStore.syncCurrentWorkspace(email);
  }

  private revokePhotoPreviewUrl(): void {
    if (!this.photoPreviewUrl.startsWith('blob:')) {
      return;
    }

    URL.revokeObjectURL(this.photoPreviewUrl);
    this.photoPreviewUrl = '';
  }

  private handlePhotoFile(file: File | null): void {
    this.photoError = '';

    if (!file) {
      return;
    }

    if (!this.acceptedPhotoMimeTypes.includes(file.type)) {
      this.photoError = 'Use JPG, PNG, GIF ou WEBP.';
      this.cdr.markForCheck();
      return;
    }

    if (file.size > this.maxPhotoSizeBytes) {
      this.photoError = 'A foto deve ter no máximo 5MB.';
      this.cdr.markForCheck();
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      this.revokePhotoPreviewUrl();
      this.photoPreviewUrl = typeof reader.result === 'string' ? reader.result : '';
      this.photoFileName = file.name;
      this.photoError = '';
      this.persistDraft();
      window.dispatchEvent(
        new CustomEvent(DadosCadastraisPage.photoUpdatedEventName, {
          detail: {
            photoPreviewUrl: this.photoPreviewUrl,
            photoFileName: this.photoFileName,
          },
        }),
      );
      this.cdr.markForCheck();
    };

    reader.onerror = () => {
      this.photoError = 'Não foi possível carregar a foto selecionada.';
      this.cdr.markForCheck();
    };

    reader.readAsDataURL(file);
  }

  private revokeCandidateVideoPreviewUrl(): void {
    if (!this.candidateVideoPreviewUrl.startsWith('blob:')) {
      return;
    }

    URL.revokeObjectURL(this.candidateVideoPreviewUrl);
    this.candidateVideoPreviewUrl = '';
  }

  private revokeCandidateVideoPosterPreviewUrl(): void {
    if (!this.candidateVideoPosterPreviewUrl.startsWith('blob:')) {
      return;
    }

    URL.revokeObjectURL(this.candidateVideoPosterPreviewUrl);
    this.candidateVideoPosterPreviewUrl = '';
  }

  private async handleCandidateVideoFile(file: File | null): Promise<void> {
    this.candidateVideoError = '';

    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();
    const isAccepted = fileName.endsWith('.mp4')
      || fileName.endsWith('.webm')
      || fileName.endsWith('.ogv')
      || fileName.endsWith('.mov')
      || ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'].includes(file.type);

    if (!isAccepted) {
      this.candidateVideoError = 'Use MP4, WEBM, OGV ou MOV.';
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      this.candidateVideoError = 'O vídeo deve ter no máximo 200MB.';
      return;
    }

    try {
      this.candidateVideoUrl = await this.localMediaStorage.saveFile(file);
      this.candidateVideoFileName = file.name;
      await this.refreshCandidateVideoPreview();
      this.persistDraft();
      await this.syncSeededTalentProfile();
    } catch (error) {
      this.candidateVideoError = error instanceof Error ? error.message : 'Não foi possível salvar o vídeo localmente.';
      this.cdr.markForCheck();
    }
  }

  private async handleCandidateVideoPosterFile(file: File | null): Promise<void> {
    this.candidateVideoPosterError = '';

    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();
    const isAccepted = fileName.endsWith('.jpg')
      || fileName.endsWith('.jpeg')
      || fileName.endsWith('.png')
      || fileName.endsWith('.gif')
      || fileName.endsWith('.webp')
      || ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);

    if (!isAccepted) {
      this.candidateVideoPosterError = 'Use JPG, PNG, GIF ou WEBP.';
      this.cdr.markForCheck();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.candidateVideoPosterError = 'A imagem deve ter no máximo 5MB.';
      this.cdr.markForCheck();
      return;
    }

    try {
      this.candidateVideoPosterUrl = await this.localMediaStorage.saveFile(file);
      this.candidateVideoPosterFileName = file.name;
      await this.refreshCandidateVideoPosterPreview();
      this.persistDraft();
      await this.syncSeededTalentProfile();
    } catch (error) {
      this.candidateVideoPosterError = error instanceof Error ? error.message : 'Não foi possível salvar a thumb localmente.';
      this.cdr.markForCheck();
    }
  }

  private async refreshCandidateVideoPreview(): Promise<void> {
    const candidateVideoRef = this.candidateVideoUrl.trim();
    this.revokeCandidateVideoPreviewUrl();

    if (!candidateVideoRef) {
      this.candidateVideoPreviewUrl = '';
      this.cdr.markForCheck();
      return;
    }

    if (!this.localMediaStorage.isLocalMediaRef(candidateVideoRef)) {
      this.candidateVideoPreviewUrl = candidateVideoRef;
      this.cdr.markForCheck();
      return;
    }

    try {
      const blob = await this.localMediaStorage.readBlob(candidateVideoRef);
      this.candidateVideoPreviewUrl = blob ? URL.createObjectURL(blob) : '';
      if (!blob) {
        this.candidateVideoError = 'Não foi possível localizar o vídeo salvo localmente.';
      }
    } catch (error) {
      this.candidateVideoPreviewUrl = '';
      this.candidateVideoError = error instanceof Error ? error.message : 'Não foi possível abrir o vídeo salvo.';
    }

    this.cdr.markForCheck();
  }

  private async refreshCandidateVideoPosterPreview(): Promise<void> {
    const candidateVideoPosterRef = this.candidateVideoPosterUrl.trim();
    this.revokeCandidateVideoPosterPreviewUrl();

    if (!candidateVideoPosterRef) {
      this.candidateVideoPosterPreviewUrl = '';
      this.cdr.markForCheck();
      return;
    }

    if (!this.localMediaStorage.isLocalMediaRef(candidateVideoPosterRef)) {
      this.candidateVideoPosterPreviewUrl = candidateVideoPosterRef;
      this.cdr.markForCheck();
      return;
    }

    try {
      const blob = await this.localMediaStorage.readBlob(candidateVideoPosterRef);
      this.candidateVideoPosterPreviewUrl = blob ? URL.createObjectURL(blob) : '';
      if (!blob) {
        this.candidateVideoPosterError = 'Não foi possível localizar a thumb salva localmente.';
      }
    } catch (error) {
      this.candidateVideoPosterPreviewUrl = '';
      this.candidateVideoPosterError = error instanceof Error ? error.message : 'Não foi possível abrir a thumb salva.';
    }

    this.cdr.markForCheck();
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
