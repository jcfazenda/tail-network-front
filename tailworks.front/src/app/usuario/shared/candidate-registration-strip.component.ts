import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';

type CandidateBasicDraft = {
  profile?: {
    name?: string;
  };
  photoPreviewUrl?: string;
  photoFileName?: string;
};

@Component({
  standalone: true,
  selector: 'app-candidate-registration-strip',
  imports: [CommonModule],
  templateUrl: './candidate-registration-strip.component.html',
  styleUrls: ['./candidate-registration-strip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateRegistrationStripComponent implements OnInit {
  private static readonly ecosystemVisibilityStorageKey = 'tailworks:candidate-experience-ecosystem-visibility:v1';
  private static readonly candidacyAvailabilityStorageKey = 'tailworks:candidate-experience-candidacy-availability:v1';
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly photoUpdatedEventName = 'tailworks:candidate-photo-updated';

  @Input() name = '';
  @Input() graduation = '';
  @Input() specialization = '';
  @Input() photoPreviewUrl = '';

  readonly acceptedPhotoMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
  readonly maxPhotoSizeBytes = 5 * 1024 * 1024;

  isVisibleInEcosystem = true;
  isAvailableForApplications = true;
  localPhotoPreviewUrl = '';
  photoError = '';

  get displayPhotoPreviewUrl(): string {
    return this.localPhotoPreviewUrl || this.photoPreviewUrl;
  }

  get displayName(): string {
    return this.name.trim() || 'Julio Fazenda';
  }

  get displayGraduation(): string {
    return this.graduation.trim() || 'Bacharelado em Sistemas de Informação';
  }

  get displaySpecialization(): string {
    return this.specialization.trim() || 'Especialização em Arquitetura de Software';
  }

  ngOnInit(): void {
    this.restoreControls();
  }

  updateVisibleInEcosystem(nextValue: boolean): void {
    this.isVisibleInEcosystem = nextValue;
    this.persistControls();
  }

  updateAvailableForApplications(nextValue: boolean): void {
    this.isAvailableForApplications = nextValue;
    this.persistControls();
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

  onPhotoKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openPhotoPicker(input);
  }

  private restoreControls(): void {
    const ecosystemVisibility = localStorage.getItem(CandidateRegistrationStripComponent.ecosystemVisibilityStorageKey);
    const candidacyAvailability = localStorage.getItem(CandidateRegistrationStripComponent.candidacyAvailabilityStorageKey);

    if (ecosystemVisibility !== null) {
      this.isVisibleInEcosystem = ecosystemVisibility === 'true';
    }

    if (candidacyAvailability !== null) {
      this.isAvailableForApplications = candidacyAvailability === 'true';
    }
  }

  private persistControls(): void {
    localStorage.setItem(
      CandidateRegistrationStripComponent.ecosystemVisibilityStorageKey,
      String(this.isVisibleInEcosystem),
    );
    localStorage.setItem(
      CandidateRegistrationStripComponent.candidacyAvailabilityStorageKey,
      String(this.isAvailableForApplications),
    );
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

    const reader = new FileReader();

    reader.onload = () => {
      this.localPhotoPreviewUrl = typeof reader.result === 'string' ? reader.result : '';
      this.persistPhotoDraft(file.name);
      window.dispatchEvent(
        new CustomEvent(CandidateRegistrationStripComponent.photoUpdatedEventName, {
          detail: {
            photoPreviewUrl: this.localPhotoPreviewUrl,
            photoFileName: file.name,
          },
        }),
      );
    };

    reader.readAsDataURL(file);
  }

  private persistPhotoDraft(fileName: string): void {
    const rawDraft = localStorage.getItem(CandidateRegistrationStripComponent.basicDraftStorageKey);
    let draft: CandidateBasicDraft = {};

    if (rawDraft) {
      try {
        draft = JSON.parse(rawDraft) as CandidateBasicDraft;
      } catch {
        draft = {};
      }
    }

    draft.photoPreviewUrl = this.localPhotoPreviewUrl;
    draft.photoFileName = fileName;

    localStorage.setItem(CandidateRegistrationStripComponent.basicDraftStorageKey, JSON.stringify(draft));
  }
}
