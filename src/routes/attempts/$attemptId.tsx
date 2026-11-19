import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ChevronLeft, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Page } from "@/client/components/AppNav";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { errorMessage, percent } from "@/client/lib/format";
import {
  ChoiceList,
  Explanation,
  ResultBadge,
} from "@/client/study/ChoiceList";
import { Comments } from "@/client/study/Comments";
import {
  getAttempt,
  saveAttemptAnswer,
  submitAttempt,
} from "@/serverFunctions/exams";

export const Route = createFileRoute("/attempts/$attemptId")({
  loader: ({ params }) => getAttempt({ data: { attemptId: params.attemptId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.attempt.title ?? "Exam"} · MCQ Practice` }],
  }),
  component: AttemptPage,
});

type Loaded = Awaited<ReturnType<typeof getAttempt>>;

const back = (
  <Link
    to="/exams"
    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
  >
    <ChevronLeft className="size-4" aria-hidden /> Exams
  </Link>
);

function AttemptPage() {
  const data = Route.useLoaderData();
  return (
    <Page>
      {data.state === "open" ? (
        <OpenAttempt key={data.attempt.id} data={data} />
      ) : (
        <Result data={data} />
      )}
    </Page>
  );
}

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function OpenAttempt({ data }: { data: Extract<Loaded, { state: "open" }> }) {
  const router = useRouter();
  const { attempt, questions } = data;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(questions.map((q) => [q.id, q.selected])),
  );
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // The server's clock decides; this only counts down to its deadline.
  const skew = useRef(data.now - Date.now());
  const [left, setLeft] = useState(attempt.deadlineAt - data.now);

  async function submit() {
    setSubmitting(true);
    try {
      await submitAttempt({ data: { attemptId: attempt.id } });
    } catch (cause) {
      setError(errorMessage(cause));
    }
    await router.invalidate();
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = attempt.deadlineAt - (Date.now() + skew.current);
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        void submit();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt.deadlineAt]);

  async function toggle(questionId: string, choiceId: string) {
    const current = answers[questionId] ?? [];
    const selected = current.includes(choiceId)
      ? current.filter((c) => c !== choiceId)
      : [...current, choiceId];
    setAnswers((all) => ({ ...all, [questionId]: selected }));
    setError(null);
    try {
      await saveAttemptAnswer({
        data: { attemptId: attempt.id, questionId, selected },
      });
    } catch (cause) {
      setError(errorMessage(cause));
      await router.invalidate();
    }
  }

  const question = questions[index]!;
  const answeredCount = questions.filter(
    (q) => (answers[q.id] ?? []).length,
  ).length;
  return (
    <>
      <PageHeader
        backLink={back}
        title={attempt.title}
        description={`${answeredCount} of ${attempt.total} answered`}
        actions={
          <>
            <Badge
              data-testid="exam-timer"
              variant={left < 60_000 ? "destructive" : "secondary"}
              className="tabular-nums"
            >
              <Clock /> {clock(left)}
            </Badge>
            <Button
              data-testid="submit-exam"
              pending={submitting}
              onClick={() => setConfirming(true)}
            >
              Submit
            </Button>
          </>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card>
        <CardContent className="space-y-5">
          <p
            data-testid="exam-progress"
            className="text-xs font-medium text-muted-foreground"
          >
            Question {index + 1} of {questions.length}
          </p>
          <p
            data-testid="question-stem"
            className="text-base font-medium whitespace-pre-wrap"
          >
            {question.stem}
          </p>
          <ChoiceList
            choices={question.choices}
            selected={answers[question.id] ?? []}
            onToggle={(choiceId) => toggle(question.id, choiceId)}
          />
          <div className="flex justify-between gap-2">
            <Button
              data-testid="exam-prev"
              variant="outline"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              <ArrowLeft /> Previous
            </Button>
            <Button
              data-testid="exam-next"
              variant="outline"
              disabled={index === questions.length - 1}
              onClick={() => setIndex(index + 1)}
            >
              Next <ArrowRight />
            </Button>
          </div>
        </CardContent>
      </Card>
      <nav aria-label="Questions" className="flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <Button
            key={q.id}
            size="sm"
            variant={
              i === index
                ? "default"
                : (answers[q.id] ?? []).length
                  ? "secondary"
                  : "outline"
            }
            aria-label={`Question ${i + 1}`}
            onClick={() => setIndex(i)}
          >
            {i + 1}
          </Button>
        ))}
      </nav>
      {confirming ? (
        <ConfirmDialog
          title="Submit this exam?"
          confirmLabel="Submit"
          pending={submitting}
          onClose={() => setConfirming(false)}
          onConfirm={submit}
        >
          {answeredCount < attempt.total
            ? `${attempt.total - answeredCount} unanswered questions count as wrong.`
            : undefined}
        </ConfirmDialog>
      ) : null}
    </>
  );
}

function Result({ data }: { data: Extract<Loaded, { state: "submitted" }> }) {
  const { attempt, questions } = data;
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <PageHeader
        backLink={back}
        title={attempt.title}
        description={
          attempt.timedOut ? "Submitted when time ran out" : undefined
        }
        actions={
          <div className="text-right">
            <p
              data-testid="exam-score"
              className="text-2xl font-semibold tabular-nums"
            >
              {`${attempt.score} / ${attempt.total}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {percent(attempt.score, attempt.total)}
            </p>
          </div>
        }
      />
      <ol className="space-y-4">
        {questions.map((question, index) => (
          <li key={question.id} data-testid="result-question">
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Question {index + 1}</span>
                  {question.selected.length ? (
                    <ResultBadge right={question.right} />
                  ) : (
                    <span className="text-sm font-semibold text-destructive">
                      Unanswered
                    </span>
                  )}
                </div>
                <p className="font-medium whitespace-pre-wrap">
                  {question.stem}
                </p>
                <ChoiceList
                  choices={question.choices}
                  selected={question.selected}
                  correctIds={question.correctIds}
                />
                <Explanation text={question.explanation} />
                {question.selected.length ? (
                  open === question.id ? (
                    <Comments questionId={question.id} />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpen(question.id)}
                    >
                      Discussion
                    </Button>
                  )
                ) : null}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </>
  );
}
