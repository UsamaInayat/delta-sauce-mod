"use client";

import { useCallback, useEffect, useState } from "react";

const VIDEO_POOL = [
  { id: "ZyhrYis509A", title: "" },
  { id: "ZZ5LpwO-An4", title: "" },
  { id: "0tdyU_gW6WE", title: "" },
  { id: "dQw4w9WgXcQ", title: "" },
];

type DeltaVideosPlayerProps = {
  open: boolean;
  onClose: () => void;
};

function pickVideo(lastIndex: number) {
  const pool = VIDEO_POOL.filter((v) => v.id);
  if (!pool.length) return { pick: null, index: -1 };
  if (pool.length === 1) return { pick: pool[0], index: 0 };

  let index = lastIndex;
  do {
    index = Math.floor(Math.random() * pool.length);
  } while (index === lastIndex);

  return { pick: pool[index], index };
}

export function DeltaVideosPlayer({ open, onClose }: DeltaVideosPlayerProps) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [trackLabel, setTrackLabel] = useState("untitled.avi");
  const lastIndexRef = { current: -1 };

  const close = useCallback(() => {
    setVideoId(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const { pick, index } = pickVideo(lastIndexRef.current);
    lastIndexRef.current = index;
    if (!pick) return;

    setVideoId(pick.id);
    setTrackLabel(pick.title || "untitled.avi");
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  if (!open) return null;

  return (
    <div
      className={`al-player-overlay${open ? " open" : ""}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="al-win al-player" role="dialog" aria-label="Media Player">
        <div className="al-titlebar">
          <span className="al-title-ico" aria-hidden="true" />
          <span className="al-title-text">VIDEOS - Media Player</span>
          <span className="al-title-btns">
            <span className="al-tbtn">_</span>
            <span className="al-tbtn">&#9633;</span>
            <button
              type="button"
              className="al-tbtn"
              aria-label="Close player"
              onClick={close}
            >
              &#10005;
            </button>
          </span>
        </div>
        <div className="al-player-screen">
          {videoId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="VIDEOS"
            />
          ) : null}
        </div>
        <div className="al-transport" aria-hidden="true">
          <span className="al-tp">&#9198;</span>
          <span className="al-tp">&#9654;</span>
          <span className="al-tp">&#9208;</span>
          <span className="al-tp">&#9197;</span>
          <span className="al-tp-track">track 01 · {trackLabel}</span>
        </div>
      </div>
    </div>
  );
}
