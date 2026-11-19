import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { choices, courses, modules, questions, sources } from "@/db/schema";
import { NotFound, requireAdmin, type Viewer } from "./viewer";

const name = z.string().trim().min(1, "Give it a name").max(200);
const id = z.string().min(1).max(100);

export const sourceInput = z
  .object({
    id: id.optional(),
    name,
    description: z.string().trim().max(500).optional(),
  })
  .strict();
export const moduleInput = z
  .object({ id: id.optional(), sourceId: id, name })
  .strict();
export const courseInput = z
  .object({ id: id.optional(), moduleId: id, name })
  .strict();
export const questionInput = z
  .object({
    id: id.optional(),
    courseId: id,
    stem: z.string().trim().min(1, "Write the question").max(5000),
    explanation: z.string().trim().max(5000).optional(),
    examYear: z.number().int().min(1900).max(2200).nullable().optional(),
    choices: z
      .array(
        z
          .object({
            text: z.string().trim().min(1, "Every choice needs text").max(1000),
            isCorrect: z.boolean(),
          })
          .strict(),
      )
      .min(2, "Give at least two choices")
      .max(10)
      .refine(
        (list) => list.some((c) => c.isCorrect),
        "Mark at least one choice correct",
      ),
  })
  .strict();
export const idInput = z.object({ id }).strict();

const questionCount = sql<number>`count(${questions.id})`.mapWith(Number);

export async function listSources() {
  return db
    .select({
      id: sources.id,
      name: sources.name,
      description: sources.description,
      questionCount,
    })
    .from(sources)
    .leftJoin(modules, eq(modules.sourceId, sources.id))
    .leftJoin(courses, eq(courses.moduleId, modules.id))
    .leftJoin(questions, eq(questions.courseId, courses.id))
    .groupBy(sources.id)
    .orderBy(asc(sources.name));
}

/** Every module and course in the bank with its question count. */
export async function getTree() {
  const rows = await db
    .select({
      sourceId: sources.id,
      sourceName: sources.name,
      moduleId: modules.id,
      moduleName: modules.name,
      courseId: courses.id,
      courseName: courses.name,
      questionCount,
    })
    .from(sources)
    .leftJoin(modules, eq(modules.sourceId, sources.id))
    .leftJoin(courses, eq(courses.moduleId, modules.id))
    .leftJoin(questions, eq(questions.courseId, courses.id))
    .groupBy(sources.id, modules.id, courses.id)
    .orderBy(
      asc(sources.name),
      asc(modules.position),
      asc(modules.name),
      asc(courses.position),
      asc(courses.name),
    );
  const tree: Array<{
    id: string;
    name: string;
    modules: Array<{
      id: string;
      name: string;
      courses: Array<{ id: string; name: string; questionCount: number }>;
    }>;
  }> = [];
  for (const row of rows) {
    let source = tree.find((s) => s.id === row.sourceId);
    if (!source)
      tree.push(
        (source = { id: row.sourceId, name: row.sourceName, modules: [] }),
      );
    if (!row.moduleId) continue;
    let mod = source.modules.find((m) => m.id === row.moduleId);
    if (!mod)
      source.modules.push(
        (mod = { id: row.moduleId, name: row.moduleName!, courses: [] }),
      );
    if (row.courseId)
      mod.courses.push({
        id: row.courseId,
        name: row.courseName!,
        questionCount: row.questionCount,
      });
  }
  return tree;
}

export async function getSource(sourceId: string) {
  const tree = await getTree();
  const source = tree.find((s) => s.id === sourceId);
  if (!source) throw new NotFound("Source not found");
  const [row] = await db
    .select({ description: sources.description })
    .from(sources)
    .where(eq(sources.id, sourceId));
  return { ...source, description: row?.description ?? null };
}

export async function getCourse(viewer: Viewer, courseId: string) {
  const [course] = await db
    .select({
      id: courses.id,
      name: courses.name,
      moduleName: modules.name,
      sourceId: sources.id,
      sourceName: sources.name,
    })
    .from(courses)
    .innerJoin(modules, eq(modules.id, courses.moduleId))
    .innerJoin(sources, eq(sources.id, modules.sourceId))
    .where(eq(courses.id, courseId));
  if (!course) throw new NotFound("Course not found");
  const list = await db
    .select({
      id: questions.id,
      stem: questions.stem,
      examYear: questions.examYear,
    })
    .from(questions)
    .where(eq(questions.courseId, courseId))
    .orderBy(asc(questions.position), asc(questions.createdAt));
  return { course, questions: list, canEdit: viewer.admin };
}

export async function saveSource(
  viewer: Viewer,
  input: z.infer<typeof sourceInput>,
) {
  requireAdmin(viewer);
  const values = { name: input.name, description: input.description || null };
  if (input.id) {
    await db.update(sources).set(values).where(eq(sources.id, input.id));
    return { id: input.id };
  }
  const newId = crypto.randomUUID();
  await db.insert(sources).values({ id: newId, ...values });
  return { id: newId };
}

export async function saveModule(
  viewer: Viewer,
  input: z.infer<typeof moduleInput>,
) {
  requireAdmin(viewer);
  if (input.id) {
    await db
      .update(modules)
      .set({ name: input.name })
      .where(
        and(eq(modules.id, input.id), eq(modules.sourceId, input.sourceId)),
      );
    return { id: input.id };
  }
  const newId = crypto.randomUUID();
  const [{ n }] = await db
    .select({ n: count() })
    .from(modules)
    .where(eq(modules.sourceId, input.sourceId));
  await db.insert(modules).values({
    id: newId,
    sourceId: input.sourceId,
    name: input.name,
    position: n + 1,
  });
  return { id: newId };
}

export async function saveCourse(
  viewer: Viewer,
  input: z.infer<typeof courseInput>,
) {
  requireAdmin(viewer);
  if (input.id) {
    await db
      .update(courses)
      .set({ name: input.name })
      .where(
        and(eq(courses.id, input.id), eq(courses.moduleId, input.moduleId)),
      );
    return { id: input.id };
  }
  const newId = crypto.randomUUID();
  const [{ n }] = await db
    .select({ n: count() })
    .from(courses)
    .where(eq(courses.moduleId, input.moduleId));
  await db.insert(courses).values({
    id: newId,
    moduleId: input.moduleId,
    name: input.name,
    position: n + 1,
  });
  return { id: newId };
}

export async function deleteSource(
  viewer: Viewer,
  { id }: z.infer<typeof idInput>,
) {
  requireAdmin(viewer);
  await db.delete(sources).where(eq(sources.id, id));
}
export async function deleteModule(
  viewer: Viewer,
  { id }: z.infer<typeof idInput>,
) {
  requireAdmin(viewer);
  await db.delete(modules).where(eq(modules.id, id));
}
export async function deleteCourse(
  viewer: Viewer,
  { id }: z.infer<typeof idInput>,
) {
  requireAdmin(viewer);
  await db.delete(courses).where(eq(courses.id, id));
}

/** A question with its key, for the admin editor only. */
export async function getQuestionForEdit(viewer: Viewer, questionId: string) {
  requireAdmin(viewer);
  const [question] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId));
  if (!question) throw new NotFound("Question not found");
  const list = await db
    .select({ text: choices.text, isCorrect: choices.isCorrect })
    .from(choices)
    .where(eq(choices.questionId, questionId))
    .orderBy(asc(choices.position));
  return {
    id: question.id,
    courseId: question.courseId,
    stem: question.stem,
    explanation: question.explanation ?? "",
    examYear: question.examYear,
    choices: list,
  };
}

export async function saveQuestion(
  viewer: Viewer,
  input: z.infer<typeof questionInput>,
) {
  requireAdmin(viewer);
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.id, input.courseId));
  if (!course) throw new NotFound("Course not found");
  const values = {
    stem: input.stem,
    explanation: input.explanation || null,
    examYear: input.examYear ?? null,
  };
  const questionId = input.id ?? crypto.randomUUID();
  const newChoices = input.choices.map((choice, position) => ({
    id: crypto.randomUUID(),
    questionId,
    text: choice.text,
    isCorrect: choice.isCorrect,
    position,
  }));
  if (input.id) {
    const [existing] = await db
      .select({ id: questions.id })
      .from(questions)
      .where(
        and(eq(questions.id, input.id), eq(questions.courseId, input.courseId)),
      );
    if (!existing) throw new NotFound("Question not found");
    await db.batch([
      db.update(questions).set(values).where(eq(questions.id, input.id)),
      db.delete(choices).where(eq(choices.questionId, input.id)),
      db.insert(choices).values(newChoices),
    ]);
  } else {
    const [{ n }] = await db
      .select({ n: count() })
      .from(questions)
      .where(eq(questions.courseId, input.courseId));
    await db.batch([
      db.insert(questions).values({
        id: questionId,
        courseId: input.courseId,
        position: n + 1,
        ...values,
      }),
      db.insert(choices).values(newChoices),
    ]);
  }
  return { id: questionId };
}

/** Removes the question; its choices, comments, schedules and exam slots go with it. */
export async function deleteQuestion(
  viewer: Viewer,
  { id }: z.infer<typeof idInput>,
) {
  requireAdmin(viewer);
  await db.delete(questions).where(eq(questions.id, id));
}

/** Question ids in a scope: a source, a module, or a course. */
export function scopeQuestionIds(scope: {
  sourceId?: string;
  moduleId?: string;
  courseId?: string;
}) {
  if (scope.courseId) {
    return db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.courseId, scope.courseId));
  }
  if (scope.moduleId) {
    return db
      .select({ id: questions.id })
      .from(questions)
      .where(
        inArray(
          questions.courseId,
          db
            .select({ id: courses.id })
            .from(courses)
            .where(eq(courses.moduleId, scope.moduleId)),
        ),
      );
  }
  if (scope.sourceId) {
    return db
      .select({ id: questions.id })
      .from(questions)
      .innerJoin(courses, eq(courses.id, questions.courseId))
      .innerJoin(modules, eq(modules.id, courses.moduleId))
      .where(eq(modules.sourceId, scope.sourceId));
  }
  return db.select({ id: questions.id }).from(questions);
}
