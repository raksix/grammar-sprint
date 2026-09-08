/**
 * Minimal ambient declarations for the `bun test` runner globals.
 *
 * `bun test` injects `test` / `describe` / `expect` at runtime without an
 * import, but `tsc --noEmit` still needs their types. `@types/bun` is
 * intentionally NOT a dependency (keeps the static-export web app lean),
 * so this file declares exactly the matchers used in `*.test.ts`.
 * When a test needs a new matcher, extend `BunTestMatchers` here.
 */

declare function test(name: string, fn: () => void | Promise<void>): void;

declare function describe(name: string, fn: () => void): void;

interface BunTestMatchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toHaveLength(expected: number): void;
  toContain(expected: unknown): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toBeDefined(): void;
  toBeTruthy(): void;
  toThrow(expected?: unknown): void;
}

declare function expect(actual: unknown): BunTestMatchers;
