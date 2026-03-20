import { Injectable, inject } from '@angular/core';
import { TalentNotification, TalentNotificationService } from '../../usuario/talent-notification.service';

@Injectable({ providedIn: 'root' })
export class TalentNotificationsFacade {
  private readonly notificationService = inject(TalentNotificationService);

  notifications(): TalentNotification[] {
    return this.notificationService.notifications();
  }

  unreadCount(): number {
    return this.notificationService.unreadCount();
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id);
  }
}
