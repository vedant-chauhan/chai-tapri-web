"use client";

import type { HoursDto, HoursWindowDto } from "./store-types";
import { useJson } from "./use-json";

const windowText = (w: HoursWindowDto) => `${w.opens}–${w.closes}`;
const dayText = (windows: HoursWindowDto[]) => (windows.length ? windows.map(windowText).join(", ") : "Closed");

function useHours() {
  return useJson<HoursDto>("/api/v1/store/hours", 300_000);
}

/** Weekly table with today highlighted, plus closures/special hours in the next 14 days. */
export function HoursTable() {
  const remote = useHours();
  if (remote.state === "loading") return <p>Loading opening hours…</p>;
  if (remote.state === "error") {
    return <p>Opening hours can&apos;t be loaded right now. Please check our Google listing or Instagram.</p>;
  }
  const { week, todayWeekday, upcoming } = remote.data;
  return (
    <div className="flex flex-col gap-6">
      <table className="w-full max-w-sm text-left tabular-nums">
        <caption className="sr-only">Opening hours</caption>
        <tbody>
          {week.map((d) => {
            const today = d.weekday === todayWeekday;
            return (
              <tr
                key={d.weekday}
                className={today ? "bg-surface" : undefined}
                aria-current={today ? "date" : undefined}
              >
                <th scope="row" className="py-1.5 pr-6 pl-2 font-semibold">
                  {d.day}
                  {today ? <span className="sr-only"> (today)</span> : null}
                </th>
                <td className="py-1.5 pr-2">{dayText(d.windows)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {upcoming.length > 0 ? (
        <div>
          <h3 className="font-semibold">Coming up</h3>
          <ul className="mt-1">
            {upcoming.map((e) => (
              <li key={e.date}>
                {e.dateLabel}: {e.kind === "closed" ? "Closed" : dayText(e.windows)}
                {e.note ? ` (${e.note})` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** "Today 11am–1am" for Home and the footer. */
export function TodayHours() {
  const remote = useHours();
  if (remote.state !== "ready") return <span>See opening hours</span>;
  const today = remote.data.week.find((d) => d.weekday === remote.data.todayWeekday);
  return <span>Today {today ? dayText(today.windows) : "—"}</span>;
}

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "Open till 1am on Fri & Sat", built from the real hours (nothing hard-coded). */
export function lateNightText(week: HoursDto["week"]): string | null {
  const late = week.filter((d) => d.windows.some((w) => w.closesNextDay));
  if (late.length === 0) return null;
  const closes = late[0].windows.find((w) => w.closesNextDay)!.closes;
  const days = late.map((d) => d.day).sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const list = days.length === 1 ? days[0] : `${days.slice(0, -1).join(", ")} & ${days.at(-1)}`;
  return `Open till ${closes} on ${list}.`;
}

export function LateNight({ fallback }: { fallback: string }) {
  const remote = useHours();
  const text = remote.state === "ready" ? lateNightText(remote.data.week) : null;
  return <>{text ?? fallback}</>;
}
