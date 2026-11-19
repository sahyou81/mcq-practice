import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`);

// Members, keyed by the Gateway's user id; email comes from the identity.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: createdAt(),
});

// The shared bank: sources hold modules, modules hold courses, courses hold questions.
export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: createdAt(),
});

export const modules = sqliteTable(
  "modules",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("modules_source").on(t.sourceId)],
);

export const courses = sqliteTable(
  "courses",
  {
    id: text("id").primaryKey(),
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("courses_module").on(t.moduleId)],
);

export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    stem: text("stem").notNull(),
    explanation: text("explanation"),
    examYear: integer("exam_year"),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("questions_course").on(t.courseId)],
);

export const choices = sqliteTable(
  "choices",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("choices_question").on(t.questionId)],
);

// One per member and answered question: progress and the review schedule.
export const reviewCards = sqliteTable(
  "review_cards",
  {
    userId: text("user_id").notNull(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    ease: real("ease").notNull().default(2.5),
    intervalDays: real("interval_days").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    dueAt: integer("due_at").notNull(),
    lastCorrect: integer("last_correct", { mode: "boolean" }).notNull(),
    lastAnsweredAt: integer("last_answered_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.questionId] }),
    index("cards_due").on(t.userId, t.dueAt),
  ],
);

// Every answer given in exploration or revision.
export const answers = sqliteTable(
  "answers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    selected: text("selected", { mode: "json" }).$type<string[]>().notNull(),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
    mode: text("mode", { enum: ["explore", "revise"] }).notNull(),
    answeredAt: integer("answered_at").notNull(),
  },
  (t) => [index("answers_user").on(t.userId, t.answeredAt)],
);

// Past exams (set by admins, ownerId null) and custom exams (one member's).
export const exams = sqliteTable("exams", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["past", "custom"] }).notNull(),
  title: text("title").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  ownerId: text("owner_id"),
  createdAt: integer("created_at").notNull(),
});

export const examQuestions = sqliteTable(
  "exam_questions",
  {
    examId: text("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.examId, t.questionId] })],
);

export const attempts = sqliteTable(
  "attempts",
  {
    id: text("id").primaryKey(),
    examId: text("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    startedAt: integer("started_at").notNull(),
    deadlineAt: integer("deadline_at").notNull(),
    submittedAt: integer("submitted_at"),
    score: integer("score"),
    total: integer("total").notNull(),
  },
  (t) => [index("attempts_user").on(t.userId, t.startedAt)],
);

export const attemptAnswers = sqliteTable(
  "attempt_answers",
  {
    attemptId: text("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    selected: text("selected", { mode: "json" }).$type<string[]>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.questionId] })],
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    body: text("body").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("comments_question").on(t.questionId)],
);

export const commentReactions = sqliteTable(
  "comment_reactions",
  {
    commentId: text("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    kind: text("kind", { enum: ["like", "agree"] }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.userId, t.kind] })],
);
