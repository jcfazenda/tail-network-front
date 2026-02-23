import { Injectable, signal } from '@angular/core';

export type UserRole = 'recruiter' | 'talent' | null;

@Injectable({ providedIn: 'root' })
export class AuthService {
  isLoggedIn = signal(false);
  role = signal<UserRole>(null);

  loginFake(email: string, role: Exclude<UserRole, null>) {
    this.isLoggedIn.set(true);
    this.role.set(role);
  }

  logout() {
    this.isLoggedIn.set(false);
    this.role.set(null);
  }
}