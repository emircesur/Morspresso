/**
 * Morspresso - Farnsworth Timing Calculator
 *
 * Standard PARIS timing:
 *   - Dot duration = 1200 / WPM (ms)
 *   - Dash = 3 × dot
 *   - Intra-character gap = 1 × dot
 *   - Inter-character gap = 3 × dot
 *   - Word gap = 7 × dot
 *
 * Farnsworth timing: Characters sent at charSpeed WPM, 
 * but extra space is added between characters and words
 * so overall speed matches overallSpeed WPM.
 */

export interface TimingConfig {
  /** Character speed in WPM (how fast individual characters are sent) */
  charSpeed: number;
  /** Overall effective speed in WPM */
  overallSpeed: number;
  /** Audio frequency in Hz */
  frequency: number;
}

export interface TimingValues {
  dot: number;         // ms
  dash: number;        // ms
  intraChar: number;   // gap between dots/dashes within a character
  interChar: number;   // gap between characters
  wordGap: number;     // gap between words
}

/**
 * Calculate timing values with Farnsworth support.
 * Based on the ARRL Farnsworth timing specification.
 */
export function calculateTiming(config: TimingConfig): TimingValues {
  const { charSpeed, overallSpeed } = config;

  // Character element timing based on character speed
  const dotMs = 1200 / charSpeed;
  const dashMs = 3 * dotMs;
  const intraCharMs = dotMs;

  if (overallSpeed >= charSpeed) {
    // No Farnsworth stretching needed
    return {
      dot: dotMs,
      dash: dashMs,
      intraChar: intraCharMs,
      interChar: 3 * dotMs,
      wordGap: 7 * dotMs,
    };
  }

  // Farnsworth: stretch inter-character and word gaps
  // "PARIS" = 50 dot-units at charSpeed
  // Total time for "PARIS " at overallSpeed = 60000 / overallSpeed ms
  // Total time for character elements of "PARIS" at charSpeed:
  //   P(.--.): 4 elements + 3 intra = 14 units
  //   A(.-): 2 elements + 1 intra = 4 units
  //   R(.-.): 3 elements + 2 intra = 8 units
  //   I(..): 2 elements + 1 intra = 4 units
  //   S(...): 3 elements + 2 intra = 8 units
  //   Total character elements = 38 dot-units
  //   Plus 4 inter-character gaps and 1 word gap

  const totalCharElementTime = 31 * dotMs;  // character elements only (dots + dashes)
  const totalIntraTime = 7 * intraCharMs;    // intra-character gaps
  const charTime = totalCharElementTime + totalIntraTime;

  const totalPARISTime = 60000 / overallSpeed; // ms for "PARIS "
  const extraTime = totalPARISTime - charTime;

  // Distribute extra time: 4 inter-char gaps + 1 word gap
  // Word gap = 7/3 × inter-char gap (maintaining the 7:3 ratio)
  // 4 * ic + (7/3) * ic = extraTime
  // ic * (4 + 7/3) = extraTime
  // ic * (19/3) = extraTime
  const interCharMs = extraTime * 3 / 19;
  const wordGapMs = extraTime * 7 / 19;

  return {
    dot: dotMs,
    dash: dashMs,
    intraChar: intraCharMs,
    interChar: Math.max(interCharMs, 3 * dotMs),
    wordGap: Math.max(wordGapMs, 7 * dotMs),
  };
}

/**
 * Estimate WPM from a measured dot duration in ms.
 * Uses the PARIS standard: 1 word = 50 dot-units.
 */
export function estimateWPM(dotMs: number): number {
  return 1200 / dotMs;
}
