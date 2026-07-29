export class ExecutionOrchestratedEvent {
  constructor(
    public readonly executionId: string,
    public readonly jobIds: string[],
    public readonly options: Record<string, unknown>,
    public readonly timestamp: Date = new Date(),
  ) {}
}
