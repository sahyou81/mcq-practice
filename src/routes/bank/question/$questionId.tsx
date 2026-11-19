import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/client/components/AppNav";
import { PageHeader } from "@/client/components/PageHeader";
import { QuestionForm } from "@/client/study/QuestionForm";
import { getQuestionForEdit } from "@/serverFunctions/bank";

export const Route = createFileRoute("/bank/question/$questionId")({
  loader: ({ params }) =>
    getQuestionForEdit({ data: { id: params.questionId } }),
  head: () => ({ meta: [{ title: "Edit question · MCQ Practice" }] }),
  component: EditQuestion,
});

function EditQuestion() {
  const question = Route.useLoaderData();
  return (
    <Page>
      <PageHeader title="Edit question" />
      <QuestionForm initial={question} />
    </Page>
  );
}
