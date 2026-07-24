export class JobSubmittedEvent {
  constructor(
    public readonly jobId: string,
    public readonly type: string,
    public readonly priority: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
