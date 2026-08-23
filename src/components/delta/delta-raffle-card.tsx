"use client";

import Link from "next/link";

export type DeltaRaffleCardData = {
  id: string;
  title: string;
  status: string;
  statusOpen?: boolean;
  chain: string;
  entries?: string;
  dropDate?: string;
  artist?: string;
  href: string;
};

type DeltaRaffleCardProps = {
  raffle: DeltaRaffleCardData;
};

export function DeltaRaffleCard({ raffle }: DeltaRaffleCardProps) {
  return (
    <Link href={raffle.href} className="al-raffle-card">
      <div className="al-titlebar">
        <span className="al-title-ico" aria-hidden="true" />
        <span className="al-title-text">{raffle.title}</span>
        <span className="al-title-btns" aria-hidden="true">
          <span className="al-tbtn">_</span>
          <span className="al-tbtn">□</span>
          <span className="al-tbtn">✕</span>
        </span>
      </div>
      <div className="al-raffle-card-body">
        <p className="al-raffle-card-title">{raffle.title}</p>
        <div className="al-raffle-card-meta">
          <span>
            <span
              className={`al-status-dot${raffle.statusOpen !== false ? "" : " al-closed"}`}
              aria-hidden="true"
            />{" "}
            {raffle.status}
          </span>
          <span>CHAIN: {raffle.chain}</span>
          {raffle.entries ? <span>ENTRIES: {raffle.entries}</span> : null}
          {raffle.dropDate ? <span>DROP: {raffle.dropDate}</span> : null}
          {raffle.artist ? <span>BY: {raffle.artist}</span> : null}
        </div>
      </div>
    </Link>
  );
}

type DeltaRaffleCardListProps = {
  raffles: DeltaRaffleCardData[];
};

export function DeltaRaffleCardList({ raffles }: DeltaRaffleCardListProps) {
  if (raffles.length === 0) return null;

  return (
    <div className="al-raffle-scroll" role="list">
      {raffles.map((raffle) => (
        <div key={raffle.id} role="listitem">
          <DeltaRaffleCard raffle={raffle} />
        </div>
      ))}
    </div>
  );
}
