export function parseCount(value: string, min: number): number {
  const n = parseInt(value, 10);
  if (value === "" || isNaN(n)) return min;
  return Math.max(min, n);
}

export function normalizeCountDraft(value: string, min: number): string {
  return String(parseCount(value, min));
}
