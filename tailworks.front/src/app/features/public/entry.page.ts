import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  template: '',
})
export class EntryPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const isLogged = this.auth.isLoggedIn();
      this.router.navigateByUrl(isLogged ? '/home' : '/login');
    });
  }
}
