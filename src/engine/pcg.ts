/**
 * PCG-XSH-RR (Permuted Congruential Generator) implementation
 * A fast, statistically robust PRNG with excellent properties
 * This is PCG32 which is simpler and sufficient for simulation purposes
 */

export class PCG64 {
  private state: bigint;
  private inc: bigint;

  // PCG constants (same as PCG-64 LCG)
  private static readonly MULTIPLIER = 6364136223846793005n;

  constructor(seed: number | bigint = 42n, seq: number | bigint = 1n) {
    const seedBig = BigInt(seed);
    const seqBig = BigInt(seq);

    this.state = 0n;
    this.inc = (seqBig << 1n) | 1n;

    // Warm up the generator
    this.step();
    this.state = (this.state + seedBig) & 0xFFFFFFFFFFFFFFFFn;
    this.step();
  }

  /**
   * Advance the internal state
   */
  private step(): void {
    this.state = (this.state * PCG64.MULTIPLIER + this.inc) & 0xFFFFFFFFFFFFFFFFn;
  }

  /**
   * Generate next 32-bit unsigned integer using XSH-RR output function
   */
  nextU32(): number {
    const oldState = this.state;
    this.step();

    // XSH-RR output function for 64->32 bit
    const xorshifted = Number(((oldState >> 18n) ^ oldState) >> 27n) >>> 0;
    const rot = Number(oldState >> 59n);

    // Rotate right by rot bits (32-bit rotation)
    return ((xorshifted >>> rot) | (xorshifted << ((32 - rot) & 31))) >>> 0;
  }

  /**
   * Generate a random float in [0, 1)
   */
  random(): number {
    return this.nextU32() / 4294967296;
  }

  /**
   * Generate a random integer in [0, max)
   */
  randomInt(max: number): number {
    return Math.floor(this.random() * max);
  }

  /**
   * Generate exponentially distributed random variable
   * Used for Poisson process inter-arrival times and M/M/c service times
   */
  exponential(rate: number): number {
    // Use 1 - random() to avoid log(0)
    let u = this.random();
    while (u === 0) u = this.random();
    return -Math.log(u) / rate;
  }

  /**
   * Generate normally distributed random variable using Box-Muller transform
   */
  normal(mean: number = 0, stddev: number = 1): number {
    let u1 = this.random();
    let u2 = this.random();

    // Avoid log(0)
    while (u1 === 0) u1 = this.random();

    // Box-Muller transform
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    return mean + stddev * z0;
  }

  /**
   * Generate lognormally distributed random variable
   * Parameters: mu and sigma of the underlying normal distribution
   */
  lognormal(mu: number, sigma: number): number {
    const z = this.normal(0, 1);
    return Math.exp(mu + sigma * z);
  }

  /**
   * Generate Poisson distributed random variable
   * Used for counting arrivals in a time interval
   */
  poisson(lambda: number): number {
    if (lambda < 30) {
      // Direct method for small lambda (Knuth algorithm)
      const L = Math.exp(-lambda);
      let k = 0;
      let p = 1;

      do {
        k++;
        p *= this.random();
      } while (p > L);

      return k - 1;
    } else {
      // Normal approximation for large lambda
      return Math.max(0, Math.round(this.normal(lambda, Math.sqrt(lambda))));
    }
  }

  /**
   * Clone the RNG with current state
   */
  clone(): PCG64 {
    const clone = Object.create(PCG64.prototype);
    clone.state = this.state;
    clone.inc = this.inc;
    return clone;
  }
}
