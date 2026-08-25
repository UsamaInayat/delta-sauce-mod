"use client";

import { useState } from "react";
import { DeltaRecycleBin } from "@/components/delta/delta-recycle-bin";
import { DeltaStackerGame } from "@/components/delta/delta-stacker-game";
import { DeltaVideosPlayer } from "@/components/delta/delta-videos-player";

const ALLOWLIST_URL = "https://deltasauceart.com/binary/allowlist";

export function DeltaRaffleDesktopIcons() {
  const [binOpen, setBinOpen] = useState(false);
  const [videosOpen, setVideosOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);

  return (
    <>
      <div className="al-raffle-shortcuts" aria-label="Desktop shortcuts">
        <div className="al-icon al-icon-static" aria-hidden="true">
          <span className="al-icon-img al-icon-computer" />
          <span className="al-icon-label">My Computer</span>
        </div>

        <button
          type="button"
          className="al-icon"
          title="Recycle Bin"
          onClick={() => setBinOpen(true)}
        >
          <span className="al-icon-img al-icon-bin" aria-hidden="true" />
          <span className="al-icon-label">Recycle Bin</span>
        </button>

        <a
          className="al-icon al-selected"
          href={ALLOWLIST_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="The Rolodex allowlist"
        >
          <span className="al-icon-img al-icon-exe-rolodex" aria-hidden="true" />
          <span className="al-icon-label">THEROLODEX.EXE</span>
        </a>

        <button type="button" className="al-icon" title="VIDEOS" onClick={() => setVideosOpen(true)}>
          <span className="al-icon-img al-icon-folderimg" aria-hidden="true" />
          <span className="al-icon-label">VIDEOS</span>
        </button>
      </div>

      <DeltaRecycleBin
        open={binOpen}
        onClose={() => setBinOpen(false)}
        onOpenGame={() => setGameOpen(true)}
      />
      <DeltaVideosPlayer open={videosOpen} onClose={() => setVideosOpen(false)} />
      <DeltaStackerGame open={gameOpen} onClose={() => setGameOpen(false)} />
    </>
  );
}
