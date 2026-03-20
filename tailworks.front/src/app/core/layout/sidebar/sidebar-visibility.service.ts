import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BrowserStorageService } from '../../storage/browser-storage.service';

@Injectable({ providedIn: 'root' })
export class SidebarVisibilityService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browserStorage = inject(BrowserStorageService);
  private readonly storageKey = 'tailworks.sidebar.open';
  private readonly compactViewportQuery = '(max-width: 1280px)';
  private readonly desktopOpenState = signal(this.readStoredState());
  private readonly compactViewportState = signal(this.readCompactViewportState());
  private readonly compactOverlayOpenState = signal(false);

  readonly isCompactViewport = this.compactViewportState.asReadonly();
  readonly isOpen = computed(() =>
    this.compactViewportState() ? this.compactOverlayOpenState() : this.desktopOpenState(),
  );
  readonly shouldReserveLayoutSpace = computed(() => this.desktopOpenState() && !this.compactViewportState());

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const mediaQuery = window.matchMedia(this.compactViewportQuery);
    const syncCompactViewport = (matches: boolean) => {
      this.compactViewportState.set(matches);

      // On compact screens the sidebar starts hidden and reopens as overlay only by explicit user action.
      if (matches) {
        this.compactOverlayOpenState.set(false);
        return;
      }

      this.compactOverlayOpenState.set(false);
    };

    syncCompactViewport(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => syncCompactViewport(event.matches);

    if ('addEventListener' in mediaQuery) {
      mediaQuery.addEventListener('change', handleChange);
      this.destroyRef.onDestroy(() => mediaQuery.removeEventListener('change', handleChange));
      return;
    }

    const legacyMediaQuery = mediaQuery as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };

    legacyMediaQuery.addListener?.(handleChange);
    this.destroyRef.onDestroy(() => legacyMediaQuery.removeListener?.(handleChange));
  }

  toggle(): void {
    if (this.compactViewportState()) {
      this.compactOverlayOpenState.update((value) => !value);
      return;
    }

    this.setDesktopOpen(!this.desktopOpenState());
  }

  show(): void {
    if (this.compactViewportState()) {
      this.compactOverlayOpenState.set(true);
      return;
    }

    this.setDesktopOpen(true);
  }

  hide(): void {
    if (this.compactViewportState()) {
      this.compactOverlayOpenState.set(false);
      return;
    }

    this.setDesktopOpen(false);
  }

  private setDesktopOpen(value: boolean): void {
    this.desktopOpenState.set(value);
    this.persistState(value);
  }

  private readStoredState(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }

    const storedValue = this.browserStorage.getItem(this.storageKey);
    if (storedValue === null) {
      return true;
    }

    return storedValue === 'true';
  }

  private readCompactViewportState(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    return window.matchMedia(this.compactViewportQuery).matches;
  }

  private persistState(value: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.browserStorage.setItem(this.storageKey, String(value));
  }
}
