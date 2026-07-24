export interface Environment {
  id: string;
  name: string;
  url: string;
  type: 'STAGING' | 'PRODUCTION' | 'DEVELOPMENT';
  status: 'UP' | 'DOWN';
  lastChecked: string;
  auth?: { username?: string; password?: string };
}
