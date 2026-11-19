// Spaced repetition: a right answer stretches the interval by the card's
// ease, a wrong one brings the question back now and lowers the ease.
interface CardState {
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
}

export const NEW_CARD: CardState = {
  ease: 2.5,
  intervalDays: 0,
  reps: 0,
  lapses: 0,
};
export const MASTERED_DAYS = 21;
const DAY = 24 * 60 * 60 * 1000;

export function schedule(
  card: CardState,
  correct: boolean,
  now: number,
): CardState & { dueAt: number } {
  if (!correct) {
    return {
      ease: Math.max(1.3, round(card.ease - 0.2)),
      intervalDays: 0,
      reps: 0,
      lapses: card.lapses + 1,
      dueAt: now,
    };
  }
  const reps = card.reps + 1;
  const intervalDays =
    reps === 1 ? 1 : reps === 2 ? 3 : Math.round(card.intervalDays * card.ease);
  return {
    ease: Math.min(3, round(card.ease + 0.1)),
    intervalDays,
    reps,
    lapses: card.lapses,
    dueAt: now + intervalDays * DAY,
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/** Whether the chosen set matches the correct set exactly. */
export function isRightAnswer(selected: string[], correctIds: string[]) {
  const picked = new Set(selected);
  return (
    picked.size === correctIds.length &&
    correctIds.every((id) => picked.has(id))
  );
}
