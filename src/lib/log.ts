/**
 * Structured, PII-free logging: one JSON object per line.
 * Fields are limited to primitives and callers pass counts, ids, codes and
 * timings only. Never pass names, free text, request bodies or env values.
 */
export type LogLevel = "info" | "warn" | "error";

export interface LogEvent {
  readonly event: string;
  readonly level?: LogLevel;
  readonly [field: string]: string | number | boolean | undefined;
}

export type Logger = (event: LogEvent) => void;

/** Writes `event` as a single JSON line on the console channel for its level. */
export const logEvent: Logger = ({ level = "info", ...fields }) => {
  const line = JSON.stringify({ level, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
};
