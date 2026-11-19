import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { Pencil, Plus, Shuffle, Trash2 } from "lucide-react";
import { useState } from "react";
import { Page } from "@/client/components/AppNav";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { EmptyState } from "@/client/components/EmptyState";
import { FormDialog } from "@/client/components/FormDialog";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { errorMessage, plural, when } from "@/client/lib/format";
import {
  createPastExam,
  deletePastExam,
  getExams,
  startPastAttempt,
} from "@/serverFunctions/exams";

export const Route = createFileRoute("/exams/")({
  loader: () => getExams(),
  head: () => ({ meta: [{ title: "Exams · MCQ Practice" }] }),
  component: Exams,
});

function Exams() {
  const { past, attempts, canEdit } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = Date.now();

  async function start(examId: string) {
    setStarting(examId);
    setError(null);
    try {
      const { attemptId } = await startPastAttempt({ data: { examId } });
      await navigate({ to: "/attempts/$attemptId", params: { attemptId } });
    } catch (cause) {
      setError(errorMessage(cause));
      setStarting(null);
    }
  }

  return (
    <Page>
      <PageHeader
        title="Exams"
        actions={
          <>
            {canEdit ? (
              <Button
                data-testid="new-past-exam"
                variant="outline"
                onClick={() => setCreating(true)}
              >
                <Plus /> Past exam
              </Button>
            ) : null}
            <Button
              data-testid="new-custom-exam"
              render={<Link to="/exams/new" />}
              nativeButton={false}
            >
              <Shuffle /> Custom exam
            </Button>
          </>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Past exams</h2>
        {past.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {past.map((exam) => (
              <li
                key={exam.id}
                data-testid="past-exam"
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{exam.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {plural(exam.questionCount, "question")} · {exam.minutes}{" "}
                    min
                  </p>
                </div>
                {canEdit ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${exam.title}`}
                      render={
                        <Link
                          to="/exams/$examId/edit"
                          params={{ examId: exam.id }}
                        />
                      }
                      nativeButton={false}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${exam.title}`}
                      onClick={() => setRemoving(exam)}
                    >
                      <Trash2 />
                    </Button>
                  </>
                ) : null}
                <Button
                  data-testid="start-exam"
                  size="sm"
                  disabled={!exam.questionCount}
                  pending={starting === exam.id}
                  onClick={() => start(exam.id)}
                >
                  Start
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState size="sm" title="No past exams yet" />
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your attempts</h2>
        {attempts.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {attempts.map((attempt) => {
              const open = !attempt.submittedAt && attempt.deadlineAt > now;
              return (
                <li key={attempt.id} data-testid="attempt-row">
                  <Link
                    to="/attempts/$attemptId"
                    params={{ attemptId: attempt.id }}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{attempt.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {when(attempt.startedAt)}
                      </span>
                    </span>
                    {open ? (
                      <Badge variant="warning">In progress</Badge>
                    ) : (
                      <Badge variant="secondary">{`${attempt.score ?? 0} / ${attempt.total}`}</Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState size="sm" title="No attempts yet" />
        )}
      </section>
      {creating ? <NewPastExam onClose={() => setCreating(false)} /> : null}
      {removing ? (
        <ConfirmDialog
          title={`Delete ${removing.title}?`}
          confirmLabel="Delete"
          destructive
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            try {
              await deletePastExam({ data: { examId: removing.id } });
              await router.invalidate();
            } catch (cause) {
              setError(errorMessage(cause));
            }
            setRemoving(null);
          }}
        >
          Members' attempts at it are deleted too.
        </ConfirmDialog>
      ) : null}
    </Page>
  );
}

function NewPastExam({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setPending(true);
    setError(null);
    try {
      const { id } = await createPastExam({
        data: { title, minutes: Number(minutes) },
      });
      await navigate({ to: "/exams/$examId/edit", params: { examId: id } });
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }
  return (
    <FormDialog
      title="New past exam"
      onClose={onClose}
      actions={
        <Button
          data-testid="save-exam"
          pending={pending}
          disabled={!title.trim() || !Number(minutes)}
          onClick={save}
        >
          Create
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="exam-title">Title</Label>
          <Input
            id="exam-title"
            data-testid="exam-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exam-minutes">Duration (minutes)</Label>
          <Input
            id="exam-minutes"
            data-testid="exam-minutes"
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </FormDialog>
  );
}
