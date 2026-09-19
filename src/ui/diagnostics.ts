// Captures console output and runtime errors into a ring buffer so a user can
// copy them for debugging. Install once at startup via `installDiagnostics()`.

interface LogEntry {
  level: "log" | "info" | "warn" | "error";
  msg: string;
}

const entries: LogEntry[] = [];
const MAX_ENTRIES = 500;

function stringify(value: unknown): string {
  if (value instanceof Error) return value.stack ?? value.message;
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// Benign babylon-mmd warnings we expect when a motion was made for a different
// model: missing IK solvers and morphs that don't exist on this model. Filtered
// from the diagnostics dump (still shown in the live console).
const NOISE_PATTERNS = [
  /Binding failed: bone .*ＩＫ not found/,
  /Binding failed: IK bone .* not found/,
  /Binding failed: runtime bone .*ＩＫ not found/,
  /Binding failed: morph .* not found/,
];

function isNoise(level: LogEntry["level"], msg: string): boolean {
  if (level !== "warn") return false;
  return NOISE_PATTERNS.some((pattern) => pattern.test(msg));
}

function capture(level: LogEntry["level"], args: unknown[]): void {
  const msg = args.map(stringify).join(" ");
  if (isNoise(level, msg)) return;
  entries.push({ level, msg });
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
}

/** Monkey-patches console and hooks uncaught errors so they land in the buffer. */
export function installDiagnostics(): void {
  for (const level of ["log", "info", "warn", "error"] as const) {
    const consoleAny = console as unknown as Record<string, (...args: unknown[]) => void>;
    const original = consoleAny[level]?.bind(console) ?? (() => undefined);
    consoleAny[level] = (...args: unknown[]) => {
      capture(level, args);
      original(...args);
    };
  }
  window.addEventListener("error", (event) => capture("error", [event.error ?? event.message]));
  window.addEventListener("unhandledrejection", (event) => capture("error", [event.reason]));
}

/** Returns the captured log as a single copy-paste-able text blob. */
export function diagnosticsDump(): string {
  const header = [
    "AO-Greenroom diagnostics",
    `time: ${new Date().toISOString()}`,
    `url: ${location.href}`,
    `ua: ${navigator.userAgent}`,
    "",
  ];
  const body = entries.map((e) => `[${e.level.toUpperCase()}] ${e.msg}`);
  return [...header, ...body].join("\n");
}
