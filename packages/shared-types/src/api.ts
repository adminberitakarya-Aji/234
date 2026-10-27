export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HealthCheck {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  services: Record<string, "ok" | "degraded" | "down">;
}