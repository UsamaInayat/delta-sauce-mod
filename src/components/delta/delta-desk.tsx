"use client";

import { useCallback, useId, useRef, useState } from "react";

const PARTY_LINES = [
  "That was easy.",
  "Good luck!",
  "Nice press.",
  "One more time?",
  "Certified easy.",
];

const CONFETTI_COLORS = ["#d62838", "#ffcd3c", "#3c82dc", "#d431b8", "#7de0ff"];

export function DeltaDesk() {
  const bubbleId = useId();
  const pressCountRef = useRef(0);
  const talkTimerRef = useRef<number | null>(null);
  const [pressed, setPressed] = useState(false);
  const [talking, setTalking] = useState(false);
  const [bubbleText, setBubbleText] = useState(PARTY_LINES[0]);

  const burstConfetti = useCallback(() => {
    const screen = document.querySelector(".arena-portfolio-wrapper .al-desktop");
    if (!screen) return;

    let host = screen.querySelector(".al-confetti");
    if (!host) {
      host = document.createElement("div");
      host.className = "al-confetti";
      host.setAttribute("aria-hidden", "true");
      screen.appendChild(host);
    }

    for (let i = 0; i < 16; i++) {
      const bit = document.createElement("span");
      bit.style.cssText =
        `left:${5 + Math.random() * 90}%;` +
        `background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};` +
        `animation-duration:${2.2 + Math.random() * 1.8}s;` +
        `animation-delay:${Math.random() * 0.35}s;` +
        `width:${6 + Math.random() * 4}px;height:${9 + Math.random() * 5}px;`;
      host.appendChild(bit);
      window.setTimeout(() => bit.remove(), 4600);
    }
  }, []);

  function handleEasyPress() {
    setPressed(true);
    window.setTimeout(() => setPressed(false), 140);

    setBubbleText(PARTY_LINES[pressCountRef.current % PARTY_LINES.length]);
    pressCountRef.current += 1;

    setTalking(true);
    if (talkTimerRef.current) {
      window.clearTimeout(talkTimerRef.current);
    }
    talkTimerRef.current = window.setTimeout(() => setTalking(false), 1700);

    burstConfetti();
  }

  return (
    <div className="al-desk">
      <div className="al-keyboard" aria-hidden="true">
        <div className="al-keys" />
        <div className="al-spacebar" />
      </div>
      <div className="al-mousepad" aria-hidden="true">
        <div className="al-mouse" />
      </div>
      <div className="al-mug" aria-hidden="true" />
      <div className="al-tray" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="al-pencup" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <button
        type="button"
        className={`al-easy${pressed ? " al-pressed" : ""}${talking ? " al-talking" : ""}`}
        aria-label="That was easy button"
        onClick={handleEasyPress}
      >
        <span className="al-easy-shadow" aria-hidden="true" />
        <span className="al-easy-base" aria-hidden="true" />
        <span className="al-easy-dome" aria-hidden="true">
          easy
        </span>
        <span className="al-easy-bubble" id={bubbleId}>
          {bubbleText}
        </span>
      </button>
      <span className="al-leg al-leg-left" aria-hidden="true" />
      <span className="al-leg al-leg-right" aria-hidden="true" />
    </div>
  );
}
