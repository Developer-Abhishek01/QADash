export class ExecutionOrchestratedEvent {
  constructor(
    public readonly executionId: string,
    public readonly jobIds: string[],
    public readonly options: Record<string, any>,
    public readonly timestamp: Date = new Date(),
  ) {}
}
