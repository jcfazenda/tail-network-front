import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { CompanyDraft, CompanyRecord } from './empresa.models';
import { EmpresaRepository } from './empresa.repository';

@Injectable({ providedIn: 'root' })
export class EmpresaDirectoryService {
  private readonly changesSubject = new Subject<void>();
  private readonly repository = inject(EmpresaRepository);
  private cache: CompanyRecord[] | null = null;

  readonly changes$ = this.changesSubject.asObservable();

  listCompanies(includeInactive = true): CompanyRecord[] {
    return this.loadDirectory()
      .filter((company) => includeInactive || company.active)
      .sort((left, right) => {
        if (left.active !== right.active) {
          return left.active ? -1 : 1;
        }

        return left.name.localeCompare(right.name, 'pt-BR');
      });
  }

  listCompanyNames(includeInactive = false): string[] {
    return this.listCompanies(includeInactive).map((company) => company.name);
  }

  getCompanyById(id: string): CompanyRecord | undefined {
    return this.loadDirectory().find((company) => company.id === id);
  }

  getCompanyByName(name: string): CompanyRecord | undefined {
    const normalized = name.trim().toLocaleLowerCase('pt-BR');
    return this.loadDirectory().find((company) => company.name.trim().toLocaleLowerCase('pt-BR') === normalized);
  }

  saveCompany(draft: CompanyDraft): CompanyRecord {
    const now = new Date().toISOString();
    const existing = draft.id
      ? this.getCompanyById(draft.id)
      : this.getCompanyByName(draft.name);

    const nextRecord: CompanyRecord = {
      id: existing?.id ?? this.createCompanyId(draft.name),
      name: draft.name.trim() || 'Empresa',
      sector: draft.sector.trim() || 'Tecnologia',
      location: draft.location.trim() || 'Brasil',
      description: draft.description.trim() || 'Empresa em crescimento no ecossistema TailWorks.',
      followers: draft.followers.trim() || '120.000 seguidores',
      linkedinCount: draft.linkedinCount.trim() || '120.000 no LinkedIn',
      logoLabel: (draft.logoLabel.trim() || draft.name.trim().slice(0, 2)).toLowerCase(),
      logoUrl: draft.logoUrl?.trim() || undefined,
      website: draft.website?.trim() || undefined,
      emailDomain: draft.emailDomain?.trim() || undefined,
      monthlyHiringCount: Number.isFinite(draft.monthlyHiringCount) ? Math.max(0, draft.monthlyHiringCount) : 0,
      active: draft.active,
      notes: draft.notes?.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.cache = existing
      ? this.loadDirectory().map((company) => company.id === nextRecord.id ? nextRecord : company)
      : [nextRecord, ...this.loadDirectory()];

    this.persist();
    return nextRecord;
  }

  toggleCompanyActive(companyId: string): CompanyRecord | undefined {
    const target = this.getCompanyById(companyId);
    if (!target) {
      return undefined;
    }

    const nextRecord: CompanyRecord = {
      ...target,
      active: !target.active,
      updatedAt: new Date().toISOString(),
    };

    this.cache = this.loadDirectory().map((company) => company.id === companyId ? nextRecord : company);
    this.persist();
    return nextRecord;
  }

  deleteCompany(companyId: string): void {
    this.cache = this.loadDirectory().filter((company) => company.id !== companyId);
    this.persist();
  }

  resetDirectory(): void {
    this.cache = [];
    this.repository.clear();
    this.changesSubject.next();
  }

  clearDirectory(): void {
    this.cache = [];
    this.repository.writeAll([]);
    this.changesSubject.next();
  }

  private loadDirectory(): CompanyRecord[] {
    if (this.cache) {
      return this.cache;
    }

    const stored = this.repository.readAll();
    if (!stored) {
      this.cache = this.defaultCompanies();
      return this.cache;
    }

    if (!stored.length) {
      this.cache = [];
      return this.cache;
    }

    this.cache = stored.map((company) => this.normalizeCompany(company));
    return this.cache;
  }

  private persist(emit = true): void {
    if (!this.cache) {
      return;
    }

    this.repository.writeAll(this.cache);
    if (emit) {
      this.changesSubject.next();
    }
  }

  private normalizeCompany(company: CompanyRecord): CompanyRecord {
    const now = new Date().toISOString();

    return {
      ...company,
      name: company.name?.trim() || 'Empresa',
      sector: company.sector?.trim() || 'Tecnologia',
      location: company.location?.trim() || 'Brasil',
      description: company.description?.trim() || 'Empresa em crescimento no ecossistema TailWorks.',
      followers: company.followers?.trim() || '120.000 seguidores',
      linkedinCount: company.linkedinCount?.trim() || '120.000 no LinkedIn',
      logoLabel: (company.logoLabel?.trim() || company.name?.trim().slice(0, 2) || 'em').toLowerCase(),
      logoUrl: company.logoUrl?.trim() || undefined,
      website: company.website?.trim() || undefined,
      emailDomain: company.emailDomain?.trim() || undefined,
      monthlyHiringCount: Number.isFinite(company.monthlyHiringCount) ? Math.max(0, company.monthlyHiringCount) : 0,
      active: company.active !== false,
      notes: company.notes?.trim() || undefined,
      createdAt: company.createdAt || now,
      updatedAt: company.updatedAt || company.createdAt || now,
    };
  }

  private defaultCompanies(): CompanyRecord[] {
    return [
      this.createDefaultCompany({
        name: 'Banco Itaú',
        sector: 'Banco e serviços financeiros',
        location: 'Rio de Janeiro - RJ',
        description: 'Banco e serviços financeiros',
        followers: '5.248.921 seguidores',
        linkedinCount: '5.248.921 no LinkedIn',
        logoLabel: 'it',
        logoUrl: '/assets/images/logo-itau.png',
        monthlyHiringCount: 43,
        website: 'https://www.itau.com.br',
        emailDomain: 'itau.com.br',
      }),
      this.createDefaultCompany({
        name: 'Nubank',
        sector: 'Tecnologia financeira',
        location: 'São Paulo - SP',
        description: 'Tecnologia financeira e meios de pagamento',
        followers: '2.304.114 seguidores',
        linkedinCount: '2.304.114 no LinkedIn',
        logoLabel: 'nu',
        monthlyHiringCount: 31,
        website: 'https://nubank.com.br',
        emailDomain: 'nubank.com.br',
      }),
      this.createDefaultCompany({
        name: 'Stone',
        sector: 'Serviços financeiros',
        location: 'São Paulo - SP',
        description: 'Serviços financeiros e tecnologia para negocios',
        followers: '1.128.440 seguidores',
        linkedinCount: '1.128.440 no LinkedIn',
        logoLabel: 'st',
        monthlyHiringCount: 24,
        website: 'https://www.stone.com.br',
        emailDomain: 'stone.com.br',
      }),
      this.createDefaultCompany({
        name: 'Amazon BR',
        sector: 'Cloud e marketplace',
        location: 'São Paulo - SP',
        description: 'Cloud, marketplace e serviços digitais',
        followers: '3.102.000 seguidores',
        linkedinCount: '3.102.000 no LinkedIn',
        logoLabel: 'am',
        monthlyHiringCount: 37,
        website: 'https://www.amazon.com.br',
        emailDomain: 'amazon.com.br',
      }),
      this.createDefaultCompany({
        name: 'Magazine Luiza',
        sector: 'Varejo digital',
        location: 'São Paulo - SP',
        description: 'Varejo digital, logística e tecnologia',
        followers: '2.780.000 seguidores',
        linkedinCount: '2.780.000 no LinkedIn',
        logoLabel: 'ml',
        monthlyHiringCount: 28,
        website: 'https://www.magazineluiza.com.br',
        emailDomain: 'magazineluiza.com.br',
      }),
      this.createDefaultCompany({
        name: 'BTG Pactual',
        sector: 'Banco de investimento',
        location: 'São Paulo - SP',
        description: 'Banco de investimento e tecnologia financeira',
        followers: '1.964.000 seguidores',
        linkedinCount: '1.964.000 no LinkedIn',
        logoLabel: 'bt',
        monthlyHiringCount: 22,
        website: 'https://www.btgpactual.com',
        emailDomain: 'btgpactual.com',
      }),
      this.createDefaultCompany({
        name: 'Bradesco',
        sector: 'Serviços financeiros',
        location: 'São Paulo - SP',
        description: 'Serviços financeiros, seguros e canais digitais',
        followers: '4.118.000 seguidores',
        linkedinCount: '4.118.000 no LinkedIn',
        logoLabel: 'br',
        monthlyHiringCount: 26,
        website: 'https://banco.bradesco',
        emailDomain: 'bradesco.com.br',
      }),
      this.createDefaultCompany({
        name: 'Stefanini Brasil',
        sector: 'Consultoria e tecnologia',
        location: 'São Paulo - SP',
        description: 'Consultoria, tecnologia e transformação digital',
        followers: '1.106.000 seguidores',
        linkedinCount: '1.106.000 no LinkedIn',
        logoLabel: 'sb',
        monthlyHiringCount: 19,
        website: 'https://stefanini.com',
        emailDomain: 'stefanini.com',
      }),
      this.createDefaultCompany({
        name: 'NTT DATA Latan',
        sector: 'Consultoria e tecnologia',
        location: 'São Paulo - SP',
        description: 'Consultoria, tecnologia e transformação digital',
        followers: '412.000 seguidores',
        linkedinCount: '412.000 no LinkedIn',
        logoLabel: 'nt',
        monthlyHiringCount: 15,
        website: 'https://br.nttdata.com',
        emailDomain: 'nttdata.com',
      }),
      this.createDefaultCompany({
        name: 'BRQ Solutions TI',
        sector: 'Tecnologia corporativa',
        location: 'São Paulo - SP',
        description: 'Tecnologia, produtos digitais e serviços corporativos',
        followers: '286.000 seguidores',
        linkedinCount: '286.000 no LinkedIn',
        logoLabel: 'br',
        monthlyHiringCount: 15,
        website: 'https://www.brq.com',
        emailDomain: 'brq.com',
      }),
    ];
  }

  private createDefaultCompany(draft: Omit<CompanyDraft, 'active'> & { active?: boolean }): CompanyRecord {
    const now = new Date().toISOString();

    return {
      id: this.createCompanyId(draft.name),
      name: draft.name.trim(),
      sector: draft.sector.trim(),
      location: draft.location.trim(),
      description: draft.description.trim(),
      followers: draft.followers.trim(),
      linkedinCount: draft.linkedinCount.trim(),
      logoLabel: draft.logoLabel.trim().toLowerCase(),
      logoUrl: draft.logoUrl?.trim() || undefined,
      website: draft.website?.trim() || undefined,
      emailDomain: draft.emailDomain?.trim() || undefined,
      monthlyHiringCount: draft.monthlyHiringCount,
      active: draft.active !== false,
      notes: draft.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
  }

  private createCompanyId(name: string): string {
    const base = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return base || `empresa-${Date.now()}`;
  }

}
