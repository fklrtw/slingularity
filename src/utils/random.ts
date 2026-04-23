/**
 * Simple seedable pseudo-random number generator (Mulberry32)
 *
 * @param a The seed value.
 * @returns A function that returns a random number between 0 and 1.
 */
export function seededRandom(a: number) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
