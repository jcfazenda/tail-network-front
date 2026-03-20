import { Injectable, inject } from '@angular/core';
import { BrowserStorageService } from '../core/storage/browser-storage.service';
import { CompanyRecord } from './empresa.models';

@Injectable({ providedIn: 'root' })
export class EmpresaRepository {
  private readonly storageKey = 'tailworks:company-directory:v1';
  private readonly browserStorage = inject(BrowserStorageService);

  readAll(): CompanyRecord[] | null {
    return this.browserStorage.readJson<CompanyRecord[]>(this.storageKey);
  }

  writeAll(companies: CompanyRecord[]): void {
    this.browserStorage.writeJson(this.storageKey, companies);
  }

  clear(): void {
    this.browserStorage.setItem(this.storageKey, '[]');
  }
}
