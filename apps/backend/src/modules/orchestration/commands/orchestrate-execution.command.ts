export class OrchestrateExecutionCommand {
  constructor(
    public readonly executionId: string,
    public readonly options: {
      tests?: boolean;
      security?: boolean;
      performance?: boolean;
      accessibility?: boolean;
      aiAnalysis?: boolean;
      priority?: 'critical' | 'high' | 'medium' | 'low';
      parallel?: boolean;
      maxRetries?: number;
      timeout?: number;
    },
  ) {}
}
