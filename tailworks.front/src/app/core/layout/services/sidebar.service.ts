import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private readonly state$ = new BehaviorSubject<boolean>(true);
  private readonly lockedHidden = new BehaviorSubject<boolean>(false);

  readonly visible$ = combineLatest([this.state$, this.lockedHidden]).pipe(
    map(([state, locked]) => state && !locked),
  );

  get isVisible(): boolean {
    return this.state$.value && !this.lockedHidden.value;
  }

  show(): void {
    if (!this.lockedHidden.value) {
      this.state$.next(true);
    }
  }

  hide(): void {
    this.state$.next(false);
  }

  toggle(): void {
    if (this.lockedHidden.value) return;
    this.state$.next(!this.state$.value);
  }

  /** força ocultar (ex.: home/login) */
  forceHide(): void {
    this.lockedHidden.next(true);
    this.state$.next(false);
  }

  /** libera o bloqueio para voltar a exibir */
  releaseHide(): void {
    this.lockedHidden.next(false);
  }
}
