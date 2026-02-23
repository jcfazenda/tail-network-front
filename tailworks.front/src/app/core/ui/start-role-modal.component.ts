import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StartModalService } from '../ui/start-modal.service';

type Role = 'recruiter' | 'talent';

@Component({
  selector: 'tw-start-role-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './start-role-modal.component.html',
  styleUrls: ['./start-role-modal.component.scss'],
})
export class StartRoleModalComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  public startModal = inject(StartModalService);

  role: Role | null = null;

  form = this.fb.group({
    company: [''],
    age: [null as number | null, [Validators.min(10), Validators.max(120)]],
    birthDate: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
  });

  // Quando role = talent, empresa pode ser opcional.
  selectRole(role: Role): void {
    this.role = role;

    const companyCtrl = this.form.controls.company;
    if (role === 'recruiter') {
      companyCtrl.setValidators([Validators.required, Validators.minLength(2)]);
    } else {
      companyCtrl.clearValidators();
    }
    companyCtrl.updateValueAndValidity();
  }

  close(): void {
    this.startModal.close();
    this.role = null;
    this.form.reset();
  }

  onBirthChange(): void {
    const raw = this.form.controls.birthDate.value;
    if (!raw) return;

    const d = new Date(raw);
    if (isNaN(d.getTime())) return;

    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;

    // seta idade automaticamente (mas você pode deixar editável no input)
    this.form.controls.age.setValue(age);
  }

  continue(): void {
    if (!this.role) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const payload = {
      role: this.role,
      ...this.form.getRawValue(),
      isNew: true, // regra: entrou aqui é novo
    };

    // Aqui você decide: salvar no localStorage, chamar API, etc.
    localStorage.setItem('tw_start_intake', JSON.stringify(payload));

    this.startModal.close();
    this.router.navigate(['/choose'], { queryParams: { role: this.role } });
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') this.close();
  }
}