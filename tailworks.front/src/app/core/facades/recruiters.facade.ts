import { Injectable, inject } from '@angular/core';
import { RecruiterDirectoryService } from '../../recruiter/recruiter-directory.service';
import { RecruiterDraft, RecruiterRecord } from '../../recruiter/recruiter.models';

@Injectable({ providedIn: 'root' })
export class RecruitersFacade {
  private readonly recruiterService = inject(RecruiterDirectoryService);

  readonly changes$ = this.recruiterService.changes$;
  readonly areaOptions = this.recruiterService.areaOptions;

  getCurrentRecruiter(): RecruiterRecord {
    return this.recruiterService.getCurrentRecruiter();
  }

  listRecruiters(companyName?: string): RecruiterRecord[] {
    return this.recruiterService.listRecruiters(companyName);
  }

  listAllRecruiters(): RecruiterRecord[] {
    return this.recruiterService.listAllRecruiters();
  }

  getRecruiterById(id: string, companyName?: string): RecruiterRecord | undefined {
    return this.recruiterService.getRecruiterById(id, companyName);
  }

  getRecruiterCompanies(recruiterId?: string, companyName?: string): string[] {
    return this.recruiterService.getRecruiterCompanies(recruiterId, companyName);
  }

  saveRecruiter(draft: RecruiterDraft): RecruiterRecord {
    return this.recruiterService.saveRecruiter(draft);
  }

  toggleRecruiterActive(recruiterId: string, companyName?: string): RecruiterRecord | undefined {
    return this.recruiterService.toggleRecruiterActive(recruiterId, companyName);
  }

  signInAsRecruiter(recruiterId: string, companyName?: string): RecruiterRecord {
    return this.recruiterService.signInAsRecruiter(recruiterId, companyName);
  }

  replaceCompanyName(previousName: string, nextName: string): void {
    this.recruiterService.replaceCompanyName(previousName, nextName);
  }
}
