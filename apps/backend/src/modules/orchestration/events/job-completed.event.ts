export class JobCompletedEvent {
  constructor(
    public readonly jobId: string,
    public readonly type: string,
    public readonly result?: unknown,
    public readonly timestamp: Date = new Date(),
  ) {}
}
