import { Injectable, inject } from '@angular/core';
import { EmpresaDirectoryService } from '../../empresa/empresa-directory.service';
import { CompanyDraft, CompanyRecord } from '../../empresa/empresa.models';

@Injectable({ providedIn: 'root' })
export class CompaniesFacade {
  private readonly companyService = inject(EmpresaDirectoryService);

  readonly changes$ = this.companyService.changes$;

  listCompanies(includeInactive = true): CompanyRecord[] {
    return this.companyService.listCompanies(includeInactive);
  }

  listCompanyNames(includeInactive = false): string[] {
    return this.companyService.listCompanyNames(includeInactive);
  }

  getCompanyById(id: string): CompanyRecord | undefined {
    return this.companyService.getCompanyById(id);
  }

  getCompanyByName(name: string): CompanyRecord | undefined {
    return this.companyService.getCompanyByName(name);
  }

  saveCompany(draft: CompanyDraft): CompanyRecord {
    return this.companyService.saveCompany(draft);
  }

  toggleCompanyActive(companyId: string): CompanyRecord | undefined {
    return this.companyService.toggleCompanyActive(companyId);
  }

  deleteCompany(companyId: string): void {
    this.companyService.deleteCompany(companyId);
  }
}
