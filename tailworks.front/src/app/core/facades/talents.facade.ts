import { Injectable, inject } from '@angular/core';
import { TalentDirectoryService, TalentRecord } from '../../talent/talent-directory.service';

@Injectable({ providedIn: 'root' })
export class TalentsFacade {
  private readonly talentService = inject(TalentDirectoryService);

  listTalents(): TalentRecord[] {
    return this.talentService.listTalents();
  }

  ensureSeeded(): void {
    this.talentService.ensureSeeded();
  }

  upsertTalent(input: Pick<TalentRecord, 'name' | 'email' | 'location'> & Partial<Pick<TalentRecord, 'stacks' | 'avatarUrl' | 'visibleInEcosystem' | 'availableForHiring'>>): TalentRecord {
    return this.talentService.upsertTalent(input);
  }
}
