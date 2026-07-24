export class RetryJobCommand {
  constructor(
    public readonly jobId: string,
    public readonly force: boolean = false,
  ) {}
}
