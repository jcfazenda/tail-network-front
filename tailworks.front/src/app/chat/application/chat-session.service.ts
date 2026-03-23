import { Injectable, signal } from '@angular/core';
import { ChatJob } from '../domain/chat.models';

export type ChatSessionModalTab = 'journey' | 'curriculum';

@Injectable({ providedIn: 'root' })
export class ChatSessionService {
  readonly currentJob = signal<ChatJob | null>(null);
  readonly currentIndex = signal(0);
  readonly activeModalTab = signal<ChatSessionModalTab | null>(null);

  set(job: ChatJob, startIndex: number): void {
    this.currentJob.set(job);
    this.currentIndex.set(startIndex);
    this.activeModalTab.set(null);
  }

  getJob(): ChatJob | null {
    return this.currentJob();
  }

  getStartIndex(): number {
    return this.currentIndex();
  }

  openModal(tab: ChatSessionModalTab): void {
    this.activeModalTab.set(tab);
  }

  closeModal(): void {
    this.activeModalTab.set(null);
  }

  clear(): void {
    this.currentJob.set(null);
    this.currentIndex.set(0);
    this.activeModalTab.set(null);
  }
}
