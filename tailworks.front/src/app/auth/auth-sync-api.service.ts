import { Injectable } from '@angular/core';
import { AuthAccount } from './mock-auth.service';

@Injectable({ providedIn: 'root' })
export class AuthSyncApiService {
  private readonly endpoint = '/api/mock-auth-accounts';

  async readAll(): Promise<AuthAccount[] | null> {
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
      return Array.isArray(payload) ? (payload as AuthAccount[]) : [];
    } catch {
      return null;
    }
  }

  async writeAll(accounts: AuthAccount[]): Promise<boolean> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(accounts),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
