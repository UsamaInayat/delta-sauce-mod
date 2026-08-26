"use client";

const PLATFORM_TAB_KEY = "ds_raffle_gate_tab_v1";

function raffleTabKey(slug: string) {
  return `ds_rp_tab_v1_${slug}`;
}

function read(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string) {
  try {
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // ignore quota / privacy mode errors
  }
}

function remove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function hasPlatformGateTabSession() {
  return read(PLATFORM_TAB_KEY) !== null;
}

export function markPlatformGateTabSession() {
  write(PLATFORM_TAB_KEY);
}

export function clearPlatformGateTabSession() {
  remove(PLATFORM_TAB_KEY);
}

export function hasRafflePasswordTabSession(slug: string) {
  return read(raffleTabKey(slug)) !== null;
}

export function markRafflePasswordTabSession(slug: string) {
  write(raffleTabKey(slug));
}

export function clearRafflePasswordTabSession(slug: string) {
  remove(raffleTabKey(slug));
}
