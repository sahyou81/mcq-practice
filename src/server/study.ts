import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  lte,
  notInArray,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  answers,
  choices,
  courses,
  modules,
  questions,
  reviewCards,
  sources,
} from "@/db/schema";
import { scopeQuestionIds } from "./bank";
import { isRightAnswer, NEW_CARD, schedule } from "./srs";
import { NotFound, rememberUser, type Viewer } from "./viewer";

const id = z.string().min(1).max(100);

export const exploreInput = z
  .object({ sourceId: id.optional(), moduleId: id.optional() })
  .strict();
export const playerInput = z
  .object({ courseId: id, questionId: id.optional() })
  .strict();
export const answerInput = z
  .object({
    questionId: id,
    selected: z.array(id).min(1, "Pick at least one choice").max(10),
    mode: z.enum(["explore", "revise"]),
  })
  .strict();
export const dueInput = z
  .object({
    sourceId: id.optional(),
    moduleId: id.optional(),
    exclude: z.array(id).max(500).default([]),
  })
  .strict();

/** A question as a member sees it before answering: no key, no explanation. */
export async function questionForPlay(viewer: Viewer, questionId: string) {
  const [question] = await db
    .select({
      id: questions.id,
      stem: questions.stem,
      examYear: questions.examYear,
      courseId: courses.id,
      courseName: courses.name,
      moduleName: modules.name,
      sourceName: sources.name,
    })
    .from(questions)
    .innerJoin(courses, eq(courses.id, questions.courseId))
    .innerJoin(modules, eq(modules.id, courses.moduleId))
    .innerJoin(sources, eq(sources.id, modules.sourceId))
    .where(eq(questions.id, questionId));
  if (!question) throw new NotFound("Question not found");
  const list = await db
    .select({ id: choices.id, text: choices.text })
    .from(choices)
    .where(eq(choices.questionId, questionId))
    .orderBy(asc(choices.position));
  const [card] = await db
    .select({ at: reviewCards.lastAnsweredAt })
    .from(reviewCards)
    .where(
      and(
        eq(reviewCards.userId, viewer.id),
        eq(reviewCards.questionId, questionId),
      ),
    );
  return { ...question, choices: list, answeredBefore: Boolean(card) };
}

export type PlayQuestion = Awaited<ReturnType<typeof questionForPlay>>;

/** Progress per module and course of one source. */
export async function exploreOverview(
  viewer: Viewer,
  input: z.infer<typeof exploreInput>,
) {
  const sourceList = await db
    .select({ id: sources.id, name: sources.name })
    .from(sources)
    .orderBy(asc(sources.name));
  const sourceId =
    input.sourceId && sourceList.some((s) => s.id === input.sourceId)
      ? input.sourceId
      : sourceList[0]?.id;
  if (!sourceId)
    return {
      sources: sourceList,
      sourceId: null,
      moduleId: null,
      modules: [],
      allModules: [],
    };
  const rows = await db
    .select({
      moduleId: modules.id,
      moduleName: modules.name,
      courseId: courses.id,
      courseName: courses.name,
      total: sql<number>`count(${questions.id})`.mapWith(Number),
      answered: sql<number>`count(${reviewCards.questionId})`.mapWith(Number),
      right: sql<number>`coalesce(sum(${reviewCards.lastCorrect}), 0)`.mapWith(
        Number,
      ),
    })
    .from(modules)
    .leftJoin(courses, eq(courses.moduleId, modules.id))
    .leftJoin(questions, eq(questions.courseId, courses.id))
    .leftJoin(
      reviewCards,
      and(
        eq(reviewCards.questionId, questions.id),
        eq(reviewCards.userId, viewer.id),
      ),
    )
    .where(eq(modules.sourceId, sourceId))
    .groupBy(modules.id, courses.id)
    .orderBy(
      asc(modules.position),
      asc(modules.name),
      asc(courses.position),
      asc(courses.name),
    );
  const all: Array<{
    id: string;
    name: string;
    total: number;
    answered: number;
    right: number;
    courses: Array<{
      id: string;
      name: string;
      total: number;
      answered: number;
      right: number;
    }>;
  }> = [];
  for (const row of rows) {
    let mod = all.find((m) => m.id === row.moduleId);
    if (!mod)
      all.push(
        (mod = {
          id: row.moduleId,
          name: row.moduleName,
          total: 0,
          answered: 0,
          right: 0,
          courses: [],
        }),
      );
    if (!row.courseId) continue;
    mod.courses.push({
      id: row.courseId,
      name: row.courseName!,
      total: row.total,
      answered: row.answered,
      right: row.right,
    });
    mod.total += row.total;
    mod.answered += row.answered;
    mod.right += row.right;
  }
  const moduleId =
    input.moduleId && all.some((m) => m.id === input.moduleId)
      ? input.moduleId
      : null;
  return {
    sources: sourceList,
    sourceId,
    moduleId,
    allModules: all.map((m) => ({ id: m.id, name: m.name })),
    modules: moduleId ? all.filter((m) => m.id === moduleId) : all,
  };
}

/** The question to show in a course: the one asked for, else the first unanswered. */
export async function coursePlayer(
  viewer: Viewer,
  input: z.infer<typeof playerInput>,
) {
  const [course] = await db
    .select({
      id: courses.id,
      name: courses.name,
      moduleName: modules.name,
      sourceId: modules.sourceId,
    })
    .from(courses)
    .innerJoin(modules, eq(modules.id, courses.moduleId))
    .where(eq(courses.id, input.courseId));
  if (!course) throw new NotFound("Course not found");
  const list = await db
    .select({
      id: questions.id,
      answered: sql<number>`${reviewCards.questionId} is not null`.mapWith(
        Boolean,
      ),
    })
    .from(questions)
    .leftJoin(
      reviewCards,
      and(
        eq(reviewCards.questionId, questions.id),
        eq(reviewCards.userId, viewer.id),
      ),
    )
    .where(eq(questions.courseId, input.courseId))
    .orderBy(asc(questions.position), asc(questions.createdAt));
  const answeredCount = list.filter((q) => q.answered).length;
  let index = input.questionId
    ? list.findIndex((q) => q.id === input.questionId)
    : list.findIndex((q) => !q.answered);
  if (input.questionId && index < 0) throw new NotFound("Question not found");
  const base = {
    course,
    total: list.length,
    answeredCount,
    firstQuestionId: list[0]?.id ?? null,
  };
  if (index < 0)
    return { ...base, question: null, position: 0, nextQuestionId: null };
  return {
    ...base,
    question: await questionForPlay(viewer, list[index]!.id),
    position: index + 1,
    nextQuestionId: list[index + 1]?.id ?? null,
  };
}

/** Records an answer, reschedules the question and returns its correction. */
export async function submitAnswer(
  viewer: Viewer,
  input: z.infer<typeof answerInput>,
) {
  const key = await db
    .select({ id: choices.id, isCorrect: choices.isCorrect })
    .from(choices)
    .where(eq(choices.questionId, input.questionId));
  if (!key.length) throw new NotFound("Question not found");
  const selected = [...new Set(input.selected)];
  if (!selected.every((choiceId) => key.some((c) => c.id === choiceId)))
    throw new Error("Unknown choice");
  const correctIds = key.filter((c) => c.isCorrect).map((c) => c.id);
  const right = isRightAnswer(selected, correctIds);
  const now = Date.now();
  await rememberUser(viewer);
  await db.batch([
    (await cardUpsert(viewer.id, input.questionId, right, now)).statement,
    db.insert(answers).values({
      id: crypto.randomUUID(),
      userId: viewer.id,
      questionId: input.questionId,
      selected,
      isCorrect: right,
      mode: input.mode,
      answeredAt: now,
    }),
  ]);
  const [question] = await db
    .select({ explanation: questions.explanation })
    .from(questions)
    .where(eq(questions.id, input.questionId));
  return {
    right,
    correctIds,
    selected,
    explanation: question?.explanation ?? null,
  };
}

export type Correction = Awaited<ReturnType<typeof submitAnswer>>;

/** The statement that moves a member's schedule for one question. */
export async function cardUpsert(
  userId: string,
  questionId: string,
  right: boolean,
  now: number,
) {
  const [card] = await db
    .select()
    .from(reviewCards)
    .where(
      and(
        eq(reviewCards.userId, userId),
        eq(reviewCards.questionId, questionId),
      ),
    );
  const next = schedule(card ?? NEW_CARD, right, now);
  const values = { ...next, lastCorrect: right, lastAnsweredAt: now };
  // Wrapped: a bare query is thenable, and returning it would run it.
  return {
    statement: db
      .insert(reviewCards)
      .values({ userId, questionId, ...values })
      .onConflictDoUpdate({
        target: [reviewCards.userId, reviewCards.questionId],
        set: values,
      }),
  };
}

/** Questions due for revision in a scope, least mastered first. */
export async function dueForRevision(
  viewer: Viewer,
  input: z.infer<typeof dueInput>,
) {
  const now = Date.now();
  const scope =
    input.moduleId || input.sourceId
      ? inArray(reviewCards.questionId, scopeQuestionIds(input))
      : undefined;
  const base = and(
    eq(reviewCards.userId, viewer.id),
    lte(reviewCards.dueAt, now),
    scope,
  );
  const [{ due }] = await db
    .select({ due: sql<number>`count(*)`.mapWith(Number) })
    .from(reviewCards)
    .where(base);
  const [next] = await db
    .select({ questionId: reviewCards.questionId })
    .from(reviewCards)
    .where(
      and(
        base,
        input.exclude.length
          ? notInArray(reviewCards.questionId, input.exclude)
          : undefined,
      ),
    )
    .orderBy(
      asc(reviewCards.ease),
      desc(reviewCards.lapses),
      asc(reviewCards.dueAt),
    )
    .limit(1);
  const [upcoming] = await db
    .select({ at: reviewCards.dueAt })
    .from(reviewCards)
    .where(
      and(eq(reviewCards.userId, viewer.id), gt(reviewCards.dueAt, now), scope),
    )
    .orderBy(asc(reviewCards.dueAt))
    .limit(1);
  return {
    due,
    question: next ? await questionForPlay(viewer, next.questionId) : null,
    nextDueAt: upcoming?.at ?? null,
  };
}

export async function scopeOptions() {
  const rows = await db
    .select({
      sourceId: sources.id,
      sourceName: sources.name,
      moduleId: modules.id,
      moduleName: modules.name,
    })
    .from(sources)
    .leftJoin(modules, eq(modules.sourceId, sources.id))
    .orderBy(asc(sources.name), asc(modules.position), asc(modules.name));
  return rows;
}
