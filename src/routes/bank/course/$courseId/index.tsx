import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Page } from "@/client/components/AppNav";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { errorMessage, plural } from "@/client/lib/format";
import { deleteQuestion, getCourse } from "@/serverFunctions/bank";

export const Route = createFileRoute("/bank/course/$courseId/")({
  loader: ({ params }) => getCourse({ data: { id: params.courseId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.course.name ?? "Course"} · MCQ Practice` }],
  }),
  component: CoursePage,
});

function CoursePage() {
  const { course, questions, canEdit } = Route.useLoaderData();
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Page>
      <PageHeader
        backLink={
          <Link
            to="/bank/$sourceId"
            params={{ sourceId: course.sourceId }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden /> {course.sourceName}
          </Link>
        }
        title={course.name}
        description={`${course.moduleName} · ${plural(questions.length, "question")}`}
        actions={
          <>
            {questions.length ? (
              <Button
                variant="outline"
                render={
                  <Link
                    to="/explore/$courseId"
                    params={{ courseId: course.id }}
                  />
                }
                nativeButton={false}
              >
                Practise
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                data-testid="new-question"
                render={
                  <Link
                    to="/bank/course/$courseId/new"
                    params={{ courseId: course.id }}
                  />
                }
                nativeButton={false}
              >
                <Plus /> New question
              </Button>
            ) : null}
          </>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {questions.length ? (
        <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {questions.map((question, index) => (
            <li
              key={question.id}
              data-testid="question-row"
              className="flex items-start gap-3 px-4 py-3 text-sm"
            >
              <span className="w-6 shrink-0 text-muted-foreground">
                {index + 1}.
              </span>
              <span className="min-w-0 flex-1">{question.stem}</span>
              {question.examYear ? (
                <Badge variant="outline">{question.examYear}</Badge>
              ) : null}
              {canEdit ? (
                <>
                  <Button
                    data-testid="edit-question"
                    variant="ghost"
                    size="icon"
                    aria-label="Edit question"
                    render={
                      <Link
                        to="/bank/question/$questionId"
                        params={{ questionId: question.id }}
                      />
                    }
                    nativeButton={false}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    data-testid="delete-question"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete question"
                    onClick={() => setRemoving(question.id)}
                  >
                    <Trash2 />
                  </Button>
                </>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="No questions yet" />
      )}
      {removing ? (
        <ConfirmDialog
          title="Delete this question?"
          confirmLabel="Delete"
          destructive
          pending={pending}
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            setPending(true);
            setError(null);
            try {
              await deleteQuestion({ data: { id: removing } });
              await router.invalidate();
            } catch (cause) {
              setError(errorMessage(cause));
            } finally {
              setPending(false);
              setRemoving(null);
            }
          }}
        >
          Its comments and members' progress on it are deleted too.
        </ConfirmDialog>
      ) : null}
    </Page>
  );
}
