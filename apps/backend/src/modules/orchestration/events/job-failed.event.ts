export class JobFailedEvent {
  constructor(
    public readonly jobId: string,
    public readonly type: string,
    public readonly error: string,
    public readonly attemptsMade: number = 0,
    public readonly timestamp: Date = new Date(),
  ) {}
}
