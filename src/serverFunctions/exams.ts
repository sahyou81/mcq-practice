import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import { z } from "zod";
import * as exams from "@/server/exams";
import * as study from "@/server/study";
import { toViewer } from "@/server/viewer";

export const getExams = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => exams.listExams(toViewer(context.user)));

export const getCustomOptions = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(() => study.scopeOptions());

export const createPastExam = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => exams.pastExamInput.parse(data))
  .handler(({ data, context }) =>
    exams.createPastExam(toViewer(context.user), data),
  );

export const deletePastExam = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => exams.examIdInput.parse(data))
  .handler(({ data, context }) =>
    exams.deletePastExam(toViewer(context.user), data),
  );

const editInput = z
  .object({
    examId: z.string().min(1).max(100),
    courseId: z.string().min(1).max(100).optional(),
  })
  .strict();

export const getExamForEdit = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => editInput.parse(data))
  .handler(({ data, context }) =>
    exams.getExamForEdit(toViewer(context.user), data),
  );

export const setExamQuestions = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => exams.examQuestionsInput.parse(data))
  .handler(({ data, context }) =>
    exams.setExamQuestions(toViewer(context.user), data),
  );

export const startPastAttempt = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => exams.examIdInput.parse(data))
  .handler(({ data, context }) =>
    exams.startPastAttempt(toViewer(context.user), data),
  );

export const startCustomAttempt = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => exams.customExamInput.parse(data))
  .handler(({ data, context }) =>
    exams.startCustomAttempt(toViewer(context.user), data),
  );

export const getAttempt = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => exams.attemptIdInput.parse(data))
  .handler(({ data, context }) =>
    exams.getAttempt(toViewer(context.user), data),
  );

export const saveAttemptAnswer = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => exams.saveAnswerInput.parse(data))
  .handler(({ data, context }) =>
    exams.saveAttemptAnswer(toViewer(context.user), data),
  );

export const submitAttempt = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => exams.attemptIdInput.parse(data))
  .handler(({ data, context }) =>
    exams.submitAttempt(toViewer(context.user), data),
  );
