"use client";

import { DeltaWindow } from "./delta-window";

export type DeltaReadmeDetails = {
  about?: string;
  status: string;
  statusOpen?: boolean;
  chain: string;
  entries: string;
  spots?: string;
  winChance?: string;
  supply?: string;
  mintPrice?: string;
  dropDate?: string;
  usedFor?: string;
  artist: string;
  artistUrl?: string | null;
  eligibleCollections?: string[];
};

type DeltaReadmeProps = {
  details: DeltaReadmeDetails;
  inactive?: boolean;
};

export function DeltaReadme({ details, inactive = true }: DeltaReadmeProps) {
  const {
    about,
    status,
    statusOpen = true,
    chain,
    entries,
    spots,
    winChance,
    supply = "TBA",
    mintPrice = "TBA",
    dropDate = "TBA",
    usedFor = "SELECT DROPS",
    artist,
    artistUrl,
    eligibleCollections = [],
  } = details;

  return (
    <DeltaWindow title="README.TXT - Notepad" icon="txt" inactive={inactive}>
      <div className="al-readme-menu" aria-hidden="true">
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
      <div className="al-readme-body">
        <h3>== ABOUT ==</h3>
        {about ? <p>{about}</p> : null}

        <h3>== DETAILS ==</h3>
        <div className="al-kv">
          <span>STATUS</span>
          <span>
            <span className={`al-status-dot${statusOpen ? "" : " al-closed"}`} aria-hidden="true" />
            {status}
          </span>
        </div>
        <div className="al-kv">
          <span>CHAIN</span>
          <span>{chain}</span>
        </div>
        <div className="al-kv">
          <span>ENTRIES</span>
          <span>{entries}</span>
        </div>
        {spots ? (
          <div className="al-kv">
            <span>SPOTS</span>
            <span>{spots}</span>
          </div>
        ) : null}
        {winChance ? (
          <div className="al-kv">
            <span>WIN CHANCE</span>
            <span>{winChance}</span>
          </div>
        ) : null}
        <div className="al-kv">
          <span>SUPPLY</span>
          <span>{supply}</span>
        </div>
        <div className="al-kv">
          <span>MINT PRICE</span>
          <span>{mintPrice}</span>
        </div>
        <div className="al-kv">
          <span>DROP DATE</span>
          <span>{dropDate}</span>
        </div>
        <div className="al-kv">
          <span>USED FOR</span>
          <span>{usedFor}</span>
        </div>
        <div className="al-kv">
          <span>BY</span>
          <span>
            {artistUrl ? (
              <a href={artistUrl} target="_blank" rel="noopener noreferrer">
                {artist}
              </a>
            ) : (
              artist
            )}
          </span>
        </div>

        {eligibleCollections.length > 0 ? (
          <div className="al-collections">
            <strong>ELIGIBLE COLLECTIONS</strong>
            <ul>
              {eligibleCollections.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </DeltaWindow>
  );
}
