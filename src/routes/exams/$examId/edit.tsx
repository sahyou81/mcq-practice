import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronLeft, Plus, X } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Page } from "@/client/components/AppNav";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { errorMessage, plural } from "@/client/lib/format";
import { ScopeSelect } from "@/client/study/ScopeSelect";
import { getExamForEdit, setExamQuestions } from "@/serverFunctions/exams";

export const Route = createFileRoute("/exams/$examId/edit")({
  validateSearch: z.object({ courseId: z.string().optional() }),
  loaderDeps: ({ search }) => ({ courseId: search.courseId }),
  loader: ({ params, deps }) =>
    getExamForEdit({
      data: { examId: params.examId, courseId: deps.courseId },
    }),
  head: () => ({ meta: [{ title: "Edit exam · MCQ Practice" }] }),
  component: EditExam,
});

function EditExam() {
  const { exam, included, courseOptions, candidates } = Route.useLoaderData();
  const { courseId } = Route.useSearch();
  const navigate = useNavigate({ from: "/exams/$examId/edit" });
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = included.map((q) => q.id);

  async function save(questionIds: string[]) {
    setPending(true);
    setError(null);
    try {
      await setExamQuestions({ data: { examId: exam.id, questionIds } });
      await router.invalidate();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }
  function move(index: number, by: number) {
    const next = [...ids];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item!);
    void save(next);
  }

  return (
    <Page>
      <PageHeader
        backLink={
          <Link
            to="/exams"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden /> Exams
          </Link>
        }
        title={exam.title}
        description={`${plural(included.length, "question")} · ${exam.minutes} min`}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <section data-testid="exam-editor" className="space-y-3">
        <h2 className="text-lg font-semibold">Questions, in order</h2>
        {included.length ? (
          <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {included.map((question, index) => (
              <li
                key={question.id}
                data-testid="exam-question"
                className="flex items-start gap-2 px-4 py-3 text-sm"
              >
                <span className="w-6 shrink-0 text-muted-foreground">
                  {index + 1}.
                </span>
                <span className="min-w-0 flex-1">
                  {question.stem}
                  <span className="block text-xs text-muted-foreground">
                    {question.courseName}
                  </span>
                </span>
                <Button
                  data-testid="move-up"
                  variant="ghost"
                  size="icon"
                  aria-label="Move up"
                  disabled={pending || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  data-testid="move-down"
                  variant="ghost"
                  size="icon"
                  aria-label="Move down"
                  disabled={pending || index === included.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove"
                  disabled={pending}
                  onClick={() => save(ids.filter((id) => id !== question.id))}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            size="sm"
            title="No questions yet"
            description="Add them from a course below."
          />
        )}
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Add from a course</h2>
          <ScopeSelect
            testId="pick-course"
            label="Course"
            value={courseId ?? "none"}
            items={[
              { value: "none", label: "Choose a course" },
              ...courseOptions.map((c) => ({ value: c.id, label: c.label })),
            ]}
            onChange={(value) =>
              navigate({
                search: { courseId: value === "none" ? undefined : value },
              })
            }
          />
        </div>
        {courseId ? (
          candidates.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {candidates.map((question) => (
                <li
                  key={question.id}
                  className="flex items-start gap-3 px-4 py-3 text-sm"
                >
                  <span className="min-w-0 flex-1">{question.stem}</span>
                  <Button
                    data-testid={`add-${question.id}`}
                    variant="outline"
                    size="sm"
                    disabled={pending || ids.includes(question.id)}
                    onClick={() => save([...ids, question.id])}
                  >
                    <Plus /> {ids.includes(question.id) ? "Added" : "Add"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState size="sm" title="No questions in this course" />
          )
        ) : null}
      </section>
    </Page>
  );
}
