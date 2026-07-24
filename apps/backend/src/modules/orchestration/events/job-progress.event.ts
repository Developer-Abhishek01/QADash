export class JobProgressEvent {
  constructor(
    public readonly jobId: string,
    public readonly progress: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}
