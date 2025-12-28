import type { Scenario, SimulationConfig, SimulationResponse, ErrorResponse } from '../types';

// In production (Vercel), use relative URLs. In development, use localhost:3001
const API_BASE_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001');

export interface SimulateRequest {
  scenarios: Scenario[];
  config?: Partial<SimulationConfig>;
}

export type SimulateResult =
  | { success: true; data: SimulationResponse }
  | { success: false; error: ErrorResponse };

export async function simulate(request: SimulateRequest): Promise<SimulateResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data as ErrorResponse };
    }

    return { success: true, data: data as SimulationResponse };
  } catch (err) {
    return {
      success: false,
      error: {
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : 'Failed to connect to simulation server',
        },
      },
    };
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
