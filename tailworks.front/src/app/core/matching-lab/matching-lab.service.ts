import { Injectable } from '@angular/core';
import { MatchingLabEngine } from './matching-lab.engine';
import { buildMatchingLabCandidates, buildMatchingLabJobs } from './matching-lab.seed';
import { MatchLabDataset } from './matching-lab.models';

@Injectable({ providedIn: 'root' })
export class MatchingLabService {
  private readonly engine = new MatchingLabEngine();
  private cache?: MatchLabDataset;

  getDataset(): MatchLabDataset {
    if (this.cache) {
      return this.cache;
    }

    const jobs = buildMatchingLabJobs();
    const candidates = buildMatchingLabCandidates();
    const results = jobs.map((job) => this.engine.rankCandidatesForJob(job, candidates));

    this.cache = { jobs, candidates, results };
    return this.cache;
  }

  reset(): MatchLabDataset {
    this.cache = undefined;
    return this.getDataset();
  }
}
