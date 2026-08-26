export function gateFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    cache: init?.cache ?? "no-store",
    credentials: "include",
  });
}
