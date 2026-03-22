import { Injectable, inject } from '@angular/core';
import { MatchingLabEngine } from './matching-lab.engine';
import { buildMatchingLabCandidates, buildMatchingLabJobs } from './matching-lab.seed';
import { MatchLabDataset } from './matching-lab.models';
import { TalentProfileStoreService } from '../../talent/talent-profile-store.service';
import { BrowserStorageService } from '../storage/browser-storage.service';

@Injectable({ providedIn: 'root' })
export class MatchingLabService {
  static readonly storageKey = 'tailworks:matching-lab-dataset:v1';

  private readonly engine = new MatchingLabEngine();
  private readonly talentProfileStore = inject(TalentProfileStoreService);
  private readonly browserStorage = inject(BrowserStorageService);
  private cache?: MatchLabDataset;

  private readonly emptyDataset: MatchLabDataset = {
    jobs: [],
    candidates: [],
    results: [],
  };

  getDataset(): MatchLabDataset {
    if (this.cache) {
      return this.cache;
    }

    const stored = this.browserStorage.readJson<Pick<MatchLabDataset, 'jobs' | 'candidates'>>(MatchingLabService.storageKey);
    if (!stored?.jobs?.length || !stored?.candidates?.length) {
      this.cache = this.emptyDataset;
      return this.cache;
    }

    const jobs = stored.jobs;
    const syncedCandidates = this.talentProfileStore.listMatchCandidates();
    const candidates = syncedCandidates.length ? syncedCandidates : stored.candidates;
    const results = jobs.map((job) => this.engine.rankCandidatesForJob(job, candidates));

    this.cache = { jobs, candidates, results };
    return this.cache;
  }

  generateLocalMass(): MatchLabDataset {
    const dataset = {
      jobs: buildMatchingLabJobs(),
      candidates: buildMatchingLabCandidates(),
    };
    this.browserStorage.writeJson(MatchingLabService.storageKey, dataset);
    this.cache = undefined;
    return this.getDataset();
  }

  reset(): MatchLabDataset {
    this.cache = undefined;
    return this.getDataset();
  }

  clear(): void {
    this.cache = undefined;
    this.browserStorage.removeItem(MatchingLabService.storageKey);
  }
}
