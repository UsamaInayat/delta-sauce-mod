"use client";

import { DeltaWindow } from "./delta-window";

export type DeltaWinnerRow = {
  id: string;
  xHandle: string;
};

type DeltaWinnersProps = {
  title: string;
  winners: DeltaWinnerRow[];
};

export function DeltaWinners({ title, winners }: DeltaWinnersProps) {
  return (
    <DeltaWindow title={title}>
      <div className="al-dialog-body">
        {winners.length === 0 ? (
          <p className="arena-form-sub">No winners were recorded for this raffle.</p>
        ) : (
          <>
            <p className="arena-form-sub">
              {winners.length === 1 ? "Winner" : `${winners.length} winners`}
            </p>
            <ul className="al-winner-list">
              {winners.map((winner) => (
                <li key={winner.id}>{winner.xHandle.replace(/^@/, "")}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </DeltaWindow>
  );
}
