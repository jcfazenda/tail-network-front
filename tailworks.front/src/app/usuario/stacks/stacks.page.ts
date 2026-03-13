import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AlcanceRadarComponent, RadarLegendItem } from '../../vagas/cadastro/alcance-radar/alcance-radar.component';

type RegistrationStep = {
  label: string;
  index: number | string;
  route?: string;
  active?: boolean;
};

type StackChip = {
  name: string;
  short: string;
  tone: 'gold' | 'slate' | 'azure' | 'orange' | 'neutral';
  knowledge: number;
  description: string;
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
};

@Component({
  standalone: true,
  selector: 'app-stacks-page',
  imports: [CommonModule, FormsModule, RouterLink, AlcanceRadarComponent],
  templateUrl: './stacks.page.html',
  styleUrls: ['./stacks.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StacksPage implements OnInit {
  private static readonly storageKey = 'tailworks:candidate-stacks-draft:v2';
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';
  private static readonly stackDescriptionMaxLength = 920;

  private readonly router = inject(Router);

  readonly steps: RegistrationStep[] = [
    { index: 1, label: 'Dados Básicos', route: '/usuario/dados-cadastrais' },
    { index: 2, label: 'Suas Stacks', route: '/usuario/dados-cadastrais/stacks', active: true },
    { index: 3, label: 'Experiência', route: '/usuario/dados-cadastrais/experiencia' },
    { index: 4, label: 'Formação', route: '/usuario/dados-cadastrais/formacao' },
  ];

  readonly maxStacks = 10;
  readonly radarPreviewScore = 89;
  readonly radarPreviewItems: RadarLegendItem[] = [
    { label: 'Alta compatibilidade', tone: 'high', percent: 76 },
    { label: 'Media de Compatibilidade', tone: 'medium', detail: '(60-85%)' },
    { label: 'Potenciais', tone: 'potential', count: 97 },
  ];

  stackError = '';
  stacks: StackChip[] = [];
  isStackModalOpen = false;
  editingStackIndex: number | null = null;
  stackDraftName = '';
  stackDraftDescription = '';
  stackModalError = '';
  expandedDescriptionIndex: number | null = null;
  @ViewChild('stackDescriptionEditor') private stackDescriptionEditor?: ElementRef<HTMLDivElement>;
  profile: CandidateBasicProfile = {
    name: '',
    formation: '',
  };
  photoPreviewUrl = '';
  formationCopy: FormationCopyDraft = {
    graduation: 'Bacharelado em Sistemas de Informação',
    specialization: 'Especialização em Arquitetura de Software',
  };

  readonly trackByStackName = (_index: number, stack: StackChip): string => stack.name;

  get displayName(): string {
    return this.profile.name.trim() || 'Julio Fazenda';
  }

  get displayGraduation(): string {
    return this.formationCopy.graduation;
  }

  get displaySpecialization(): string {
    return this.formationCopy.specialization;
  }

  get stackModalTitle(): string {
    return this.editingStackIndex === null ? 'Adicionar Stack' : 'Editar Descrição';
  }

  get stackModalSubmitLabel(): string {
    return this.editingStackIndex === null ? 'Adicionar' : 'Salvar';
  }

  get stackDescriptionCharacters(): number {
    return this.getDescriptionPlainText(this.stackDraftDescription).length;
  }

  get stackDescriptionMaxLength(): number {
    return StacksPage.stackDescriptionMaxLength;
  }

  get isStackDescriptionOverLimit(): boolean {
    return this.stackDescriptionCharacters > this.stackDescriptionMaxLength;
  }

  get canSaveStack(): boolean {
    if (this.isStackDescriptionOverLimit) {
      return false;
    }

    return this.editingStackIndex !== null || this.stackDraftName.trim().length > 0;
  }

  ngOnInit(): void {
    this.restoreBasicDraft();
    this.restoreFormationCopy();

    const stored = localStorage.getItem(StacksPage.storageKey);

    if (stored) {
      try {
        const parsedStacks = JSON.parse(stored) as Array<Partial<StackChip> & { name: string }>;
        this.stacks = parsedStacks.map((item) => this.createStackChip(item.name, item.knowledge, item.description));
        return;
      } catch {
        localStorage.removeItem(StacksPage.storageKey);
      }
    }

    this.stacks = [
      this.createStackChip('.NET / C#'),
      this.createStackChip('Entity Framework'),
      this.createStackChip('REST API'),
      this.createStackChip('SQL Server'),
      this.createStackChip('Azure'),
    ];
    this.persistStacks();
  }

  openCreateStackModal(): void {
    this.stackError = '';

    if (this.stacks.length >= this.maxStacks) {
      this.stackError = 'Você pode adicionar até 10 stacks.';
      return;
    }

    this.editingStackIndex = null;
    this.stackDraftName = '';
    this.stackDraftDescription = '';
    this.stackModalError = '';
    this.isStackModalOpen = true;
    this.scheduleEditorSync();
  }

  openEditStackModal(index: number): void {
    const current = this.stacks[index];

    if (!current) {
      return;
    }

    this.editingStackIndex = index;
    this.stackDraftName = current.name;
    this.stackDraftDescription = current.description;
    this.stackModalError = '';
    this.isStackModalOpen = true;
    this.scheduleEditorSync();
  }

  closeStackModal(): void {
    this.isStackModalOpen = false;
    this.editingStackIndex = null;
    this.stackDraftName = '';
    this.stackDraftDescription = '';
    this.stackModalError = '';
  }

  onStackDescriptionInput(event: Event): void {
    this.stackDraftDescription = (event.target as HTMLDivElement).innerHTML;

    if (!this.isStackDescriptionOverLimit && this.stackModalError === 'A descrição excedeu o limite de caracteres.') {
      this.stackModalError = '';
    }
  }

  applyDescriptionFormat(command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList'): void {
    const editor = this.stackDescriptionEditor?.nativeElement;

    if (!editor) {
      return;
    }

    editor.focus();
    document.execCommand(command, false);
    this.stackDraftDescription = editor.innerHTML;
  }

  clearDescriptionFormat(): void {
    const editor = this.stackDescriptionEditor?.nativeElement;

    if (!editor) {
      return;
    }

    editor.focus();
    document.execCommand('removeFormat', false);
    document.execCommand('unlink', false);
    this.stackDraftDescription = editor.innerHTML;
  }

  saveStack(): void {
    const trimmed = this.stackDraftName.trim();
    const description = this.stackDraftDescription.trim();
    this.stackModalError = '';

    if (this.isStackDescriptionOverLimit) {
      this.stackModalError = 'A descrição excedeu o limite de caracteres.';
      return;
    }

    if (this.editingStackIndex !== null) {
      const current = this.stacks[this.editingStackIndex];

      if (!current) {
        return;
      }

      current.description = description;
      this.persistStacks();
      this.closeStackModal();
      return;
    }

    if (!trimmed) {
      this.stackModalError = 'Digite uma stack para adicionar.';
      return;
    }

    const duplicated = this.stacks.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());

    if (duplicated) {
      this.stackModalError = 'Essa stack já foi adicionada.';
      return;
    }

    const nextItem = this.createStackChip(trimmed, undefined, description);

    if (this.stacks.length >= this.maxStacks) {
      this.stackModalError = 'Você pode adicionar até 10 stacks.';
      return;
    }

    this.stacks = [...this.stacks, nextItem];
    this.persistStacks();
    this.closeStackModal();
  }

  removeStack(index: number): void {
    if (!this.stacks[index]) {
      return;
    }

    this.stacks = this.stacks.filter((_, itemIndex) => itemIndex !== index);

    if (this.expandedDescriptionIndex === index) {
      this.expandedDescriptionIndex = null;
    } else if (this.expandedDescriptionIndex !== null && this.expandedDescriptionIndex > index) {
      this.expandedDescriptionIndex -= 1;
    }

    this.persistStacks();
  }

  toggleStackDescription(index: number): void {
    const current = this.stacks[index];

    if (!current?.description.trim()) {
      return;
    }

    this.expandedDescriptionIndex = this.expandedDescriptionIndex === index ? null : index;
  }

  updateStackKnowledge(index: number, nextValue: number | string): void {
    const current = this.stacks[index];

    if (!current) {
      return;
    }

    const parsedValue = Number(nextValue);

    if (Number.isNaN(parsedValue)) {
      return;
    }

    const knowledge = Math.max(0, Math.min(100, Math.round(parsedValue)));
    current.knowledge = knowledge;
    this.persistStacks();
  }

  continueToExperience(): void {
    this.stackError = '';

    if (this.stacks.length < 3) {
      this.stackError = 'Adicione pelo menos 3 stacks para continuar.';
      return;
    }

    this.persistStacks();
    this.scrollToSection('usuario-experiencia', '/usuario/dados-cadastrais/experiencia');
  }

  private persistStacks(): void {
    localStorage.setItem(StacksPage.storageKey, JSON.stringify(this.stacks));
  }

  private scrollToSection(sectionId: string, fallbackRoute: string): void {
    const target = document.getElementById(sectionId);

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    void this.router.navigate([fallbackRoute]);
  }

  private scheduleEditorSync(): void {
    setTimeout(() => {
      const editor = this.stackDescriptionEditor?.nativeElement;

      if (!editor) {
        return;
      }

      editor.innerHTML = this.stackDraftDescription || '';
    });
  }

  private restoreBasicDraft(): void {
    const rawDraft = localStorage.getItem(StacksPage.basicDraftStorageKey);

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
      localStorage.removeItem(StacksPage.basicDraftStorageKey);
    }
  }

  private restoreFormationCopy(): void {
    const rawDraft = localStorage.getItem(StacksPage.formationCopyStorageKey);

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
      localStorage.removeItem(StacksPage.formationCopyStorageKey);
    }
  }

  private createStackChip(name: string, knowledge?: number, description = ''): StackChip {
    const normalized = name.trim();
    const lower = normalized.toLowerCase();
    const resolvedKnowledge = knowledge ?? this.getDefaultKnowledge(lower);
    const resolvedDescription = description.trim();

    if (lower === '.net / c#' || lower === '.net' || lower === 'c#') {
      return { name: '.NET / C#', short: '.N', tone: 'gold', knowledge: resolvedKnowledge, description: resolvedDescription };
    }

    if (lower === 'entity framework') {
      return { name: 'Entity Framework', short: 'EF', tone: 'slate', knowledge: resolvedKnowledge, description: resolvedDescription };
    }

    if (lower === 'rest api') {
      return { name: 'REST API', short: 'API', tone: 'azure', knowledge: resolvedKnowledge, description: resolvedDescription };
    }

    if (lower === 'sql server') {
      return { name: 'SQL Server', short: 'SQL', tone: 'orange', knowledge: resolvedKnowledge, description: resolvedDescription };
    }

    if (lower === 'azure') {
      return { name: 'Azure', short: 'Az', tone: 'azure', knowledge: resolvedKnowledge, description: resolvedDescription };
    }

    return {
      name: normalized,
      short: this.getShortLabel(normalized),
      tone: 'neutral',
      knowledge: resolvedKnowledge,
      description: resolvedDescription,
    };
  }

  private getDefaultKnowledge(value: string): number {
    switch (value) {
      case '.net / c#':
      case '.net':
      case 'c#':
        return 80;
      case 'entity framework':
        return 65;
      case 'rest api':
        return 75;
      case 'sql server':
        return 70;
      case 'azure':
        return 40;
      default:
        return 65;
    }
  }

  private getShortLabel(value: string): string {
    const parts = value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (parts.length === 0) {
      return '+';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2);
    }

    return `${parts[0][0]}${parts[1][0]}`;
  }

  private getDescriptionPlainText(value: string): string {
    if (!value.trim()) {
      return '';
    }

    return value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|ul|ol|h1|h2|h3|h4|h5|h6)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\u00a0/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
