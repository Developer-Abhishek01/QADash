import { Logger } from '../utils/logger';
import { websocketGateway } from './websocket-gateway';

export interface ScalingConfig {
  minWorkers: number;
  maxWorkers: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  metricsInterval: number;
}

export interface ScalingMetrics {
  timestamp: string;
  activeWorkers: number;
  queuedJobs: number;
  avgJobDuration: number;
  cpuUsage: number;
  memoryUsage: number;
  queueWaitTime: number;
}

export interface WorkerPoolMetrics {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  busyWorkers: number;
  offlineWorkers: number;
  avgUtilization: number;
}

export class ScalingStrategy {
  private logger: Logger;
  private config: ScalingConfig;
  private lastScaleUp: number = 0;
  private lastScaleDown: number = 0;
  private currentWorkers: number;
  private metricsHistory: ScalingMetrics[] = [];

  constructor(config?: Partial<ScalingConfig>, logger?: Logger) {
    this.config = {
      minWorkers: config?.minWorkers || 2,
      maxWorkers: config?.maxWorkers || 20,
      scaleUpThreshold: config?.scaleUpThreshold || 5,
      scaleDownThreshold: config?.scaleDownThreshold || 1,
      scaleUpCooldown: config?.scaleUpCooldown || 60000,
      scaleDownCooldown: config?.scaleDownCooldown || 300000,
      metricsInterval: config?.metricsInterval || 30000,
      ...config,
    };
    this.logger = logger || new Logger('ScalingStrategy');
    this.currentWorkers = this.config.minWorkers;
  }

  async evaluateScaling(metrics: ScalingMetrics): Promise<ScalingAction> {
    this.recordMetrics(metrics);

    const now = Date.now();
    const queuedJobs = metrics.queuedJobs;
    const activeWorkers = metrics.activeWorkers;
    const utilization = activeWorkers / this.currentWorkers;

    let action: ScalingAction = { type: 'none', reason: 'metrics within acceptable range' };

    if (queuedJobs > this.config.scaleUpThreshold && this.currentWorkers < this.config.maxWorkers) {
      if (now - this.lastScaleUp >= this.config.scaleUpCooldown) {
        const workersNeeded = Math.min(
          Math.ceil(queuedJobs / 3),
          this.config.maxWorkers - this.currentWorkers
        );
        action = {
          type: 'scaleUp',
          workers: workersNeeded,
          reason: `High queue depth: ${queuedJobs} jobs waiting`,
        };
        this.lastScaleUp = now;
        this.currentWorkers += workersNeeded;
      }
    }

    else if (utilization < this.config.scaleDownThreshold && this.currentWorkers > this.config.minWorkers) {
      if (now - this.lastScaleDown >= this.config.scaleDownCooldown) {
        const workersToRemove = Math.max(1, Math.floor(this.currentWorkers * 0.2));
        const newWorkers = Math.max(this.config.minWorkers, this.currentWorkers - workersToRemove);
        
        action = {
          type: 'scaleDown',
          workers: this.currentWorkers - newWorkers,
          reason: `Low utilization: ${Math.round(utilization * 100)}%`,
        };
        this.lastScaleDown = now;
        this.currentWorkers = newWorkers;
      }
    }

    this.logger.info(`Scaling evaluation: ${action.type} - ${action.reason}`);
    this.broadcastMetrics();

    return action;
  }

  private recordMetrics(metrics: ScalingMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }
  }

  private broadcastMetrics(): void {
    const poolMetrics = this.getPoolMetrics();
    websocketGateway.broadcastToAll('pool:metrics', poolMetrics);
  }

  getPoolMetrics(): WorkerPoolMetrics {
    const recent = this.metricsHistory.slice(-10);
    const avgUtilization = recent.length > 0 
      ? recent.reduce((sum, m) => sum + (m.activeWorkers / this.currentWorkers), 0) / recent.length 
      : 0;

    return {
      totalWorkers: this.currentWorkers,
      activeWorkers: Math.min(this.currentWorkers, this.metricsHistory[this.metricsHistory.length - 1]?.activeWorkers || 0),
      idleWorkers: this.currentWorkers - (this.metricsHistory[this.metricsHistory.length - 1]?.activeWorkers || 0),
      busyWorkers: this.metricsHistory[this.metricsHistory.length - 1]?.activeWorkers || 0,
      offlineWorkers: 0,
      avgUtilization: Math.round(avgUtilization * 100),
    };
  }

  getMetricsHistory(limit = 10): ScalingMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  getCurrentWorkers(): number {
    return this.currentWorkers;
  }

  async scaleTo(targetWorkers: number): Promise<void> {
    if (targetWorkers < this.config.minWorkers || targetWorkers > this.config.maxWorkers) {
      throw new Error(`Target workers must be between ${this.config.minWorkers} and ${this.config.maxWorkers}`);
    }

    const diff = targetWorkers - this.currentWorkers;
    const action: ScalingAction = {
      type: diff > 0 ? 'scaleUp' : 'scaleDown',
      workers: Math.abs(diff),
      reason: 'Manual scaling',
    };

    this.logger.info(`Manual scaling: ${action.type} ${action.workers} workers`);
    this.currentWorkers = targetWorkers;
    this.broadcastMetrics();
  }
}

export interface ScalingAction {
  type: 'scaleUp' | 'scaleDown' | 'none';
  workers?: number;
  reason: string;
}

export class HorizontalScalingManager {
  private logger: Logger;
  private instances: Map<string, ScalingStrategy> = new Map();
  private scalingEnabled: boolean;

  constructor(scalingEnabled = true, logger?: Logger) {
    this.logger = logger || new Logger('HorizontalScalingManager');
    this.scalingEnabled = scalingEnabled;
  }

  registerInstance(instanceId: string, config?: Partial<ScalingConfig>): void {
    const strategy = new ScalingStrategy(config, this.logger);
    this.instances.set(instanceId, strategy);
    this.logger.info(`Registered scaling instance: ${instanceId}`);
  }

  unregisterInstance(instanceId: string): void {
    this.instances.delete(instanceId);
    this.logger.info(`Unregistered scaling instance: ${instanceId}`);
  }

  async evaluateAllInstances(metrics: Map<string, ScalingMetrics>): Promise<Map<string, ScalingAction>> {
    const results = new Map<string, ScalingAction>();

    if (!this.scalingEnabled) {
      results.set('global', { type: 'none', reason: 'Scaling disabled' });
      return results;
    }

    for (const [instanceId, instanceMetrics] of metrics) {
      const strategy = this.instances.get(instanceId);
      if (strategy) {
        const action = await strategy.evaluateScaling(instanceMetrics);
        results.set(instanceId, action);
      }
    }

    return results;
  }

  getGlobalMetrics(): WorkerPoolMetrics[] {
    return Array.from(this.instances.values()).map(s => s.getPoolMetrics());
  }

  async scaleAllInstances(targetWorkers: number): Promise<void> {
    for (const [instanceId, strategy] of this.instances) {
      await strategy.scaleTo(targetWorkers);
      this.logger.info(`Scaled instance ${instanceId} to ${targetWorkers} workers`);
    }
  }
}

export function createScalingStrategy(config?: Partial<ScalingConfig>): ScalingStrategy {
  return new ScalingStrategy(config);
}

export function createScalingManager(enabled = true): HorizontalScalingManager {
  return new HorizontalScalingManager(enabled);
}