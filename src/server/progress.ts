import { and, asc, desc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  answers,
  attempts,
  courses,
  exams,
  modules,
  questions,
  reviewCards,
  sources,
} from "@/db/schema";
import { scopeQuestionIds } from "./bank";
import { MASTERED_DAYS } from "./srs";
import type { Viewer } from "./viewer";

const id = z.string().min(1).max(100);
export const statsInput = z
  .object({ sourceId: id.optional(), moduleId: id.optional() })
  .strict();

/** The member's own totals. */
export async function getStats(
  viewer: Viewer,
  input: z.infer<typeof statsInput>,
) {
  const mine = eq(reviewCards.userId, viewer.id);
  const [totals] = await db
    .select({
      answered: sql<number>`count(*)`.mapWith(Number),
      right: sql<number>`coalesce(sum(${reviewCards.lastCorrect}), 0)`.mapWith(
        Number,
      ),
      due: sql<number>`coalesce(sum(${reviewCards.dueAt} <= ${Date.now()}), 0)`.mapWith(
        Number,
      ),
      mastered:
        sql<number>`coalesce(sum(${reviewCards.intervalDays} >= ${MASTERED_DAYS}), 0)`.mapWith(
          Number,
        ),
    })
    .from(reviewCards)
    .where(mine);
  const perModule = await db
    .select({
      id: modules.id,
      name: modules.name,
      sourceName: sources.name,
      total: sql<number>`count(${questions.id})`.mapWith(Number),
      answered: sql<number>`count(${reviewCards.questionId})`.mapWith(Number),
      right: sql<number>`coalesce(sum(${reviewCards.lastCorrect}), 0)`.mapWith(
        Number,
      ),
    })
    .from(modules)
    .innerJoin(sources, eq(sources.id, modules.sourceId))
    .leftJoin(courses, eq(courses.moduleId, modules.id))
    .leftJoin(questions, eq(questions.courseId, courses.id))
    .leftJoin(reviewCards, and(eq(reviewCards.questionId, questions.id), mine))
    .groupBy(modules.id)
    .orderBy(asc(sources.name), asc(modules.position));
  const scoped = scopeQuestionIds(input);
  const [{ inScope }] = await db
    .select({ inScope: sql<number>`count(*)`.mapWith(Number) })
    .from(scoped.as("scoped"));
  const [{ answeredInScope }] = await db
    .select({ answeredInScope: sql<number>`count(*)`.mapWith(Number) })
    .from(reviewCards)
    .where(and(mine, inArray(reviewCards.questionId, scopeQuestionIds(input))));
  const examHistory = await db
    .select({
      id: attempts.id,
      title: exams.title,
      submittedAt: attempts.submittedAt,
      score: attempts.score,
      total: attempts.total,
    })
    .from(attempts)
    .innerJoin(exams, eq(exams.id, attempts.examId))
    .where(and(eq(attempts.userId, viewer.id), isNotNull(attempts.submittedAt)))
    .orderBy(asc(attempts.submittedAt));
  return {
    answered: totals?.answered ?? 0,
    right: totals?.right ?? 0,
    due: totals?.due ?? 0,
    mastered: totals?.mastered ?? 0,
    learning: (totals?.answered ?? 0) - (totals?.mastered ?? 0),
    remaining: inScope - answeredInScope,
    modules: perModule.filter((m) => m.total > 0),
    exams: examHistory,
  };
}

/** Recent courses studied and exams taken, newest first, each with where to pick up. */
export async function getHistory(viewer: Viewer, limit = 30) {
  const studied = await db
    .select({
      courseId: courses.id,
      courseName: courses.name,
      moduleName: modules.name,
      sourceName: sources.name,
      at: sql<number>`max(${answers.answeredAt})`.mapWith(Number),
    })
    .from(answers)
    .innerJoin(questions, eq(questions.id, answers.questionId))
    .innerJoin(courses, eq(courses.id, questions.courseId))
    .innerJoin(modules, eq(modules.id, courses.moduleId))
    .innerJoin(sources, eq(sources.id, modules.sourceId))
    .where(eq(answers.userId, viewer.id))
    .groupBy(courses.id)
    .orderBy(desc(sql`max(${answers.answeredAt})`))
    .limit(limit);
  const courseIds = studied.map((c) => c.courseId);
  const progress = courseIds.length
    ? await db
        .select({
          courseId: questions.courseId,
          total: sql<number>`count(*)`.mapWith(Number),
          answered: sql<number>`count(${reviewCards.questionId})`.mapWith(
            Number,
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
        .where(inArray(questions.courseId, courseIds))
        .groupBy(questions.courseId)
    : [];
  const taken = await db
    .select({
      id: attempts.id,
      title: exams.title,
      startedAt: attempts.startedAt,
      submittedAt: attempts.submittedAt,
      deadlineAt: attempts.deadlineAt,
      score: attempts.score,
      total: attempts.total,
    })
    .from(attempts)
    .innerJoin(exams, eq(exams.id, attempts.examId))
    .where(eq(attempts.userId, viewer.id))
    .orderBy(desc(attempts.startedAt))
    .limit(limit);
  const now = Date.now();
  const items = [
    ...studied.map((c) => {
      const p = progress.find((row) => row.courseId === c.courseId);
      return {
        kind: "course" as const,
        id: c.courseId,
        title: c.courseName,
        context: `${c.sourceName} › ${c.moduleName}`,
        at: c.at,
        answered: p?.answered ?? 0,
        total: p?.total ?? 0,
      };
    }),
    ...taken.map((a) => ({
      kind: "exam" as const,
      id: a.id,
      title: a.title,
      context: "Exam",
      at: a.submittedAt ?? a.startedAt,
      open: !a.submittedAt && a.deadlineAt > now,
      score: a.score,
      total: a.total,
    })),
  ];
  return items.sort((a, b) => b.at - a.at).slice(0, limit);
}

export type HistoryItem = Awaited<ReturnType<typeof getHistory>>[number];

export async function dueCount(viewer: Viewer) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(reviewCards)
    .where(
      and(
        eq(reviewCards.userId, viewer.id),
        lte(reviewCards.dueAt, Date.now()),
      ),
    );
  return n;
}
