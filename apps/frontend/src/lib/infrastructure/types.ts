export interface HealthComponent {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
}

export interface StorageInfo extends HealthComponent {
  used?: number;
  total?: number;
  available?: number;
}

export interface MemoryInfo extends HealthComponent {
  usedPercent?: number;
}

export interface NetworkInfo extends HealthComponent {
  latency?: number;
}

export interface InfrastructureHealth {
  storage: StorageInfo;
  memory: MemoryInfo;
  network: NetworkInfo;
  timestamp: string;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  uptime: number;
  cpu: {
    model: string;
    cores: number;
    load: number[];
  };
  memory: {
    total: string;
    used: string;
    free: string;
    usedPercent: number;
  };
  process: {
    pid: number;
    memory: string;
    uptime: number;
  };
}

export interface DetailedHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: HealthComponent & { latency?: number };
    redis: HealthComponent;
    disk: StorageInfo;
    memory: MemoryInfo;
    cpu: HealthComponent & { load?: number[] };
    network: NetworkInfo;
  };
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}
