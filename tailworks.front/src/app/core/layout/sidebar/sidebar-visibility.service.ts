import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarVisibilityService {
  private readonly openState = signal(true);

  readonly isOpen = this.openState.asReadonly();

  toggle(): void {
    this.openState.update((value) => !value);
  }

  show(): void {
    this.openState.set(true);
  }
}
