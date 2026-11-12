import { Injectable, Logger } from '@nestjs/common';
import { IssueEvent, IssueEventHandler, IssueEventPublisher } from '../../domain/issue-event';

/**
 * Barramento Observer: os casos de uso publicam eventos sem conhecer
 * os consumidores que reagem a eles.
 */
@Injectable()
export class IssueEventBus implements IssueEventPublisher {
  private readonly handlers = new Set<IssueEventHandler>();
  private readonly logger = new Logger(IssueEventBus.name);

  subscribe(handler: IssueEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async publish(event: IssueEvent): Promise<void> {
    const results = await Promise.allSettled(
      [...this.handlers].map((handler) => Promise.resolve(handler(event))),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(
          'Falha ao processar evento ' + event.type + ': ' + String(result.reason),
        );
      }
    }
  }
}
