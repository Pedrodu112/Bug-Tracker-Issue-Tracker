import { Controller, Get, Param } from '@nestjs/common';
import { NotificationsUseCases } from './application/notifications.use-cases';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsUseCases) {}

  @Get(':recipientId')
  findByRecipient(@Param('recipientId') recipientId: string) {
    return this.notifications.findByRecipient(recipientId);
  }
}
