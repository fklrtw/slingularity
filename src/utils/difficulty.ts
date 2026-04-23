/**
 * Asymptotic scaling helper
 * Returns a value that smoothly transitions from start to limit as level increases.
 * Formula: f(L) = Start + (Limit - Start) * ((L - 1) / (L - 1 + HalfLife))
 * At Level 1, it returns Start.
 * As Level -> Infinity, it approaches Limit.
 * At Level = 1 + HalfLife, it is exactly halfway between Start and Limit.
 * @param level Level to get value for
 * @param start Start value/value at level 1
 * @param limit Limit for value (min/max respectively
 * @param halfLife Half life to get to the limit
 */
export function scaleAsymptotic(level: number, start: number, limit: number, halfLife: number): number {
  if (level <= 1) {
    return start;
  }

  const factor = (level - 1) / (level - 1 + halfLife);

  return start + (limit - start) * factor;
}
