import { Component, Input } from '@angular/core';

type ButtonVariant = 'primary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'tw-button',
  standalone: true,
  template: `
    <button
      class="tw-btn"
      [class.tw-primary]="variant === 'primary'"
      [class.tw-ghost]="variant === 'ghost'"
      [class.tw-danger]="variant === 'danger'"
      [class.tw-sm]="size === 'sm'"
      [class.tw-md]="size === 'md'"
      [class.tw-lg]="size === 'lg'"
      [disabled]="disabled || loading"
      [attr.type]="type"
    >
      <span class="spinner" *ngIf="loading" aria-hidden="true"></span>
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    .tw-btn{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:10px;
      border-radius:14px;
      font-weight:800;
      letter-spacing:0.2px;
      cursor:pointer;
      transition:transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease;
      border:1px solid var(--border);
      background: var(--glass);
      color: var(--text);
      user-select:none;
    }

    .tw-btn:disabled{
      opacity:.55;
      cursor:not-allowed;
      transform:none !important;
      box-shadow:none !important;
    }

    /* Sizes */
    .tw-sm{ padding:8px 12px; font-size:12.5px; border-radius:12px; }
    .tw-md{ padding:12px 16px; font-size:14px; }
    .tw-lg{ padding:14px 18px; font-size:15px; border-radius:16px; }

    /* Variants */
    .tw-primary{
      border-color: transparent;
      background: linear-gradient(135deg, var(--brand-1), var(--brand-2));
      color:white;
    }
    .tw-primary:hover{ transform: translateY(-1px); box-shadow: 0 10px 30px rgba(124,58,237,.35); }

    .tw-ghost{
      background: transparent;
    }
    .tw-ghost:hover{ background: rgba(255,255,255,.06); }

    .tw-danger{
      border-color: rgba(239,68,68,.25);
      background: rgba(239,68,68,.12);
      color: rgba(255,255,255,.92);
    }
    .tw-danger:hover{ transform: translateY(-1px); box-shadow: 0 10px 30px rgba(239,68,68,.18); }

    /* Loading spinner */
    .spinner{
      width:14px;height:14px;
      border-radius:999px;
      border:2px solid rgba(255,255,255,.35);
      border-top-color: rgba(255,255,255,.95);
      animation: spin .7s linear infinite;
    }
    @keyframes spin{ to { transform: rotate(360deg); } }
  `]
})
export class TwButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: ButtonType = 'button';
  @Input() disabled = false;
  @Input() loading = false;
}