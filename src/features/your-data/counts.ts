import type { ImportCounts } from "@/lib/store/importFile";

const noun = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** "2 Life Stories, 3 Kits and 1 Session Log", in the words the Caregiver uses. */
export function describeCounts({ lifeStories, kits, sessionLogs }: ImportCounts): string {
  return `${noun(lifeStories, "Life Story", "Life Stories")}, ${noun(kits, "Kit", "Kits")} and ${noun(
    sessionLogs,
    "Session Log",
    "Session Logs",
  )}`;
}

type Records = Readonly<Record<string, readonly unknown[]>>;

/** What is on this device now, counted from the store. */
export function countsOf(state: {
  readonly lifeStories: readonly unknown[];
  readonly kits: Records;
  readonly sessionLogs: Records;
}): ImportCounts {
  const total = (record: Records) => Object.values(record).reduce((sum, items) => sum + items.length, 0);
  return { lifeStories: state.lifeStories.length, kits: total(state.kits), sessionLogs: total(state.sessionLogs) };
}
