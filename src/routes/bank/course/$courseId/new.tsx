import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/client/components/AppNav";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { QuestionForm } from "@/client/study/QuestionForm";
import { getCourse } from "@/serverFunctions/bank";

export const Route = createFileRoute("/bank/course/$courseId/new")({
  loader: ({ params }) => getCourse({ data: { id: params.courseId } }),
  head: () => ({ meta: [{ title: "New question · MCQ Practice" }] }),
  component: NewQuestion,
});

function NewQuestion() {
  const { course, canEdit } = Route.useLoaderData();
  return (
    <Page>
      <PageHeader
        title="New question"
        description={`${course.sourceName} › ${course.moduleName} › ${course.name}`}
      />
      {canEdit ? (
        <QuestionForm
          initial={{
            courseId: course.id,
            stem: "",
            explanation: "",
            examYear: null,
            choices: [
              { text: "", isCorrect: false },
              { text: "", isCorrect: false },
            ],
          }}
        />
      ) : (
        <EmptyState kind="error" title="Only admins can edit the bank" />
      )}
    </Page>
  );
}
