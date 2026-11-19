import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import { z } from "zod";
import * as bank from "@/server/bank";
import { toViewer } from "@/server/viewer";

const ref = z.object({ id: z.string().min(1).max(100) }).strict();

export const getSources = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(async ({ context }) => ({
    sources: await bank.listSources(),
    canEdit: toViewer(context.user).admin,
  }));

export const getSource = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => ref.parse(data))
  .handler(async ({ data, context }) => ({
    source: await bank.getSource(data.id),
    canEdit: toViewer(context.user).admin,
  }));

export const getCourse = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => ref.parse(data))
  .handler(({ data, context }) =>
    bank.getCourse(toViewer(context.user), data.id),
  );

export const getQuestionForEdit = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => ref.parse(data))
  .handler(({ data, context }) =>
    bank.getQuestionForEdit(toViewer(context.user), data.id),
  );

export const saveSource = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => bank.sourceInput.parse(data))
  .handler(({ data, context }) =>
    bank.saveSource(toViewer(context.user), data),
  );

export const saveModule = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => bank.moduleInput.parse(data))
  .handler(({ data, context }) =>
    bank.saveModule(toViewer(context.user), data),
  );

export const saveCourse = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => bank.courseInput.parse(data))
  .handler(({ data, context }) =>
    bank.saveCourse(toViewer(context.user), data),
  );

export const saveQuestion = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => bank.questionInput.parse(data))
  .handler(({ data, context }) =>
    bank.saveQuestion(toViewer(context.user), data),
  );

export const deleteSource = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => bank.idInput.parse(data))
  .handler(({ data, context }) =>
    bank.deleteSource(toViewer(context.user), data),
  );

export const deleteModule = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => bank.idInput.parse(data))
  .handler(({ data, context }) =>
    bank.deleteModule(toViewer(context.user), data),
  );

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => bank.idInput.parse(data))
  .handler(({ data, context }) =>
    bank.deleteCourse(toViewer(context.user), data),
  );

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => bank.idInput.parse(data))
  .handler(({ data, context }) =>
    bank.deleteQuestion(toViewer(context.user), data),
  );
