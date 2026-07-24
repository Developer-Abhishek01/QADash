export class BatchSubmittedEvent {
  constructor(
    public readonly jobIds: string[],
    public readonly count: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}
