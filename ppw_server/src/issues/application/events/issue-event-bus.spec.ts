import { IssueEvent } from '../../domain/issue-event';
import { IssueEventBus } from './issue-event-bus';

describe('IssueEventBus', () => {
  const event: IssueEvent = {
    type: 'ISSUE_CREATED',
    issue: {
      id: 10,
      version: 1,
      projectId: 1,
      title: 'Issue de teste',
      description: 'Descrição de teste.',
      type: 'BUG',
      priority: 'MEDIA',
      status: 'BACKLOG',
      assignee: 'Ana',
      createdAt: '2026-11-12T10:00:00.000Z',
      updatedAt: '2026-11-12T10:00:00.000Z',
    },
    occurredAt: '2026-11-12T10:00:00.000Z',
  };

  it('isolates synchronous and asynchronous observer failures', async () => {
    const bus = new IssueEventBus();
    const successfulObserver = jest.fn();
    const synchronousFailure = jest.fn(() => {
      throw new Error('Falha síncrona');
    });
    const asynchronousFailure = jest.fn(async () => {
      throw new Error('Falha assíncrona');
    });

    bus.subscribe(successfulObserver);
    bus.subscribe(synchronousFailure);
    bus.subscribe(asynchronousFailure);

    await expect(bus.publish(event)).resolves.toBeUndefined();
    expect(successfulObserver).toHaveBeenCalledWith(event);
    expect(synchronousFailure).toHaveBeenCalledWith(event);
    expect(asynchronousFailure).toHaveBeenCalledWith(event);
  });

  it('stops invoking an observer after unsubscribe', async () => {
    const bus = new IssueEventBus();
    const observer = jest.fn();
    const unsubscribe = bus.subscribe(observer);

    unsubscribe();
    await bus.publish(event);

    expect(observer).not.toHaveBeenCalled();
  });
});
