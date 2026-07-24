export interface ScheduledJob {
  id: string;
  name: string;
  suite: string;
  cron: string;
  nextRun: string;
  status: 'Active' | 'Paused';
  lastResult?: 'Passed' | 'Failed';
}
