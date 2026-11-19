import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { z } from "zod";
import { Page } from "@/client/components/AppNav";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { QuestionPlayer } from "@/client/study/QuestionPlayer";
import { getCoursePlayer } from "@/serverFunctions/study";

export const Route = createFileRoute("/explore/$courseId")({
  validateSearch: z.object({ questionId: z.string().optional() }),
  loaderDeps: ({ search }) => ({ questionId: search.questionId }),
  loader: ({ params, deps }) =>
    getCoursePlayer({
      data: { courseId: params.courseId, questionId: deps.questionId },
    }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.course.name ?? "Course"} · MCQ Practice` }],
  }),
  component: CoursePlayer,
});

function CoursePlayer() {
  const data = Route.useLoaderData();
  const navigate = useNavigate({ from: "/explore/$courseId" });
  const router = useRouter();
  const { course } = data;
  return (
    <Page>
      <PageHeader
        backLink={
          <Link
            to="/explore"
            search={{ sourceId: course.sourceId }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden /> Explore
          </Link>
        }
        title={course.name}
        description={`${course.moduleName} · ${data.answeredCount}/${data.total} answered`}
      />
      {data.question ? (
        <QuestionPlayer
          key={data.question.id}
          question={data.question}
          mode="explore"
          heading={
            <span className="font-medium text-foreground">
              Question {data.position} of {data.total}
            </span>
          }
          next={() => (
            <Button
              data-testid="next-question"
              onClick={async () => {
                await navigate({
                  search: data.nextQuestionId
                    ? { questionId: data.nextQuestionId }
                    : {},
                });
                if (!data.nextQuestionId) await router.invalidate();
              }}
            >
              {data.nextQuestionId ? "Next question" : "Finish"} <ArrowRight />
            </Button>
          )}
        />
      ) : data.total ? (
        <EmptyState
          title="Course complete"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  navigate({
                    search: { questionId: data.firstQuestionId ?? undefined },
                  })
                }
              >
                Start again
              </Button>
              <Button render={<Link to="/revise" />} nativeButton={false}>
                Revise
              </Button>
            </div>
          }
        />
      ) : (
        <EmptyState title="No questions yet" />
      )}
    </Page>
  );
}
