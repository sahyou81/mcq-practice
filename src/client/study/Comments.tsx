import { useEffect, useState } from "react";
import { Heart, ThumbsUp, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { Button } from "@/client/components/ui/button";
import { Textarea } from "@/client/components/ui/textarea";
import { errorMessage, when } from "@/client/lib/format";
import {
  deleteComment,
  getComments,
  postComment,
  toggleReaction,
} from "@/serverFunctions/study";

type CommentList = Awaited<ReturnType<typeof getComments>>;

/** The discussion under a question the member has answered. */
export function Comments({ questionId }: { questionId: string }) {
  const [list, setList] = useState<CommentList | null>(null);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function load() {
    try {
      setList(await getComments({ data: { questionId } }));
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  useEffect(() => {
    void load();
  }, [questionId]);

  async function run(work: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await work();
      await load();
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-4" aria-label="Discussion">
      <h2 className="text-lg font-semibold">Discussion</h2>
      {list && !list.length ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : null}
      <ul className="space-y-3">
        {list?.map((comment) => (
          <li
            key={comment.id}
            data-testid="comment"
            className="space-y-2 rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">
                  {comment.author}
                </span>{" "}
                · {when(comment.createdAt)}
              </span>
              {comment.canDelete ? (
                <Button
                  data-testid="delete-comment"
                  variant="ghost"
                  size="icon"
                  aria-label="Delete comment"
                  onClick={() => setRemoving(comment.id)}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
            <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
            <div className="flex gap-2">
              {(["like", "agree"] as const).map((kind) => (
                <Button
                  key={kind}
                  data-testid={`react-${kind}`}
                  variant={comment[kind].mine ? "secondary" : "ghost"}
                  size="sm"
                  aria-pressed={comment[kind].mine}
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      toggleReaction({ data: { commentId: comment.id, kind } }),
                    )
                  }
                >
                  {kind === "like" ? <Heart /> : <ThumbsUp />}
                  {kind === "like" ? "Like" : "Agree"} {comment[kind].count}
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="space-y-2">
        <Textarea
          data-testid="comment-input"
          placeholder="Add a comment"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end">
          <Button
            data-testid="post-comment"
            variant="outline"
            disabled={!body.trim()}
            pending={pending}
            onClick={async () => {
              if (await run(() => postComment({ data: { questionId, body } })))
                setBody("");
            }}
          >
            Post
          </Button>
        </div>
      </div>
      {removing ? (
        <ConfirmDialog
          title="Delete this comment?"
          confirmLabel="Delete"
          destructive
          pending={pending}
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await run(() => deleteComment({ data: { commentId: removing } }));
            setRemoving(null);
          }}
        />
      ) : null}
    </section>
  );
}
