export function percent(part: number, whole: number) {
  return whole ? `${Math.round((part / whole) * 100)}%` : "–";
}

export function when(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "That didn't work.";
}
