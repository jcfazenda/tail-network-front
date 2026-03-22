import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EcosystemViewFilterService {
  readonly selected = signal<string>('radar');

  setSelected(value: string): void {
    this.selected.set(value || 'radar');
  }
}
