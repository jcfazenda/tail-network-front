import { Injectable } from '@angular/core';
import { MockJobRecord } from './vagas.models';

@Injectable({ providedIn: 'root' })
export class JobsSyncApiService {
  private readonly endpoint = '/api/mock-jobs';

  async readAll(): Promise<MockJobRecord[] | null> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json();
      return Array.isArray(payload) ? (payload as MockJobRecord[]) : [];
    } catch {
      return null;
    }
  }

  async writeAll(jobs: MockJobRecord[]): Promise<boolean> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(jobs),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
