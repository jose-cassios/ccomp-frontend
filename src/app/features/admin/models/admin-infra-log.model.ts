export const INFRA_SERVICES = [
  'proxy', 'ccomp-backend', 'postgres-db', 'postgres-exporter', 'seaweeds',
  'seaweeds-setup', 'rabbitmq', 'redis', 'redis-exporter', 'grafana-lgtm', 'prometheus', 'alloy',
] as const;
export const INFRA_LEVELS = [
  'info', 'warn', 'error', 'fatal', 'panic', 'warning', 'log', 'notice',
  'debug1', 'debug2', 'debug3', 'debug4', 'debug5',
] as const;

export interface InfraLogFilter {
  serviceName?: typeof INFRA_SERVICES[number];
  container?: string;
  level?: typeof INFRA_LEVELS[number];
  search?: string;
  start?: string;
  end?: string;
  limit?: number;
}

export interface InfraLogEntry {
  timestamp: string;
  service_name: string | null;
  container: string | null;
  level: string | null;
  message: string;
}

export interface InfraLogsResponse {
  logs: InfraLogEntry[];
  start: string;
  end: string;
  limit: number;
}
