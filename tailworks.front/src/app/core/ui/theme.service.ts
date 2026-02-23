import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'tw-theme';

  private readonly _mode$ = new BehaviorSubject<ThemeMode>('dark');
  readonly mode$ = this._mode$.asObservable();

  get mode(): ThemeMode {
    return this._mode$.value;
  }

  get isDark(): boolean {
    return this.mode === 'dark';
  }

  /** Chame 1x na inicialização do layout/app */
  init(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY) as ThemeMode | null;

    if (saved === 'dark' || saved === 'light') {
      this.set(saved, false);
      return;
    }

    // primeira visita: respeita o tema do sistema
    const prefersDark =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;

    this.set(prefersDark ? 'dark' : 'light', false);
  }

  toggle(): void {
    this.set(this.isDark ? 'light' : 'dark');
  }

  set(mode: ThemeMode, persist = true): void {
    this._mode$.next(mode);

    // aplica no DOM
    document.body.classList.toggle('theme-dark', mode === 'dark');

    // persistência
    if (persist) localStorage.setItem(this.STORAGE_KEY, mode);
  }
}