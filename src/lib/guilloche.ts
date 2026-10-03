/*
 * Guilloche: the interlocking engraved curves printed on banknotes. Each
 * rosette is a hypotrochoid, traced by a point on a circle rolling inside a
 * larger one. Generated once at module load so server and client agree.
 */

const f = (n: number) => n.toFixed(1);

export function rosette(cx: number, cy: number, R: number, r: number, d: number, steps = 900): string {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const turns = r / gcd(R, r);
  let path = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const x = cx + (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
    const y = cy + (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
    path += `${i ? "L" : "M"}${f(x)} ${f(y)}`;
  }
  return path;
}

/** A family of sine waves whose phases fan out, like the borders of a note. */
export function waves(x0: number, x1: number, y: number, amp: number, periods: number, count: number): string[] {
  return Array.from({ length: count }, (_, k) => {
    const phase = (k / count) * Math.PI * 2;
    let path = "";
    for (let i = 0; i <= 120; i++) {
      const x = x0 + ((x1 - x0) * i) / 120;
      const yy = y + amp * Math.sin((i / 120) * Math.PI * 2 * periods + phase);
      path += `${i ? "L" : "M"}${f(x)} ${f(yy)}`;
    }
    return path;
  });
}

export const LEFT_ROSETTE = [
  rosette(112, 150, 62, 17, 22),
  rosette(112, 150, 62, 17, 34),
  rosette(112, 150, 62, 17, 46),
];
export const RIGHT_ROSETTE = [
  rosette(528, 150, 62, 19, 24),
  rosette(528, 150, 62, 19, 36),
  rosette(528, 150, 62, 19, 48),
];
export const TOP_WAVES = waves(40, 600, 40, 7, 9, 5);
export const BOTTOM_WAVES = waves(40, 600, 262, 7, 9, 5);
