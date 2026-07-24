export class ServiceHealthChangedEvent {
  constructor(
    public readonly service: string,
    public readonly status: 'healthy' | 'degraded' | 'down',
    public readonly latency: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}
