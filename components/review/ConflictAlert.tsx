"use client";

import type { Id } from "@/convex/_generated/dataModel";

type Conflict = {
  field: string;
  values: string[];
  resolved: boolean;
  selectedValue?: string;
};

export function ConflictAlert({
  candidateId,
  conflicts,
  resolve,
}: {
  candidateId: Id<"candidates">;
  conflicts: Conflict[];
  resolve: (args: { candidateId: Id<"candidates">; field: "title" | "startAt" | "endAt" | "venue" | "city" | "status"; selectedValue: string }) => Promise<unknown>;
}) {
  const openConflicts = conflicts.filter((conflict) => !conflict.resolved);
  if (openConflicts.length === 0) return null;

  return (
    <section className="conflict-alert" aria-label="Source conflicts">
      <p className="section-kicker">Evidence conflict</p>
      <h3>Choose a supported value before approval.</h3>
      {openConflicts.map((conflict) => (
        <div className="conflict-choice" key={conflict.field}>
          <span>{conflict.field}</span>
          <div>
            {conflict.values.map((value) => (
              <button
                className="choice-button"
                key={value}
                onClick={() => resolve({ candidateId, field: conflict.field as "title" | "startAt" | "endAt" | "venue" | "city" | "status", selectedValue: value })}
              >
                Use “{value}”
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
