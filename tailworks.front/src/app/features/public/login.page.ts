import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = signal('julio@tailworks.com');
  password = signal('');

  get role(): 'recruiter' | 'talent' {
    return (this.auth.role() ?? 'recruiter') as 'recruiter' | 'talent';
  }

  roleLabel() {
    return this.auth.role() === 'recruiter' ? 'Recruiter' : 'Talento';
  }

  setRole(role: 'recruiter' | 'talent') {
    this.auth.role.set(role);
  }

  login() {
    const role = this.auth.role() ?? 'recruiter';
    this.auth.loginFake(this.email(), role);
    this.router.navigateByUrl('/home');
  }

  loginWithProvider(provider: 'google' | 'linkedin') {
    const role = this.auth.role() ?? 'recruiter';
    const socialEmail =
      provider === 'google'
        ? (this.email() || 'usuario@gmail.com')
        : (this.email() || 'usuario@linkedin.com');
    this.auth.loginFake(socialEmail, role);
    this.router.navigateByUrl('/home');
  }
}
