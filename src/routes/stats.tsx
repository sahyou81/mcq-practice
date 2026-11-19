import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Page } from "@/client/components/AppNav";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Progress } from "@/client/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { percent, when } from "@/client/lib/format";
import {
  ScopeSelect,
  scopeItems,
  scopeSearch,
  scopeValue,
} from "@/client/study/ScopeSelect";
import { getStats } from "@/serverFunctions/study";

const search = z.object({
  sourceId: z.string().optional(),
  moduleId: z.string().optional(),
});

export const Route = createFileRoute("/stats")({
  validateSearch: search,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getStats({ data: deps }),
  head: () => ({ meta: [{ title: "Stats · MCQ Practice" }] }),
  component: Stats,
});

function Stat({
  label,
  value,
  testId,
}: {
  label: string;
  value: string | number;
  testId: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle data-testid={testId} className="text-2xl tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function Stats() {
  const stats = Route.useLoaderData();
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: "/stats" });
  return (
    <Page>
      <PageHeader title="Statistics" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Questions answered"
          value={stats.answered}
          testId="stat-answered"
        />
        <Stat
          label="Success rate"
          value={percent(stats.right, stats.answered)}
          testId="stat-success"
        />
        <Card size="sm" className="col-span-2 sm:col-span-1">
          <CardHeader>
            <CardDescription>Still to answer</CardDescription>
            <CardTitle
              data-testid="stat-remaining"
              className="text-2xl tabular-nums"
            >
              {stats.remaining}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScopeSelect
              testId="stats-filter"
              label="In"
              value={scopeValue(filters)}
              items={scopeItems(stats.scopes, "Whole bank")}
              onChange={(value) => navigate({ search: scopeSearch(value) })}
            />
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Revision</h2>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Due now" value={stats.due} testId="stat-due" />
          <Stat
            label="Learning"
            value={stats.learning}
            testId="stat-learning"
          />
          <Stat
            label="Mastered"
            value={stats.mastered}
            testId="stat-mastered"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">By module</h2>
        {stats.modules.length ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Answered</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.modules.map((mod) => (
                  <TableRow key={mod.id} data-testid="stats-module">
                    <TableCell>
                      <span className="block font-medium">{mod.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {mod.sourceName}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-32">
                      <span className="text-sm">{`${mod.answered} of ${mod.total}`}</span>
                      <Progress
                        value={(mod.answered / mod.total) * 100}
                        aria-label={`${mod.name} answered`}
                        className="mt-1"
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {percent(mod.right, mod.answered)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState size="sm" title="No questions in the bank yet" />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Exam scores</h2>
        {stats.exams.length ? (
          <ul className="space-y-2">
            {stats.exams.map((exam) => (
              <li
                key={exam.id}
                data-testid="stats-attempt"
                className="space-y-1 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{exam.title}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {`${exam.score ?? 0} / ${exam.total}`} ·{" "}
                    {when(exam.submittedAt!)}
                  </span>
                </div>
                <Progress
                  value={((exam.score ?? 0) / exam.total) * 100}
                  aria-label={`${exam.title} score`}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState size="sm" title="No exams taken yet" />
        )}
      </section>
    </Page>
  );
}
