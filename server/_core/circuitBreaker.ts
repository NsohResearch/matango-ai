/**
 * Circuit Breaker Pattern Implementation
 * 
 * Protects external API calls from cascading failures.
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit tripped, requests fail fast
 * - HALF_OPEN: Testing if service recovered
 */

interface CircuitState {
  failures: number;
  successes: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  successThreshold: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 30000, // 30 seconds
  successThreshold: 2,
};

const circuits = new Map<string, CircuitState>();
const configs = new Map<string, CircuitBreakerConfig>();

/**
 * Configure a circuit breaker for a specific service
 */
export function configureCircuit(name: string, config: Partial<CircuitBreakerConfig>) {
  configs.set(name, { ...DEFAULT_CONFIG, ...config });
}

/**
 * Get the current state of a circuit
 */
export function getCircuitState(name: string): CircuitState {
  return circuits.get(name) || {
    failures: 0,
    successes: 0,
    lastFailure: 0,
    state: 'closed',
  };
}

/**
 * Check if a circuit is currently open (blocking requests)
 */
export function isCircuitOpen(name: string): boolean {
  const circuit = getCircuitState(name);
  const config = configs.get(name) || DEFAULT_CONFIG;
  
  if (circuit.state === 'open') {
    // Check if recovery timeout has passed
    if (Date.now() - circuit.lastFailure > config.recoveryTimeout) {
      circuit.state = 'half-open';
      circuit.successes = 0;
      circuits.set(name, circuit);
      return false;
    }
    return true;
  }
  
  return false;
}

/**
 * Record a successful call
 */
export function recordSuccess(name: string) {
  const circuit = getCircuitState(name);
  const config = configs.get(name) || DEFAULT_CONFIG;
  
  circuit.successes++;
  
  if (circuit.state === 'half-open' && circuit.successes >= config.successThreshold) {
    // Service recovered, close the circuit
    circuit.state = 'closed';
    circuit.failures = 0;
    circuit.successes = 0;
  } else if (circuit.state === 'closed') {
    // Reset failure count on success
    circuit.failures = 0;
  }
  
  circuits.set(name, circuit);
}

/**
 * Record a failed call
 */
export function recordFailure(name: string) {
  const circuit = getCircuitState(name);
  const config = configs.get(name) || DEFAULT_CONFIG;
  
  circuit.failures++;
  circuit.lastFailure = Date.now();
  circuit.successes = 0;
  
  if (circuit.state === 'half-open') {
    // Failed during recovery, reopen circuit
    circuit.state = 'open';
  } else if (circuit.failures >= config.failureThreshold) {
    // Threshold reached, open circuit
    circuit.state = 'open';
  }
  
  circuits.set(name, circuit);
}

/**
 * Wrap an async function with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  fallback?: () => T | Promise<T>
): Promise<T> {
  // Check if circuit is open
  if (isCircuitOpen(name)) {
    if (fallback) {
      return fallback();
    }
    throw new CircuitBreakerError(name, 'Circuit breaker is open');
  }
  
  try {
    const result = await fn();
    recordSuccess(name);
    return result;
  } catch (error) {
    recordFailure(name);
    throw error;
  }
}

/**
 * Custom error for circuit breaker failures
 */
export class CircuitBreakerError extends Error {
  public readonly circuitName: string;
  
  constructor(circuitName: string, message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.circuitName = circuitName;
  }
}

// Pre-configure circuits for known services
configureCircuit('forge-llm', { failureThreshold: 5, recoveryTimeout: 30000 });
configureCircuit('forge-image', { failureThreshold: 3, recoveryTimeout: 60000 });
configureCircuit('forge-video', { failureThreshold: 2, recoveryTimeout: 120000 });
configureCircuit('social-twitter', { failureThreshold: 5, recoveryTimeout: 30000 });
configureCircuit('social-linkedin', { failureThreshold: 5, recoveryTimeout: 30000 });
configureCircuit('social-instagram', { failureThreshold: 5, recoveryTimeout: 30000 });
configureCircuit('social-facebook', { failureThreshold: 5, recoveryTimeout: 30000 });
configureCircuit('social-tiktok', { failureThreshold: 5, recoveryTimeout: 30000 });
