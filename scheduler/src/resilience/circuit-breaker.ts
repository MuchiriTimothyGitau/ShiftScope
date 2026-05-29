// Circuit breaker for external API calls (registry lookups, etc.)
// Prevents cascading failures when an upstream service is down.

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitConfig {
  failureThreshold: number;
  successThreshold: number;
  openTimeoutMs: number;
  halfOpenMaxRequests: number;
}

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  openTimeoutMs: 30_000,
  halfOpenMaxRequests: 2,
};

interface BreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  halfOpenRequests: number;
}

export class CircuitBreaker {
  private state: Map<string, BreakerState> = new Map();
  private config: CircuitConfig;

  constructor(config?: Partial<CircuitConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async call<T>(key: string, fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    const breaker = this.getOrCreate(key);

    if (breaker.state === 'open') {
      if (Date.now() - breaker.lastFailureTime >= this.config.openTimeoutMs) {
        breaker.state = 'half-open';
        breaker.halfOpenRequests = 0;
      } else {
        if (fallback) return fallback();
        throw new Error(`Circuit breaker open for ${key} — request blocked`);
      }
    }

    if (breaker.state === 'half-open') {
      if (breaker.halfOpenRequests >= this.config.halfOpenMaxRequests) {
        if (fallback) return fallback();
        throw new Error(`Circuit breaker half-open for ${key} — too many probe requests`);
      }
      breaker.halfOpenRequests++;
    }

    try {
      const result = await fn();
      this.onSuccess(key);
      return result;
    } catch (err) {
      this.onFailure(key);
      if (fallback) return fallback();
      throw err;
    }
  }

  private getOrCreate(key: string): BreakerState {
    if (!this.state.has(key)) {
      this.state.set(key, {
        state: 'closed',
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        halfOpenRequests: 0,
      });
    }
    return this.state.get(key)!;
  }

  private onSuccess(key: string): void {
    const breaker = this.getOrCreate(key);
    if (breaker.state === 'half-open') {
      breaker.successes++;
      if (breaker.successes >= this.config.successThreshold) {
        breaker.state = 'closed';
        breaker.failures = 0;
        breaker.successes = 0;
        console.log(`Circuit breaker for "${key}" closed — service recovered`);
      }
    } else {
      breaker.failures = 0;
    }
  }

  private onFailure(key: string): void {
    const breaker = this.getOrCreate(key);
    breaker.failures++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failures >= this.config.failureThreshold) {
      breaker.state = 'open';
      breaker.successes = 0;
      console.warn(`Circuit breaker for "${key}" OPENED — blocking requests for ${this.config.openTimeoutMs}ms`);
    }
  }

  getState(key: string): CircuitState {
    return this.getOrCreate(key).state;
  }

  getMetrics(key: string): { state: CircuitState; failures: number; successes: number } {
    const b = this.getOrCreate(key);
    return { state: b.state, failures: b.failures, successes: b.successes };
  }

  reset(key: string): void {
    this.state.delete(key);
  }

  resetAll(): void {
    this.state.clear();
  }
}

export const registryCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 3,
  openTimeoutMs: 60_000,
  halfOpenMaxRequests: 2,
});
