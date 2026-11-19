import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { commentReactions, comments, reviewCards, users } from "@/db/schema";
import { NotFound, rememberUser, type Viewer } from "./viewer";

const id = z.string().min(1).max(100);
export const questionIdInput = z.object({ questionId: id }).strict();
export const postCommentInput = z
  .object({
    questionId: id,
    body: z.string().trim().min(1, "Write something first").max(4000),
  })
  .strict();
export const commentIdInput = z.object({ commentId: id }).strict();
export const reactionInput = z
  .object({ commentId: id, kind: z.enum(["like", "agree"]) })
  .strict();

/** Comments open once the member has answered the question. */
async function requireAnswered(viewer: Viewer, questionId: string) {
  const [card] = await db
    .select({ q: reviewCards.questionId })
    .from(reviewCards)
    .where(
      and(
        eq(reviewCards.userId, viewer.id),
        eq(reviewCards.questionId, questionId),
      ),
    );
  if (!card) throw new Error("Answer the question to see its discussion.");
}

export async function listComments(
  viewer: Viewer,
  { questionId }: z.infer<typeof questionIdInput>,
) {
  await requireAnswered(viewer, questionId);
  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      userId: comments.userId,
      email: users.email,
    })
    .from(comments)
    .leftJoin(users, eq(users.id, comments.userId))
    .where(eq(comments.questionId, questionId))
    .orderBy(asc(comments.createdAt));
  const reactions = rows.length
    ? await db
        .select({
          commentId: commentReactions.commentId,
          userId: commentReactions.userId,
          kind: commentReactions.kind,
        })
        .from(commentReactions)
        .innerJoin(comments, eq(comments.id, commentReactions.commentId))
        .where(eq(comments.questionId, questionId))
    : [];
  return rows.map((row) => {
    const own = reactions.filter((r) => r.commentId === row.id);
    const tally = (kind: "like" | "agree") => ({
      count: own.filter((r) => r.kind === kind).length,
      mine: own.some((r) => r.kind === kind && r.userId === viewer.id),
    });
    return {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      author: row.email ?? "Former member",
      canDelete: row.userId === viewer.id || viewer.admin,
      like: tally("like"),
      agree: tally("agree"),
    };
  });
}

export async function postComment(
  viewer: Viewer,
  input: z.infer<typeof postCommentInput>,
) {
  await requireAnswered(viewer, input.questionId);
  await rememberUser(viewer);
  await db.insert(comments).values({
    id: crypto.randomUUID(),
    questionId: input.questionId,
    userId: viewer.id,
    body: input.body,
    createdAt: Date.now(),
  });
}

export async function deleteComment(
  viewer: Viewer,
  { commentId }: z.infer<typeof commentIdInput>,
) {
  const [comment] = await db
    .select({ userId: comments.userId })
    .from(comments)
    .where(eq(comments.id, commentId));
  if (!comment) throw new NotFound("Comment not found");
  if (comment.userId !== viewer.id && !viewer.admin)
    throw new Error("Only the author or an admin can delete this.");
  await db.delete(comments).where(eq(comments.id, commentId));
}

/** Adds the member's reaction of this kind, or takes it back. */
export async function toggleReaction(
  viewer: Viewer,
  input: z.infer<typeof reactionInput>,
) {
  const [comment] = await db
    .select({ questionId: comments.questionId })
    .from(comments)
    .where(eq(comments.id, input.commentId));
  if (!comment) throw new NotFound("Comment not found");
  await requireAnswered(viewer, comment.questionId);
  const removed = await db
    .delete(commentReactions)
    .where(
      and(
        eq(commentReactions.commentId, input.commentId),
        eq(commentReactions.userId, viewer.id),
        eq(commentReactions.kind, input.kind),
      ),
    )
    .returning({ kind: commentReactions.kind });
  if (!removed.length) {
    await db
      .insert(commentReactions)
      .values({
        commentId: input.commentId,
        userId: viewer.id,
        kind: input.kind,
      })
      .onConflictDoNothing();
  }
}
