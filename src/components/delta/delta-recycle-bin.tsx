"use client";

import { useCallback, useEffect, useState } from "react";

const NOTES_BODY =
  "ideas that didn't make it:\n\n" +
  "- a page that just says \"no\"\n" +
  "- allowlist by handwriting analysis\n" +
  "- make the frog blink (too unsettling)\n" +
  "- charge people to join the list (bad)\n" +
  "- a second easy button, for hard things\n\n" +
  "keeping: the frog, the beige, the guy who never leaves.\n\n" +
  "ps. the spreadsheet in here isn't a spreadsheet.\n" +
  "if someone walks past, hit the BOSS button. you're welcome.";

type TrashItem = {
  name: string;
  type: "game" | "img" | "txt";
  body?: string;
};

const TRASH: TrashItem[] = [
  { name: "Q3_expenses_FINAL.xls", type: "game" },
  { name: "hang_in_there_v1.jpg", type: "img" },
  { name: "notes.txt", type: "txt", body: NOTES_BODY },
];

type DeltaRecycleBinProps = {
  open: boolean;
  onClose: () => void;
  onOpenGame: () => void;
};

export function DeltaRecycleBin({ open, onClose, onOpenGame }: DeltaRecycleBinProps) {
  const [fileOpen, setFileOpen] = useState(false);
  const [fileTitle, setFileTitle] = useState("Untitled");
  const [fileBody, setFileBody] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"txt" | "img">("txt");

  const closeFile = useCallback(() => setFileOpen(false), []);

  const openFile = useCallback(
    (item: TrashItem) => {
      if (item.type === "game") {
        onClose();
        onOpenGame();
        return;
      }

      setFileTitle(
        `${item.name} - ${item.type === "img" ? "Image Preview" : "Notepad"}`,
      );
      setFileType(item.type === "img" ? "img" : "txt");
      setFileBody(item.type === "img" ? item.name : (item.body ?? ""));
      setFileOpen(true);
    },
    [onClose, onOpenGame],
  );

  useEffect(() => {
    if (!open && !fileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (fileOpen) closeFile();
      else onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeFile, fileOpen, onClose, open]);

  if (!open && !fileOpen) return null;

  return (
    <>
      {open ? (
        <div
          className="al-player-overlay open"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <div className="al-win al-binwin" role="dialog" aria-label="Recycle Bin">
            <div className="al-titlebar">
              <span className="al-title-ico" aria-hidden="true" />
              <span className="al-title-text">Recycle Bin</span>
              <span className="al-title-btns">
                <span className="al-tbtn">_</span>
                <span className="al-tbtn">&#9633;</span>
                <button
                  type="button"
                  className="al-tbtn"
                  aria-label="Close"
                  onClick={onClose}
                >
                  &#10005;
                </button>
              </span>
            </div>
            <div className="al-readme-menu">
              <span>
                <u>F</u>ile
              </span>
              <span>
                <u>E</u>dit
              </span>
              <span>
                <u>V</u>iew
              </span>
              <span>
                <u>H</u>elp
              </span>
            </div>
            <div className="al-bin-body">
              {TRASH.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className="al-bin-item"
                  onClick={() => openFile(item)}
                >
                  <span
                    className={`al-bin-ico${
                      item.type === "img"
                        ? " is-img"
                        : item.type === "game"
                          ? " is-xls"
                          : ""
                    }`}
                    aria-hidden="true"
                  />
                  <span className="al-bin-name">{item.name}</span>
                </button>
              ))}
            </div>
            <div className="al-bin-status">{TRASH.length} object(s)</div>
          </div>
        </div>
      ) : null}

      {fileOpen ? (
        <div
          className="al-player-overlay open"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeFile();
          }}
        >
          <div className="al-win al-filewin" role="dialog" aria-label="File">
            <div className="al-titlebar">
              <span className="al-title-ico al-ico-txt" aria-hidden="true" />
              <span className="al-title-text">{fileTitle}</span>
              <span className="al-title-btns">
                <span className="al-tbtn">_</span>
                <span className="al-tbtn">&#9633;</span>
                <button
                  type="button"
                  className="al-tbtn"
                  aria-label="Close"
                  onClick={closeFile}
                >
                  &#10005;
                </button>
              </span>
            </div>
            <div className="al-readme-menu">
              <span>
                <u>F</u>ile
              </span>
              <span>
                <u>E</u>dit
              </span>
              <span>
                <u>S</u>earch
              </span>
              <span>
                <u>H</u>elp
              </span>
            </div>
            <div className="al-file-body">
              {fileType === "img" ? (
                <div className="al-file-poster" aria-label={fileBody ?? "Poster"} />
              ) : (
                fileBody
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
