import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  attemptAnswers,
  attempts,
  choices,
  courses,
  examQuestions,
  exams,
  modules,
  questions,
  sources,
} from "@/db/schema";
import { isRightAnswer } from "./srs";
import { cardUpsert } from "./study";
import { NotFound, rememberUser, requireAdmin, type Viewer } from "./viewer";

const id = z.string().min(1).max(100);
const minutes = z.number().int().min(1, "At least one minute").max(600);

export const pastExamInput = z
  .object({
    title: z.string().trim().min(1, "Give it a title").max(200),
    minutes,
  })
  .strict();
export const examQuestionsInput = z
  .object({ examId: id, questionIds: z.array(id).max(500) })
  .strict();
export const examIdInput = z.object({ examId: id }).strict();
export const attemptIdInput = z.object({ attemptId: id }).strict();
export const customExamInput = z
  .object({
    sourceIds: z.array(id).max(100),
    moduleIds: z.array(id).max(500),
    count: z.number().int().min(1, "At least one question").max(200),
    minutes,
  })
  .strict()
  .refine(
    (v) => v.sourceIds.length + v.moduleIds.length > 0,
    "Pick at least one source or module",
  );
export const saveAnswerInput = z
  .object({ attemptId: id, questionId: id, selected: z.array(id).max(10) })
  .strict();

export async function listExams(viewer: Viewer) {
  await finalizeExpired(viewer);
  const past = await db
    .select({
      id: exams.id,
      title: exams.title,
      minutes: exams.durationMinutes,
      questionCount:
        sql<number>`(select count(*) from exam_questions where exam_id = ${exams.id})`.mapWith(
          Number,
        ),
    })
    .from(exams)
    .where(eq(exams.kind, "past"))
    .orderBy(desc(exams.createdAt));
  const mine = await db
    .select({
      id: attempts.id,
      title: exams.title,
      kind: exams.kind,
      startedAt: attempts.startedAt,
      submittedAt: attempts.submittedAt,
      deadlineAt: attempts.deadlineAt,
      score: attempts.score,
      total: attempts.total,
    })
    .from(attempts)
    .innerJoin(exams, eq(exams.id, attempts.examId))
    .where(eq(attempts.userId, viewer.id))
    .orderBy(desc(attempts.startedAt));
  return { past, attempts: mine, canEdit: viewer.admin };
}

export async function createPastExam(
  viewer: Viewer,
  input: z.infer<typeof pastExamInput>,
) {
  requireAdmin(viewer);
  const examId = crypto.randomUUID();
  await db.insert(exams).values({
    id: examId,
    kind: "past",
    title: input.title,
    durationMinutes: input.minutes,
    createdAt: Date.now(),
  });
  return { id: examId };
}

export async function deletePastExam(
  viewer: Viewer,
  { examId }: z.infer<typeof examIdInput>,
) {
  requireAdmin(viewer);
  await db
    .delete(exams)
    .where(and(eq(exams.id, examId), eq(exams.kind, "past")));
}

async function pastExam(examId: string) {
  const [exam] = await db
    .select({
      id: exams.id,
      title: exams.title,
      minutes: exams.durationMinutes,
    })
    .from(exams)
    .where(and(eq(exams.id, examId), eq(exams.kind, "past")));
  if (!exam) throw new NotFound("Exam not found");
  return exam;
}

export async function getExamForEdit(
  viewer: Viewer,
  input: { examId: string; courseId?: string },
) {
  requireAdmin(viewer);
  const exam = await pastExam(input.examId);
  const included = await db
    .select({
      id: questions.id,
      stem: questions.stem,
      courseName: courses.name,
    })
    .from(examQuestions)
    .innerJoin(questions, eq(questions.id, examQuestions.questionId))
    .innerJoin(courses, eq(courses.id, questions.courseId))
    .where(eq(examQuestions.examId, input.examId))
    .orderBy(asc(examQuestions.position));
  const courseOptions = await db
    .select({
      id: courses.id,
      label: sql<string>`${sources.name} || ' › ' || ${modules.name} || ' › ' || ${courses.name}`,
    })
    .from(courses)
    .innerJoin(modules, eq(modules.id, courses.moduleId))
    .innerJoin(sources, eq(sources.id, modules.sourceId))
    .orderBy(asc(sources.name), asc(modules.position), asc(courses.position));
  const candidates = input.courseId
    ? await db
        .select({
          id: questions.id,
          stem: questions.stem,
          courseName: courses.name,
        })
        .from(questions)
        .innerJoin(courses, eq(courses.id, questions.courseId))
        .where(eq(questions.courseId, input.courseId))
        .orderBy(asc(questions.position))
    : [];
  return { exam, included, courseOptions, candidates };
}

export async function setExamQuestions(
  viewer: Viewer,
  input: z.infer<typeof examQuestionsInput>,
) {
  requireAdmin(viewer);
  await pastExam(input.examId);
  const ids = [...new Set(input.questionIds)];
  const statements = [
    db.delete(examQuestions).where(eq(examQuestions.examId, input.examId)),
    ...ids.map((questionId, position) =>
      db
        .insert(examQuestions)
        .values({ examId: input.examId, questionId, position }),
    ),
  ];
  await db.batch(statements as [(typeof statements)[0], ...typeof statements]);
}

export async function startPastAttempt(
  viewer: Viewer,
  { examId }: z.infer<typeof examIdInput>,
) {
  const exam = await pastExam(examId);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId));
  if (!n) throw new Error("This exam has no questions yet.");
  await rememberUser(viewer);
  const now = Date.now();
  const attemptId = crypto.randomUUID();
  await db.insert(attempts).values({
    id: attemptId,
    examId,
    userId: viewer.id,
    startedAt: now,
    deadlineAt: now + exam.minutes * 60_000,
    total: n,
  });
  return { attemptId };
}

export async function startCustomAttempt(
  viewer: Viewer,
  input: z.infer<typeof customExamInput>,
) {
  const conditions = [];
  if (input.moduleIds.length)
    conditions.push(inArray(modules.id, input.moduleIds));
  if (input.sourceIds.length)
    conditions.push(inArray(modules.sourceId, input.sourceIds));
  const picked = await db
    .select({
      id: questions.id,
      moduleName: modules.name,
      sourceName: sources.name,
    })
    .from(questions)
    .innerJoin(courses, eq(courses.id, questions.courseId))
    .innerJoin(modules, eq(modules.id, courses.moduleId))
    .innerJoin(sources, eq(sources.id, modules.sourceId))
    .where(or(...conditions))
    .orderBy(sql`random()`)
    .limit(input.count);
  if (!picked.length)
    throw new Error("There are no questions in that selection.");
  await rememberUser(viewer);
  const names = [...new Set(picked.map((q) => q.moduleName))];
  const title =
    names.length <= 3
      ? `Custom exam: ${names.join(", ")}`
      : `Custom exam: ${names.length} modules`;
  const now = Date.now();
  const examId = crypto.randomUUID();
  const attemptId = crypto.randomUUID();
  await db.batch([
    db.insert(exams).values({
      id: examId,
      kind: "custom",
      title,
      durationMinutes: input.minutes,
      ownerId: viewer.id,
      createdAt: now,
    }),
    ...picked.map((q, position) =>
      db.insert(examQuestions).values({ examId, questionId: q.id, position }),
    ),
    db.insert(attempts).values({
      id: attemptId,
      examId,
      userId: viewer.id,
      startedAt: now,
      deadlineAt: now + input.minutes * 60_000,
      total: picked.length,
    }),
  ]);
  return { attemptId };
}

async function ownAttempt(viewer: Viewer, attemptId: string) {
  const [attempt] = await db
    .select({
      id: attempts.id,
      examId: attempts.examId,
      title: exams.title,
      startedAt: attempts.startedAt,
      deadlineAt: attempts.deadlineAt,
      submittedAt: attempts.submittedAt,
      score: attempts.score,
      total: attempts.total,
    })
    .from(attempts)
    .innerJoin(exams, eq(exams.id, attempts.examId))
    .where(and(eq(attempts.id, attemptId), eq(attempts.userId, viewer.id)));
  if (!attempt) throw new NotFound("Exam attempt not found");
  return attempt;
}

/** Scores an attempt once, and moves the member's schedule for each answered question. */
async function finalize(
  viewer: Viewer,
  attempt: { id: string; examId: string; deadlineAt: number },
) {
  const sheet = await answerSheet(attempt.id, attempt.examId);
  const score = sheet.filter((q) => q.right).length;
  const now = Date.now();
  const [closed] = await db
    .update(attempts)
    .set({ submittedAt: Math.min(now, attempt.deadlineAt), score })
    .where(
      and(
        eq(attempts.id, attempt.id),
        eq(attempts.userId, viewer.id),
        isNull(attempts.submittedAt),
      ),
    )
    .returning({ id: attempts.id });
  if (!closed) return;
  const answered = sheet.filter((q) => q.selected.length);
  const wrapped = await Promise.all(
    answered.map((q) => cardUpsert(viewer.id, q.id, q.right, now)),
  );
  const statements = wrapped.map((w) => w.statement);
  if (statements.length)
    await db.batch(
      statements as [(typeof statements)[0], ...typeof statements],
    );
}

async function finalizeExpired(viewer: Viewer) {
  const open = await db
    .select({
      id: attempts.id,
      examId: attempts.examId,
      deadlineAt: attempts.deadlineAt,
    })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, viewer.id),
        isNull(attempts.submittedAt),
        sql`${attempts.deadlineAt} < ${Date.now()}`,
      ),
    );
  for (const attempt of open) await finalize(viewer, attempt);
}

async function answerSheet(attemptId: string, examId: string) {
  const list = await db
    .select({
      id: questions.id,
      stem: questions.stem,
      explanation: questions.explanation,
      examYear: questions.examYear,
      courseName: courses.name,
    })
    .from(examQuestions)
    .innerJoin(questions, eq(questions.id, examQuestions.questionId))
    .innerJoin(courses, eq(courses.id, questions.courseId))
    .where(eq(examQuestions.examId, examId))
    .orderBy(asc(examQuestions.position));
  const ids = list.map((q) => q.id);
  const allChoices = ids.length
    ? await db
        .select({
          id: choices.id,
          questionId: choices.questionId,
          text: choices.text,
          isCorrect: choices.isCorrect,
        })
        .from(choices)
        .where(inArray(choices.questionId, ids))
        .orderBy(asc(choices.position))
    : [];
  const saved = await db
    .select({
      questionId: attemptAnswers.questionId,
      selected: attemptAnswers.selected,
    })
    .from(attemptAnswers)
    .where(eq(attemptAnswers.attemptId, attemptId));
  return list.map((q) => {
    const own = allChoices.filter((c) => c.questionId === q.id);
    const selected = saved.find((s) => s.questionId === q.id)?.selected ?? [];
    const correctIds = own.filter((c) => c.isCorrect).map((c) => c.id);
    return {
      ...q,
      choices: own,
      selected,
      correctIds,
      right: selected.length > 0 && isRightAnswer(selected, correctIds),
    };
  });
}

/** An open attempt without its key, or a submitted one with its correction. */
export async function getAttempt(
  viewer: Viewer,
  { attemptId }: z.infer<typeof attemptIdInput>,
) {
  let attempt = await ownAttempt(viewer, attemptId);
  if (!attempt.submittedAt && Date.now() > attempt.deadlineAt) {
    await finalize(viewer, attempt);
    attempt = await ownAttempt(viewer, attemptId);
  }
  const sheet = await answerSheet(attempt.id, attempt.examId);
  if (!attempt.submittedAt) {
    return {
      state: "open" as const,
      attempt: {
        id: attempt.id,
        title: attempt.title,
        deadlineAt: attempt.deadlineAt,
        total: attempt.total,
      },
      now: Date.now(),
      questions: sheet.map((q) => ({
        id: q.id,
        stem: q.stem,
        examYear: q.examYear,
        choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
        selected: q.selected,
      })),
    };
  }
  return {
    state: "submitted" as const,
    attempt: {
      id: attempt.id,
      title: attempt.title,
      score: attempt.score ?? 0,
      total: attempt.total,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      timedOut: attempt.submittedAt >= attempt.deadlineAt,
    },
    questions: sheet.map((q) => ({
      id: q.id,
      stem: q.stem,
      examYear: q.examYear,
      explanation: q.explanation,
      choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
      selected: q.selected,
      correctIds: q.correctIds,
      right: q.right,
    })),
  };
}

export async function saveAttemptAnswer(
  viewer: Viewer,
  input: z.infer<typeof saveAnswerInput>,
) {
  const attempt = await ownAttempt(viewer, input.attemptId);
  if (attempt.submittedAt) throw new Error("This exam has been submitted.");
  if (Date.now() > attempt.deadlineAt) {
    await finalize(viewer, attempt);
    throw new Error("Time is up: the exam has been submitted.");
  }
  const [slot] = await db
    .select({ questionId: examQuestions.questionId })
    .from(examQuestions)
    .where(
      and(
        eq(examQuestions.examId, attempt.examId),
        eq(examQuestions.questionId, input.questionId),
      ),
    );
  if (!slot) throw new NotFound("Question not found");
  const valid = await db
    .select({ id: choices.id })
    .from(choices)
    .where(eq(choices.questionId, input.questionId));
  const selected = [...new Set(input.selected)];
  if (!selected.every((c) => valid.some((v) => v.id === c)))
    throw new Error("Unknown choice");
  if (!selected.length) {
    await db
      .delete(attemptAnswers)
      .where(
        and(
          eq(attemptAnswers.attemptId, attempt.id),
          eq(attemptAnswers.questionId, input.questionId),
        ),
      );
    return;
  }
  await db
    .insert(attemptAnswers)
    .values({ attemptId: attempt.id, questionId: input.questionId, selected })
    .onConflictDoUpdate({
      target: [attemptAnswers.attemptId, attemptAnswers.questionId],
      set: { selected },
    });
}

export async function submitAttempt(
  viewer: Viewer,
  { attemptId }: z.infer<typeof attemptIdInput>,
) {
  const attempt = await ownAttempt(viewer, attemptId);
  if (!attempt.submittedAt) await finalize(viewer, attempt);
}
