import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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
};

type CandidateBasicProfile = {
  name: string;
  formation: string;
};

type CandidateBasicDraft = {
  profile?: Partial<CandidateBasicProfile>;
  photoPreviewUrl?: string;
};

@Component({
  standalone: true,
  selector: 'app-stacks-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './stacks.page.html',
  styleUrls: ['./stacks.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StacksPage implements OnInit {
  private static readonly storageKey = 'tailworks:candidate-stacks-draft:v2';
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';

  private readonly router = inject(Router);

  readonly steps: RegistrationStep[] = [
    { index: 1, label: 'Dados Básicos', route: '/usuario/dados-cadastrais' },
    { index: 2, label: 'Suas Stacks', route: '/usuario/dados-cadastrais/stacks', active: true },
    { index: 3, label: 'Experiência', route: '/usuario/dados-cadastrais/experiencia' },
    { index: 4, label: 'Formação' },
    { index: 5, label: 'Geral' },
  ];

  readonly maxStacks = 10;

  stackError = '';
  stacks: StackChip[] = [];
  isStackModalOpen = false;
  editingStackIndex: number | null = null;
  stackDraftName = '';
  stackDraftKnowledge: number | null = null;
  stackModalError = '';
  profile: CandidateBasicProfile = {
    name: '',
    formation: '',
  };
  photoPreviewUrl = '';

  get displayName(): string {
    return this.profile.name.trim() || 'Seu nome';
  }

  get displayFormation(): string {
    return this.profile.formation.trim() || 'Sua formação';
  }

  get stackModalTitle(): string {
    return this.editingStackIndex === null ? 'Adicionar Stack' : 'Editar Stack';
  }

  get stackModalSubmitLabel(): string {
    return this.editingStackIndex === null ? 'Adicionar' : 'Salvar';
  }

  get canSaveStack(): boolean {
    return this.stackDraftName.trim().length > 0
      && this.stackDraftKnowledge !== null
      && this.stackDraftKnowledge >= 0
      && this.stackDraftKnowledge <= 100;
  }

  ngOnInit(): void {
    this.restoreBasicDraft();

    const stored = localStorage.getItem(StacksPage.storageKey);

    if (stored) {
      try {
        const parsedStacks = JSON.parse(stored) as Array<Partial<StackChip> & { name: string }>;
        this.stacks = parsedStacks.map((item) => this.createStackChip(item.name, item.knowledge));
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
    this.stackDraftKnowledge = 70;
    this.stackModalError = '';
    this.isStackModalOpen = true;
  }

  editStack(index: number): void {
    const stack = this.stacks[index];

    if (!stack) {
      return;
    }

    this.stackError = '';
    this.editingStackIndex = index;
    this.stackDraftName = stack.name;
    this.stackDraftKnowledge = stack.knowledge;
    this.stackModalError = '';
    this.isStackModalOpen = true;
  }

  closeStackModal(): void {
    this.isStackModalOpen = false;
    this.editingStackIndex = null;
    this.stackDraftName = '';
    this.stackDraftKnowledge = null;
    this.stackModalError = '';
  }

  saveStack(): void {
    const trimmed = this.stackDraftName.trim();
    const knowledge = Number(this.stackDraftKnowledge);
    this.stackModalError = '';

    if (!trimmed) {
      this.stackModalError = 'Digite uma stack para adicionar.';
      return;
    }

    if (Number.isNaN(knowledge) || knowledge < 0 || knowledge > 100) {
      this.stackModalError = 'Informe um percentual entre 0 e 100.';
      return;
    }

    const duplicatedIndex = this.stacks.findIndex(
      (item, index) => item.name.toLowerCase() === trimmed.toLowerCase() && index !== this.editingStackIndex,
    );

    if (duplicatedIndex !== -1) {
      this.stackModalError = 'Essa stack já foi adicionada.';
      return;
    }

    const nextItem = this.createStackChip(trimmed, knowledge);

    if (this.editingStackIndex === null) {
      if (this.stacks.length >= this.maxStacks) {
        this.stackModalError = 'Você pode adicionar até 10 stacks.';
        return;
      }

      this.stacks = [...this.stacks, nextItem];
    } else {
      this.stacks = this.stacks.map((item, index) => index === this.editingStackIndex ? nextItem : item);
    }

    this.persistStacks();
    this.closeStackModal();
  }

  deleteStack(): void {
    if (this.editingStackIndex === null) {
      return;
    }

    this.stacks = this.stacks.filter((_, index) => index !== this.editingStackIndex);
    this.persistStacks();
    this.closeStackModal();
  }

  continueToExperience(): void {
    this.stackError = '';

    if (this.stacks.length < 3) {
      this.stackError = 'Adicione pelo menos 3 stacks para continuar.';
      return;
    }

    this.persistStacks();
    void this.router.navigate(['/usuario/dados-cadastrais/experiencia']);
  }

  private persistStacks(): void {
    localStorage.setItem(StacksPage.storageKey, JSON.stringify(this.stacks));
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

  private createStackChip(name: string, knowledge?: number): StackChip {
    const normalized = name.trim();
    const lower = normalized.toLowerCase();
    const resolvedKnowledge = knowledge ?? this.getDefaultKnowledge(lower);

    if (lower === '.net / c#' || lower === '.net' || lower === 'c#') {
      return { name: '.NET / C#', short: '.N', tone: 'gold', knowledge: resolvedKnowledge };
    }

    if (lower === 'entity framework') {
      return { name: 'Entity Framework', short: 'EF', tone: 'slate', knowledge: resolvedKnowledge };
    }

    if (lower === 'rest api') {
      return { name: 'REST API', short: 'API', tone: 'azure', knowledge: resolvedKnowledge };
    }

    if (lower === 'sql server') {
      return { name: 'SQL Server', short: 'SQL', tone: 'orange', knowledge: resolvedKnowledge };
    }

    if (lower === 'azure') {
      return { name: 'Azure', short: 'Az', tone: 'azure', knowledge: resolvedKnowledge };
    }

    return {
      name: normalized,
      short: this.getShortLabel(normalized),
      tone: 'neutral',
      knowledge: resolvedKnowledge,
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
}
