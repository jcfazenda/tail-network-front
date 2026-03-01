import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type TrendCard = {
  title: string;
  subtitle: string;
  percent: number;
  caption: string;
  deltaLeft: { value: string; tone: 'up' | 'down' | 'neutral' };
  deltaRight: { value: string; tone: 'up' | 'down' | 'neutral' };
  icon: 'cap' | 'flame' | 'chat';
  tone: 'green' | 'orange' | 'blue';
  series: number[];
};

@Component({
  selector: 'tw-talent-radar-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './talent-radar-cards.component.html',
  styleUrls: ['./talent-radar-cards.component.scss'],
})
export class TalentRadarCardsComponent {
  @Input() cards: TrendCard[] = [];

  subtitleCount(text: string): string {
    if (!text) return '';
    const parts = text.trim().split(' ');
    return parts[0] ?? '';
  }

  subtitleRest(text: string): string {
    if (!text) return '';
    const idx = text.trim().indexOf(' ');
    if (idx === -1) return '';
    return text.trim().substring(idx);
  }

  sparkPath(values: number[], w = 220, h = 64, pad = 6): string {
    if (!values?.length) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;

    return values
      .map((v, i) => {
        const x = pad + (i * innerW) / Math.max(1, values.length - 1);
        const y = pad + (1 - (v - min) / span) * innerH;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }

  areaPath(values: number[], w = 220, h = 64, pad = 6): string {
    const line = this.sparkPath(values, w, h, pad);
    if (!line) return '';
    const floorY = (h - pad).toFixed(2);
    const firstX = pad.toFixed(2);
    const lastX = (w - pad).toFixed(2);
    return `${line} L ${lastX} ${floorY} L ${firstX} ${floorY} Z`;
  }

  toneClass(tone: TrendCard['tone']): string {
    return `tone-${tone}`;
  }

  deltaClass(t: 'up' | 'down' | 'neutral'): string {
    return `delta-${t}`;
  }
}
