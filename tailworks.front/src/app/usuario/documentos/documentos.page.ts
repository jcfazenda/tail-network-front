import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type CandidateDocumentItem = {
  id: string;
  label: string;
  description: string;
  requiredByDefault: boolean;
  isVisibleOnAcceptance: boolean;
  fileName: string;
  updatedAt: string;
};

@Component({
  standalone: true,
  selector: 'app-documentos-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './documentos.page.html',
  styleUrls: ['./documentos.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentosPage {
  private static readonly storageKey = 'tailworks:candidate-documents-draft:v2';

  readonly acceptedDocumentExtensions = '.pdf,.jpg,.jpeg,.png';
  readonly documents = this.restoreDocuments();

  isDocumentModalOpen = false;
  editingDocumentId: string | null = null;
  documentModalError = '';
  documentDraftLabel = '';
  documentDraftDescription = '';
  documentDraftFileName = '';
  documentDraftUpdatedAt = '';
  documentDraftVisibleOnAcceptance = false;
  documentDraftRequiredByDefault = false;

  get documentModalTitle(): string {
    return this.editingDocumentId ? 'Editar documento' : 'Novo documento';
  }

  get documentModalSubmitLabel(): string {
    return this.editingDocumentId ? 'Salvar documento' : 'Adicionar documento';
  }

  get canSaveDocument(): boolean {
    return this.documentDraftLabel.trim().length > 0;
  }

  openCreateDocumentModal(): void {
    this.editingDocumentId = null;
    this.documentModalError = '';
    this.documentDraftLabel = '';
    this.documentDraftDescription = '';
    this.documentDraftFileName = '';
    this.documentDraftUpdatedAt = '';
    this.documentDraftVisibleOnAcceptance = false;
    this.documentDraftRequiredByDefault = false;
    this.isDocumentModalOpen = true;
  }

  openEditDocumentModal(item: CandidateDocumentItem): void {
    this.editingDocumentId = item.id;
    this.documentModalError = '';
    this.documentDraftLabel = item.label;
    this.documentDraftDescription = item.description;
    this.documentDraftFileName = item.fileName;
    this.documentDraftUpdatedAt = item.updatedAt;
    this.documentDraftVisibleOnAcceptance = item.isVisibleOnAcceptance;
    this.documentDraftRequiredByDefault = item.requiredByDefault;
    this.isDocumentModalOpen = true;
  }

  closeDocumentModal(): void {
    this.isDocumentModalOpen = false;
    this.editingDocumentId = null;
    this.documentModalError = '';
  }

  openDraftFilePicker(input: HTMLInputElement): void {
    input.click();
  }

  onDraftFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    if (!file) {
      return;
    }

    this.documentDraftFileName = file.name;
    this.documentDraftUpdatedAt = new Date().toLocaleDateString('pt-BR');

    if (input) {
      input.value = '';
    }
  }

  saveDocument(): void {
    const trimmedLabel = this.documentDraftLabel.trim();
    const trimmedDescription = this.documentDraftDescription.trim();
    this.documentModalError = '';

    if (!trimmedLabel) {
      this.documentModalError = 'Informe o nome do documento.';
      return;
    }

    const duplicated = this.documents.some((item) => {
      if (this.editingDocumentId && item.id === this.editingDocumentId) {
        return false;
      }

      return item.label.toLocaleLowerCase('pt-BR') === trimmedLabel.toLocaleLowerCase('pt-BR');
    });

    if (duplicated) {
      this.documentModalError = 'Esse documento já existe na sua lista.';
      return;
    }

    const nextDocument: CandidateDocumentItem = {
      id: this.editingDocumentId ?? this.createDocumentId(trimmedLabel),
      label: trimmedLabel,
      description: trimmedDescription,
      requiredByDefault: this.documentDraftRequiredByDefault,
      isVisibleOnAcceptance: this.documentDraftVisibleOnAcceptance,
      fileName: this.documentDraftFileName.trim(),
      updatedAt: this.documentDraftUpdatedAt.trim(),
    };

    if (this.editingDocumentId) {
      const index = this.documents.findIndex((item) => item.id === this.editingDocumentId);
      if (index === -1) {
        return;
      }

      this.documents.splice(index, 1, nextDocument);
    } else {
      this.documents.push(nextDocument);
    }

    this.persistDocuments();
    this.closeDocumentModal();
  }

  removeDocument(item: CandidateDocumentItem): void {
    const confirmed = window.confirm(`Deseja excluir o documento "${item.label}"?`);
    if (!confirmed) {
      return;
    }

    const index = this.documents.findIndex((current) => current.id === item.id);
    if (index === -1) {
      return;
    }

    this.documents.splice(index, 1);
    this.persistDocuments();
  }

  trackDocument(_index: number, item: CandidateDocumentItem): string {
    return item.id;
  }

  private restoreDocuments(): CandidateDocumentItem[] {
    const rawDraft = localStorage.getItem(DocumentosPage.storageKey);
    const defaults = this.defaultDocuments();

    if (!rawDraft) {
      return defaults;
    }

    try {
      const parsed = JSON.parse(rawDraft) as CandidateDocumentItem[];
      if (!Array.isArray(parsed)) {
        return defaults;
      }

      const normalizedParsed = parsed
        .map((item) => this.normalizeDocument(item))
        .filter((item): item is CandidateDocumentItem => item !== null);

      const mergedDefaults = defaults.map((defaultItem) => {
        const savedItem = normalizedParsed.find((item) => item.id === defaultItem.id);
        return savedItem ? { ...defaultItem, ...savedItem } : defaultItem;
      });

      const extraDocuments = normalizedParsed.filter((item) => (
        !defaults.some((defaultItem) => defaultItem.id === item.id)
      ));

      return [...mergedDefaults, ...extraDocuments];
    } catch {
      localStorage.removeItem(DocumentosPage.storageKey);
      return defaults;
    }
  }

  private normalizeDocument(item: Partial<CandidateDocumentItem> & { id?: string; label?: string }): CandidateDocumentItem | null {
    const label = item.label?.trim();
    if (!label) {
      return null;
    }

    return {
      id: item.id?.trim() || this.createDocumentId(label),
      label,
      description: item.description?.trim() || '',
      requiredByDefault: item.requiredByDefault === true,
      isVisibleOnAcceptance: item.isVisibleOnAcceptance === true || item.requiredByDefault === true,
      fileName: item.fileName?.trim() || '',
      updatedAt: item.updatedAt?.trim() || '',
    };
  }

  private persistDocuments(): void {
    localStorage.setItem(DocumentosPage.storageKey, JSON.stringify(this.documents));
  }

  private createDocumentId(label: string): string {
    return label
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .concat('-', Math.random().toString(36).slice(2, 6));
  }

  private defaultDocuments(): CandidateDocumentItem[] {
    return [
      {
        id: 'rg',
        label: 'RG ou CNH',
        description: 'Documento principal de identificação para etapas finais do processo.',
        requiredByDefault: true,
        isVisibleOnAcceptance: true,
        fileName: '',
        updatedAt: '',
      },
      {
        id: 'cpf',
        label: 'CPF',
        description: 'Pode ser o cartão ou o comprovante oficial com número válido.',
        requiredByDefault: true,
        isVisibleOnAcceptance: true,
        fileName: '',
        updatedAt: '',
      },
      {
        id: 'address',
        label: 'Comprovante de residência',
        description: 'Ajuda quando a contratação exige validação cadastral e regional.',
        requiredByDefault: false,
        isVisibleOnAcceptance: false,
        fileName: '',
        updatedAt: '',
      },
      {
        id: 'graduation',
        label: 'Diploma ou declaração',
        description: 'Material acadêmico que o recruiter pode solicitar dependendo da vaga.',
        requiredByDefault: false,
        isVisibleOnAcceptance: false,
        fileName: '',
        updatedAt: '',
      },
    ];
  }
}
