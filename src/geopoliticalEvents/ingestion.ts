import { GeopoliticalEventValidationError, validateGeopoliticalEvent, type GeopoliticalEvent } from './model';

export class DuplicateGeopoliticalEventError extends Error {
  constructor(eventId: string) {
    super(`Geopolitical event already exists: ${eventId}`);
    this.name = 'DuplicateGeopoliticalEventError';
  }
}

const cloneEvent = (event: GeopoliticalEvent): GeopoliticalEvent => ({
  ...event,
  countriesInvolved: [...event.countriesInvolved],
});

export class GeopoliticalEventIngestionStore {
  private readonly events = new Map<string, GeopoliticalEvent>();

  ingest(event: unknown): GeopoliticalEvent {
    const validated = validateGeopoliticalEvent(event);
    if (this.events.has(validated.id)) throw new DuplicateGeopoliticalEventError(validated.id);
    const stored = cloneEvent(validated);
    this.events.set(stored.id, stored);
    return cloneEvent(stored);
  }

  ingestMany(events: readonly unknown[]): GeopoliticalEvent[] {
    const validated = events.map((event) => validateGeopoliticalEvent(event));
    const batchIds = new Set<string>();
    for (const event of validated) {
      if (this.events.has(event.id) || batchIds.has(event.id)) throw new DuplicateGeopoliticalEventError(event.id);
      batchIds.add(event.id);
    }
    for (const event of validated) this.events.set(event.id, cloneEvent(event));
    return validated.map(cloneEvent);
  }

  getEvent(eventId: string): GeopoliticalEvent | undefined {
    const event = this.events.get(eventId);
    return event ? cloneEvent(event) : undefined;
  }

  getEvents(): GeopoliticalEvent[] {
    return [...this.events.values()].map(cloneEvent);
  }

  get size(): number {
    return this.events.size;
  }

  clear(): void {
    this.events.clear();
  }
}

export { GeopoliticalEventValidationError };
