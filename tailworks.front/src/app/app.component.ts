import { Component } from '@angular/core';
import { AppShellComponent } from './core/layout/app-shell/app-shell.component';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [AppShellComponent],
  template: `<app-shell />`,
})
export class AppComponent {}
