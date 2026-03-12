import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class SidebarVisibilityService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'tailworks.sidebar.open';
  private readonly openState = signal(this.readStoredState());

  readonly isOpen = this.openState.asReadonly();

  toggle(): void {
    this.setOpen(!this.openState());
  }

  show(): void {
    this.setOpen(true);
  }

  hide(): void {
    this.setOpen(false);
  }

  private setOpen(value: boolean): void {
    this.openState.set(value);
    this.persistState(value);
  }

  private readStoredState(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }

    const storedValue = window.localStorage.getItem(this.storageKey);
    if (storedValue === null) {
      return true;
    }

    return storedValue === 'true';
  }

  private persistState(value: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    window.localStorage.setItem(this.storageKey, String(value));
  }
}
