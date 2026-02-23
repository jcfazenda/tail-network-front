import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StartModalService {
  private _open = new BehaviorSubject<boolean>(false);
  open$ = this._open.asObservable();

  open() {
    this._open.next(true);
    document.body.style.overflow = 'hidden';
  }

  close() {
    this._open.next(false);
    document.body.style.overflow = '';
  }

  toggle() {
    const v = this._open.value;
    v ? this.close() : this.open();
  }
}