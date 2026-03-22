import { Injectable } from '@angular/core';
import { SeededTalentProfile } from './talent-profile-store.service';

@Injectable({ providedIn: 'root' })
export class TalentProfileSyncApiService {
  private readonly endpoint = '/api/mock-talent-profiles';

  async readAll(): Promise<SeededTalentProfile[] | null> {
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
      return Array.isArray(payload) ? (payload as SeededTalentProfile[]) : [];
    } catch {
      return null;
    }
  }

  async writeAll(profiles: SeededTalentProfile[]): Promise<boolean> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(profiles),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
