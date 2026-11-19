import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Page } from "@/client/components/AppNav";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  HistoryRow,
  historyStatus,
  ResumeLink,
} from "@/client/study/HistoryRow";
import { getHome } from "@/serverFunctions/study";

export const Route = createFileRoute("/")({
  loader: () => getHome(),
  head: () => ({ meta: [{ title: "MCQ Practice" }] }),
  component: Home,
});

function Home() {
  const { history, due } = Route.useLoaderData();
  const [latest, ...rest] = history;
  return (
    <Page>
      <PageHeader title="MCQ Practice" />
      {latest ? (
        <Card data-testid="resume-card">
          <CardHeader>
            <CardDescription>Continue where you stopped</CardDescription>
            <CardTitle className="text-xl">{latest.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {latest.context} · {historyStatus(latest)}
            </span>
            <Button
              data-testid="resume-link"
              render={<ResumeLink item={latest} />}
              nativeButton={false}
            >
              {latest.kind === "exam" && latest.open
                ? "Resume exam"
                : latest.kind === "exam"
                  ? "See result"
                  : "Continue"}
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="Nothing studied yet"
          description="Pick a course and start answering."
          action={
            <Button render={<Link to="/explore" />} nativeButton={false}>
              Explore the bank
            </Button>
          }
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revision</CardTitle>
            <CardDescription>
              {due === 1 ? "1 question due" : `${due} questions due`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              render={<Link to="/revise" />}
              nativeButton={false}
            >
              Revise
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Exams</CardTitle>
            <CardDescription>Past papers or a custom draw</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              render={<Link to="/exams" />}
              nativeButton={false}
            >
              Take an exam
            </Button>
          </CardContent>
        </Card>
      </div>
      {rest.length ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent</h2>
            <Link
              to="/history"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              All history
            </Link>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {rest.map((item) => (
              <HistoryRow key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </ul>
        </section>
      ) : null}
    </Page>
  );
}
