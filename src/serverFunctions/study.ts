import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import * as comments from "@/server/comments";
import * as progress from "@/server/progress";
import * as study from "@/server/study";
import { toViewer } from "@/server/viewer";

export const getExplore = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => study.exploreInput.parse(data))
  .handler(({ data, context }) =>
    study.exploreOverview(toViewer(context.user), data),
  );

export const getCoursePlayer = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => study.playerInput.parse(data))
  .handler(({ data, context }) =>
    study.coursePlayer(toViewer(context.user), data),
  );

export const submitAnswer = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => study.answerInput.parse(data))
  .handler(({ data, context }) =>
    study.submitAnswer(toViewer(context.user), data),
  );

export const getDue = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => study.dueInput.parse(data))
  .handler(async ({ data, context }) => ({
    ...(await study.dueForRevision(toViewer(context.user), data)),
    scopes: await study.scopeOptions(),
  }));

export const getStats = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => progress.statsInput.parse(data))
  .handler(async ({ data, context }) => ({
    ...(await progress.getStats(toViewer(context.user), data)),
    scopes: await study.scopeOptions(),
  }));

export const getHistory = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(({ context }) => progress.getHistory(toViewer(context.user)));

export const getHome = createServerFn()
  .middleware([ensureUserMiddleware])
  .handler(async ({ context }) => {
    const viewer = toViewer(context.user);
    const [history, due] = await Promise.all([
      progress.getHistory(viewer, 5),
      progress.dueCount(viewer),
    ]);
    return { history, due };
  });

export const getComments = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => comments.questionIdInput.parse(data))
  .handler(({ data, context }) =>
    comments.listComments(toViewer(context.user), data),
  );

export const postComment = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => comments.postCommentInput.parse(data))
  .handler(({ data, context }) =>
    comments.postComment(toViewer(context.user), data),
  );

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => comments.commentIdInput.parse(data))
  .handler(({ data, context }) =>
    comments.deleteComment(toViewer(context.user), data),
  );

export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => comments.reactionInput.parse(data))
  .handler(({ data, context }) =>
    comments.toggleReaction(toViewer(context.user), data),
  );
