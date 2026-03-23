import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MobileChatComponent } from './mobile-chat';
import { ChatSessionService } from './chat-session.service';
import { CandidateProfileModalComponent } from './candidate-profile-modal.component';
import { ChatCandidate } from './tail-chat-panel.component';

@Component({
  standalone: true,
  selector: 'app-mobile-chat-page',
  imports: [CommonModule, MobileChatComponent, CandidateProfileModalComponent],
  templateUrl: './mobile-chat.page.html',
  styleUrl: './mobile-chat.page.scss',
})
export class MobileChatPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly session = inject(ChatSessionService);

  readonly job = this.session.getJob();
  readonly startIndex = this.resolveStartIndex();

  constructor() {
    if (!this.job) {
      void this.router.navigateByUrl('/home/ecossistema');
    }
  }

  goBack(): void {
    this.session.clear();
    void this.router.navigateByUrl('/home/ecossistema');
  }

  get selectedCandidate(): ChatCandidate | null {
    return this.job?.candidates?.[this.startIndex] ?? this.job?.candidates?.[0] ?? null;
  }

  closeCandidateModal(): void {
    this.session.closeModal();
  }

  private resolveStartIndex(): number {
    const raw = Number(this.route.snapshot.queryParamMap.get('candidate') ?? '0');
    return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  }
}
