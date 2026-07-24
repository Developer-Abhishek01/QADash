export class SubmitJobCommand {
  constructor(
    public readonly type: 'test' | 'security' | 'performance' | 'accessibility' | 'ai-analysis' | 'report' | 'bug-sync',
    public readonly payload: Record<string, any>,
    public readonly priority: 'critical' | 'high' | 'medium' | 'low' = 'medium',
    public readonly dependencies?: string[],
    public readonly callback?: string,
    public readonly id?: string,
  ) {}
}
