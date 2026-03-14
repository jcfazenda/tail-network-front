import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EcosystemPanelService {
  private readonly openRequestsSubject = new Subject<void>();

  get openRequests$(): Observable<void> {
    return this.openRequestsSubject.asObservable();
  }

  requestOpen(): void {
    this.openRequestsSubject.next();
  }
}
