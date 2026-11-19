import { describe, expect, it } from "vitest";
import { isRightAnswer, NEW_CARD, schedule } from "./srs";

describe("schedule", () => {
  it("brings a wrong answer back now and lowers the ease", () => {
    const next = schedule(NEW_CARD, false, 1000);
    expect(next.dueAt).toBe(1000);
    expect(next.ease).toBeLessThan(NEW_CARD.ease);
    expect(next.lapses).toBe(1);
  });

  it("spaces right answers further apart each time", () => {
    const first = schedule(NEW_CARD, true, 0);
    const second = schedule(first, true, 0);
    const third = schedule(second, true, 0);
    expect(first.intervalDays).toBe(1);
    expect(second.intervalDays).toBe(3);
    expect(third.intervalDays).toBeGreaterThan(second.intervalDays);
  });

  it("returns a weak question sooner than a mastered one", () => {
    const weak = schedule(schedule(NEW_CARD, false, 0), true, 0);
    const strong = schedule(
      schedule(schedule(NEW_CARD, true, 0), true, 0),
      true,
      0,
    );
    expect(weak.dueAt).toBeLessThan(strong.dueAt);
  });
});

describe("isRightAnswer", () => {
  it("needs every correct choice and nothing else", () => {
    expect(isRightAnswer(["a", "b"], ["b", "a"])).toBe(true);
    expect(isRightAnswer(["a"], ["a", "b"])).toBe(false);
    expect(isRightAnswer(["a", "c"], ["a"])).toBe(false);
  });
});
