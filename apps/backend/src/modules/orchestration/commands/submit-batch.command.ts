import { SubmitJobCommand } from './submit-job.command';

export class SubmitBatchCommand {
  constructor(public readonly jobs: SubmitJobCommand[]) {}
}
