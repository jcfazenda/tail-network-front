import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { MockJobCandidate, MockJobRecord } from '../vagas/data/vagas.models';

export type TalentNotificationType = 'process-advanced';

export type TalentNotification = {
  id: string;
  type: TalentNotificationType;
  jobId: string;
  title: string;
  company: string;
  location: string;
  workModel: string;
  match: number;
  candidateName: string;
  createdAt: string;
  readAt?: string;
};

@Injectable({ providedIn: 'root' })
export class TalentNotificationService {
  private readonly storageKey = 'tailworks.front.talent-notifications.v1';
  private readonly syncChannelName = 'tailworks.front.talent-notifications.sync';
  private readonly zone = inject(NgZone);
  private readonly notificationsSignal = signal<TalentNotification[]>(this.readNotifications());
  private broadcastChannel: BroadcastChannel | null = null;

  readonly notifications = this.notificationsSignal.asReadonly();
  readonly unreadCount = computed(() => this.notifications().filter((item) => !item.readAt).length);
  readonly latestUnread = computed(() => this.notifications().find((item) => !item.readAt) ?? null);
  readonly latestNotification = computed(() => this.notifications()[0] ?? null);

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('storage', this.handleStorageSync);

    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(this.syncChannelName);
      this.broadcastChannel.addEventListener('message', this.handleBroadcastSync);
    }
  }

  pushProcessAdvancedNotification(job: MockJobRecord, candidate: MockJobCandidate): void {
    const nextNotification: TalentNotification = {
      id: `process-advanced:${job.id}:${candidate.id ?? candidate.name}:${Date.now()}`,
      type: 'process-advanced',
      jobId: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      workModel: job.workModel,
      match: Math.round(candidate.match ?? job.match),
      candidateName: candidate.name,
      createdAt: new Date().toISOString(),
    };

    const nextNotifications = [
      nextNotification,
      ...this.notifications().filter((item) => !(item.type === 'process-advanced' && item.jobId === job.id && !item.readAt)),
    ].slice(0, 20);

    this.persistNotifications(nextNotifications);
  }

  markAsRead(id: string): void {
    const nextNotifications = this.notifications().map((item) => (
      item.id === id && !item.readAt
        ? { ...item, readAt: new Date().toISOString() }
        : item
    ));

    this.persistNotifications(nextNotifications);
  }

  private persistNotifications(notifications: TalentNotification[]): void {
    this.notificationsSignal.set(notifications);

    const storage = this.getStorage();
    if (storage) {
      storage.setItem(this.storageKey, JSON.stringify(notifications));
      this.broadcastChannel?.postMessage({ key: this.storageKey, updatedAt: Date.now() });
    }
  }

  private readNotifications(): TalentNotification[] {
    const storage = this.getStorage();
    const raw = storage?.getItem(this.storageKey);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as TalentNotification[];
      return Array.isArray(parsed)
        ? parsed
            .filter((item) => !!item && typeof item === 'object' && !!item.id && !!item.jobId)
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        : [];
    } catch {
      storage?.removeItem(this.storageKey);
      return [];
    }
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }

    return window.localStorage;
  }

  private handleStorageSync = (event: StorageEvent): void => {
    if (event.key !== this.storageKey) {
      return;
    }

    this.zone.run(() => {
      this.notificationsSignal.set(this.readNotifications());
    });
  };

  private handleBroadcastSync = (): void => {
    this.zone.run(() => {
      this.notificationsSignal.set(this.readNotifications());
    });
  };
}
