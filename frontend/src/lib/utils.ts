import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(n: number, decimals: number = 2): string {
  return n.toFixed(decimals);
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function formatCI(ci: [number, number], formatter: (n: number) => string = formatNumber): string {
  return `${formatter(ci[0])}–${formatter(ci[1])}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
