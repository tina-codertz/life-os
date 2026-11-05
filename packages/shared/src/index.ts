export const PRIORITIES = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof PRIORITIES)[number];

// Versioned API path prefix shared by the API (global prefix) and the mobile HTTP client.
export const API_PREFIX = 'api/v1';
