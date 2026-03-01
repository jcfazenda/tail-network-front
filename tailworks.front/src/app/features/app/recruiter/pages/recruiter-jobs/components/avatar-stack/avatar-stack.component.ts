import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type AvatarItem = {
  name: string;
  avatarUrl?: string;
  initials?: string;
};

@Component({
  selector: 'recruiter-avatar-stack',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar-stack.component.html',
  styleUrls: ['./avatar-stack.component.scss'],
})
export class AvatarStackComponent {
  @Input() items: AvatarItem[] = [];
  @Input() extraCount = 0;

  @Input() size = 50;          // exemplo
@Input() overlap = 0.30;     // 32% do tamanho (bom padrão)

get overlapPx(): number {
  return Math.round(this.size * this.overlap);
}

  onAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (!target) return;
    target.style.display = 'none';
  }
}
