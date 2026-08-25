"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

const COLS = 10;
const ROWS = 18;

const SHAPES = {
  I: { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], scr: "#3cc8ff", glow: "rgba(60,200,255,0.6)" },
  O: { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], scr: "#ffd23c", glow: "rgba(255,210,60,0.55)" },
  T: { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], scr: "#d431b8", glow: "rgba(212,49,184,0.55)" },
  S: { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], scr: "#3cff6e", glow: "rgba(60,255,110,0.5)" },
  Z: { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], scr: "#ff5b45", glow: "rgba(255,91,69,0.55)" },
  J: { cells: [[0, 0], [0, 1], [1, 1], [2, 1]], scr: "#5a68e8", glow: "rgba(90,104,232,0.55)" },
  L: { cells: [[2, 0], [0, 1], [1, 1], [2, 1]], scr: "#ff9a3c", glow: "rgba(255,154,60,0.55)" },
} as const;

type ShapeKey = keyof typeof SHAPES;

type Piece = {
  key: ShapeKey;
  cells: number[][];
  x: number;
  y: number;
};

type DeltaStackerGameProps = {
  open: boolean;
  onClose: () => void;
};

function emptyGrid() {
  return Array.from({ length: ROWS }, () => Array<ShapeKey | null>(COLS).fill(null));
}

function useStackerSound(enabled: boolean) {
  const audioRef = useRef<{
    ac: AudioContext;
    master: GainNode;
    humOsc: OscillatorNode | null;
  } | null>(null);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ac = new Ctx();
    const master = ac.createGain();
    master.gain.value = enabled ? 0.5 : 0;
    master.connect(ac.destination);
    audioRef.current = { ac, master, humOsc: null };
    return audioRef.current;
  }, [enabled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.master.gain.value = enabled ? 0.5 : 0;
  }, [enabled]);

  const tone = useCallback(
    (freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) => {
      const audio = ensureAudio();
      if (!audio || !enabled) return;
      const { ac, master } = audio;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, ac.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(vol, ac.currentTime + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(ac.currentTime + dur + 0.02);
    },
    [enabled, ensureAudio],
  );

  const noise = useCallback(
    (dur: number, vol: number, filterHz: number) => {
      const audio = ensureAudio();
      if (!audio || !enabled) return;
      const { ac, master } = audio;
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const f = ac.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filterHz;
      const g = ac.createGain();
      g.gain.value = vol;
      src.connect(f);
      f.connect(g);
      g.connect(master);
      src.start();
    },
    [enabled, ensureAudio],
  );

  const humStart = useCallback(() => {
    const audio = ensureAudio();
    if (!audio || !enabled || audio.humOsc) return;
    const humOsc = audio.ac.createOscillator();
    const humGain = audio.ac.createGain();
    humOsc.type = "sine";
    humOsc.frequency.value = 15734;
    humGain.gain.value = 0.012;
    humOsc.connect(humGain);
    humGain.connect(audio.master);
    humOsc.start();
    audio.humOsc = humOsc;
  }, [enabled, ensureAudio]);

  const humStop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio?.humOsc) return;
    try {
      audio.humOsc.stop();
    } catch {
      // already stopped
    }
    audio.humOsc = null;
  }, []);

  const sfx = useMemo(
    () => ({
      move: () => tone(180, 0.035, "square", 0.1),
      rotate: () => tone(420, 0.06, "square", 0.12, 640),
      land: () => {
        tone(110, 0.09, "triangle", 0.22, 70);
        noise(0.05, 0.07, 900);
      },
      slam: () => {
        tone(90, 0.14, "sawtooth", 0.24, 55);
        noise(0.09, 0.12, 1400);
      },
      clear: (n: number) => {
        const base = 420;
        for (let i = 0; i < n; i++) {
          window.setTimeout(() => tone(base + i * 160, 0.12, "square", 0.18), i * 70);
        }
        if (n >= 4) window.setTimeout(() => tone(1320, 0.35, "sine", 0.2, 1980), 300);
      },
      level: () => {
        tone(660, 0.1, "square", 0.16);
        window.setTimeout(() => tone(880, 0.16, "square", 0.16), 110);
      },
      over: () => {
        humStop();
        tone(340, 0.9, "sawtooth", 0.22, 40);
        noise(0.7, 0.16, 700);
        window.setTimeout(() => tone(60, 0.3, "sine", 0.14, 30), 500);
      },
      boss: () => {
        noise(0.14, 0.16, 3000);
        tone(900, 0.05, "square", 0.08, 300);
      },
    }),
    [humStop, noise, tone],
  );

  return { sfx, humStart, humStop, ensureAudio };
}

export function DeltaStackerGame({ open, onClose }: DeltaStackerGameProps) {
  const keys = useMemo(() => Object.keys(SHAPES) as ShapeKey[], []);
  const [soundOn, setSoundOn] = useState(true);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [bossVisible, setBossVisible] = useState(false);
  const [grid, setGrid] = useState(() => emptyGrid());
  const [cur, setCur] = useState<Piece | null>(null);
  const [nextKey, setNextKey] = useState<ShapeKey | null>(null);
  const [startLabel, setStartLabel] = useState("Start");

  const dropMsRef = useRef(700);
  const timerRef = useRef<number | null>(null);
  const wasPlayingBeforeBossRef = useRef(false);
  const gridRef = useRef(grid);
  const scoreRef = useRef(score);
  const linesRef = useRef(lines);
  const playingRef = useRef(playing);
  const pausedRef = useRef(paused);
  const curRef = useRef(cur);
  const nextKeyRef = useRef(nextKey);
  const { sfx, humStart, humStop, ensureAudio } = useStackerSound(soundOn);

  gridRef.current = grid;
  scoreRef.current = score;
  linesRef.current = lines;
  playingRef.current = playing;
  pausedRef.current = paused;
  curRef.current = cur;
  nextKeyRef.current = nextKey;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const collides = useCallback((cells: number[][], x: number, y: number, board: Array<Array<ShapeKey | null>>) => {
    return cells.some(([px, py]) => {
      const nx = x + px;
      const ny = y + py;
      return nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx]);
    });
  }, []);

  const paintBoard = useCallback(
    (board: Array<Array<ShapeKey | null>>, piece: Piece | null) => {
      const view = board.map((row) => [...row]);
      if (piece) {
        piece.cells.forEach(([px, py]) => {
          const ny = piece.y + py;
          const nx = piece.x + px;
          if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
            view[ny][nx] = piece.key;
          }
        });
      }
      gridRef.current = view;
      setGrid(view);
    },
    [],
  );

  const spawn = useCallback(
    (board: Array<Array<ShapeKey | null>>, upcoming: ShapeKey | null) => {
      const key = upcoming ?? keys[Math.floor(Math.random() * keys.length)];
      const next = keys[Math.floor(Math.random() * keys.length)];
      const piece: Piece = {
        key,
        cells: SHAPES[key].cells.map(([x, y]) => [x, y]),
        x: 3,
        y: 0,
      };

      if (collides(piece.cells, piece.x, piece.y, board)) {
        return { ok: false as const, next };
      }

      setCur(piece);
      curRef.current = piece;
      setNextKey(next);
      nextKeyRef.current = next;
      paintBoard(board, piece);
      return { ok: true as const, next, piece };
    },
    [collides, keys, paintBoard],
  );

  const endGame = useCallback(
    (finalScore: number) => {
      sfx.over();
      setPlaying(false);
      setPaused(false);
      setGameOver(true);
      setScore(finalScore);
      setStartLabel("Start");
      stopTimer();
      humStop();
    },
    [humStop, sfx, stopTimer],
  );

  const clearLinesOnBoard = useCallback(
    (board: Array<Array<ShapeKey | null>>) => {
      let cleared = 0;
      const next = board.map((row) => [...row]);
      for (let r = ROWS - 1; r >= 0; r--) {
        if (next[r].every(Boolean)) {
          next.splice(r, 1);
          next.unshift(Array<ShapeKey | null>(COLS).fill(null));
          cleared++;
          r++;
        }
      }
      return { board: next, cleared };
    },
    [],
  );

  const lockPiece = useCallback(
    (board: Array<Array<ShapeKey | null>>, piece: Piece) => {
      sfx.land();
      const locked = board.map((row) => [...row]);
      piece.cells.forEach(([px, py]) => {
        const ny = piece.y + py;
        if (ny >= 0) locked[ny][piece.x + px] = piece.key;
      });

      const { board: clearedBoard, cleared } = clearLinesOnBoard(locked);
      let nextScore = scoreRef.current;
      let nextLines = linesRef.current;

      if (cleared) {
        sfx.clear(cleared);
        const beforeLevel = Math.floor(linesRef.current / 5);
        nextLines = linesRef.current + cleared;
        if (Math.floor(nextLines / 5) > beforeLevel) {
          window.setTimeout(() => sfx.level(), 260);
        }
        nextScore =
          scoreRef.current +
          ([0, 100, 300, 600, 1000][cleared] ?? cleared * 250);
        dropMsRef.current = Math.max(140, 700 - Math.floor(nextLines / 5) * 60);
        setLines(nextLines);
        setScore(nextScore);
      }

      setCur(null);
      curRef.current = null;
      const spawned = spawn(clearedBoard, nextKeyRef.current);
      if (!spawned.ok) {
        endGame(nextScore);
        return;
      }

      if (cleared) {
        stopTimer();
        timerRef.current = window.setInterval(() => {
          stepRef.current();
        }, dropMsRef.current);
      }
    },
    [clearLinesOnBoard, endGame, sfx, spawn, stopTimer],
  );

  const stepRef = useRef<() => void>(() => {});

  const step = useCallback(() => {
    const piece = curRef.current;
    if (!piece || !playingRef.current || pausedRef.current) return;

    const board = gridRef.current;
    if (!collides(piece.cells, piece.x, piece.y + 1, board)) {
      const moved = { ...piece, y: piece.y + 1 };
      curRef.current = moved;
      setCur(moved);
      paintBoard(board, moved);
      return;
    }

    lockPiece(board, piece);
  }, [collides, lockPiece, paintBoard]);

  stepRef.current = step;

  const move = useCallback(
    (dx: number) => {
      if (!playingRef.current || pausedRef.current) return;
      const piece = curRef.current;
      if (!piece) return;

      const board = gridRef.current;
      if (!collides(piece.cells, piece.x + dx, piece.y, board)) {
        const moved = { ...piece, x: piece.x + dx };
        curRef.current = moved;
        setCur(moved);
        paintBoard(board, moved);
        sfx.move();
      }
    },
    [collides, paintBoard, sfx],
  );

  const rotate = useCallback(() => {
    if (!playingRef.current || pausedRef.current) return;
    const piece = curRef.current;
    if (!piece || piece.key === "O") return;

    const board = gridRef.current;
    const maxY = Math.max(...piece.cells.map(([, y]) => y));
    const rotated = piece.cells.map(([x, y]) => [maxY - y, x]);
    for (let kick = 0; kick <= 2; kick++) {
      for (const dir of [1, -1]) {
        const nx = piece.x + kick * dir;
        if (!collides(rotated, nx, piece.y, board)) {
          const next = { ...piece, cells: rotated, x: nx };
          curRef.current = next;
          setCur(next);
          paintBoard(board, next);
          sfx.rotate();
          return;
        }
        if (kick === 0) break;
      }
    }
  }, [collides, paintBoard, sfx]);

  const slam = useCallback(() => {
    if (!playingRef.current || pausedRef.current) return;
    const piece = curRef.current;
    if (!piece) return;

    const board = gridRef.current;
    let dropped = { ...piece };
    while (!collides(dropped.cells, dropped.x, dropped.y + 1, board)) {
      dropped = { ...dropped, y: dropped.y + 1 };
    }
    sfx.slam();
    lockPiece(board, dropped);
  }, [collides, lockPiece, sfx]);

  const start = useCallback(() => {
    const fresh = emptyGrid();
    dropMsRef.current = 700;
    setScore(0);
    setLines(0);
    setGameOver(false);
    setPaused(false);
    setPlaying(true);
    playingRef.current = true;
    setStartLabel("Restart");
    setNextKey(null);
    nextKeyRef.current = null;
    setCur(null);
    curRef.current = null;
    setGrid(fresh);
    gridRef.current = fresh;
    ensureAudio();
    if (soundOn) humStart();
    stopTimer();

    const spawned = spawn(fresh, null);
    if (!spawned.ok) {
      endGame(0);
      return;
    }

    timerRef.current = window.setInterval(() => stepRef.current(), dropMsRef.current);
  }, [endGame, ensureAudio, humStart, soundOn, spawn, stopTimer]);

  const close = useCallback(() => {
    setPlaying(false);
    setPaused(false);
    setBossVisible(false);
    stopTimer();
    humStop();
    onClose();
  }, [humStop, onClose, stopTimer]);

  const bossOn = useCallback(() => {
    if (bossVisible) return;
    wasPlayingBeforeBossRef.current = playing && !paused;
    setPaused(true);
    humStop();
    sfx.boss();
    setBossVisible(true);
  }, [bossVisible, humStop, paused, playing, sfx]);

  const bossOff = useCallback(() => {
    setBossVisible(false);
    if (wasPlayingBeforeBossRef.current) {
      setPaused(false);
      if (soundOn) humStart();
    }
  }, [humStart, soundOn]);

  useEffect(() => {
    if (!open) return;
    paintBoard(grid, cur);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) {
      stopTimer();
      humStop();
      return;
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (!open) return;

      if (bossVisible) {
        if (event.key === "Escape" || event.key === "b" || event.key === "B") {
          event.preventDefault();
          bossOff();
        }
        return;
      }

      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key === "b" || event.key === "B") {
        event.preventDefault();
        bossOn();
        return;
      }
      if (!playing) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        rotate();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        stepRef.current();
      } else if (event.key === " ") {
        event.preventDefault();
        slam();
      } else if (event.key === "p" || event.key === "P") {
        setPaused((p) => !p);
      } else if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        setSoundOn((s) => !s);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [bossOff, bossOn, bossVisible, close, move, open, playing, rotate, slam, stopTimer, humStop]);

  useEffect(() => {
    try {
      setSoundOn(localStorage.getItem("ds-stacker-sound") !== "off");
    } catch {
      setSoundOn(true);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ds-stacker-sound", soundOn ? "on" : "off");
    } catch {
      // ignore
    }
    if (!soundOn) humStop();
    else if (playing && !paused && open) humStart();
  }, [humStart, humStop, open, paused, playing, soundOn]);

  if (!open) return null;

  const nextShape = nextKey ? SHAPES[nextKey] : null;

  return (
    <div
      className="al-player-overlay open"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="al-win al-gamewin" role="dialog" aria-label="Stacker">
        <div className="al-titlebar">
          <span className="al-title-ico" aria-hidden="true" />
          <span className="al-title-text">Q3_expenses_FINAL.xls — Spreadsheet</span>
          <span className="al-title-btns">
            <span className="al-tbtn">_</span>
            <span className="al-tbtn">&#9633;</span>
            <button type="button" className="al-tbtn" aria-label="Close" onClick={close}>
              &#10005;
            </button>
          </span>
        </div>
        <div className="al-readme-menu">
          <span>
            <u>G</u>ame
          </span>
          <span>
            <u>O</u>ptions
          </span>
          <span>
            <u>H</u>elp
          </span>
        </div>
        <div className="al-game-body">
          <div className="al-game-board">
            {Array.from({ length: ROWS * COLS }, (_, i) => {
              const r = Math.floor(i / COLS);
              const c = i % COLS;
              const key = grid[r][c];
              const style = key
                ? ({
                    ["--scr" as string]: SHAPES[key].scr,
                    ["--glow" as string]: SHAPES[key].glow,
                  } as React.CSSProperties)
                : undefined;
              return (
                <div key={i} className={key ? "al-cell on" : "al-cell"} style={style} />
              );
            })}
          </div>
          <div className="al-game-side">
            <div className="al-game-panel">
              <span className="al-game-lbl">NEXT</span>
              <div className="al-game-next">
                {nextShape
                  ? Array.from({ length: 8 }, (_, i) => {
                      const r = Math.floor(i / 4);
                      const c = i % 4;
                      const filled = nextShape.cells.some(([x, y]) => x === c && y === r);
                      const style = filled
                        ? ({
                            ["--scr" as string]: nextShape.scr,
                            ["--glow" as string]: nextShape.glow,
                          } as React.CSSProperties)
                        : undefined;
                      return (
                        <span key={i} className={filled ? "al-cell on" : "al-cell"} style={style} />
                      );
                    })
                  : null}
              </div>
            </div>
            <div className="al-game-panel">
              <span className="al-game-lbl">SCORE</span>
              <span className="al-game-val">{score}</span>
            </div>
            <div className="al-game-panel">
              <span className="al-game-lbl">LINES</span>
              <span className="al-game-val">{lines}</span>
            </div>
            <button type="button" className="al-btn al-game-btn" onClick={start}>
              {startLabel}
            </button>
            <button
              type="button"
              className="al-btn al-game-btn al-boss-btn"
              title="Hide immediately (or press B)"
              onClick={bossOn}
            >
              BOSS
            </button>
            <button
              type="button"
              className="al-btn al-game-btn"
              title="Sound on/off (or press M)"
              onClick={() => setSoundOn((s) => !s)}
            >
              {soundOn ? "🔊 ON" : "🔇 OFF"}
            </button>
            <p className="al-game-keys">
              ← → move
              <br />
              ↑ rotate
              <br />
              ↓ drop
              <br />
              SPACE slam
              <br />
              P pause
            </p>
          </div>
        </div>
        <div className="al-game-pad">
          <button type="button" onClick={() => move(-1)}>
            ◀
          </button>
          <button type="button" onClick={rotate}>
            ↻
          </button>
          <button type="button" onClick={() => move(1)}>
            ▶
          </button>
          <button type="button" onClick={step}>
            ▼
          </button>
        </div>
        <div
          className={`al-boss-screen${bossVisible ? " show" : ""}`}
          onClick={bossOff}
          onKeyDown={(event: ReactKeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") bossOff();
          }}
          role="button"
          tabIndex={0}
        >
          <div className="al-boss-bar">
            <span>Microsoft Excel — Q3_expenses_FINAL.xls</span>
          </div>
          <table className="al-boss-sheet">
            <tbody>
              <tr>
                <th />
                <th>A</th>
                <th>B</th>
                <th>C</th>
              </tr>
              <tr>
                <th>1</th>
                <td>Category</td>
                <td>Budget</td>
                <td>Actual</td>
              </tr>
              <tr>
                <th>2</th>
                <td>Printer toner</td>
                <td>1,200</td>
                <td>1,340</td>
              </tr>
              <tr>
                <th>3</th>
                <td>Coffee</td>
                <td>800</td>
                <td>2,180</td>
              </tr>
              <tr>
                <th>4</th>
                <td>Monitor repair</td>
                <td>450</td>
                <td>4,900</td>
              </tr>
              <tr>
                <th>5</th>
                <td>Fluorescent tubes</td>
                <td>300</td>
                <td>310</td>
              </tr>
              <tr>
                <th>6</th>
                <td>Motivational posters</td>
                <td>60</td>
                <td>60</td>
              </tr>
              <tr>
                <th>7</th>
                <td>
                  <strong>TOTAL</strong>
                </td>
                <td>
                  <strong>2,810</strong>
                </td>
                <td>
                  <strong>8,790</strong>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="al-boss-hint">click anywhere to resume</p>
        </div>
        <div className={`al-game-over${gameOver ? " show" : ""}`}>
          <span>SIGNAL LOST</span>
          <small>score {score}</small>
          <button type="button" className="al-btn" onClick={start}>
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
