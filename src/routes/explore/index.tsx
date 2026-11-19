import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Page } from "@/client/components/AppNav";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Progress } from "@/client/components/ui/progress";
import { ScopeSelect } from "@/client/study/ScopeSelect";
import { getExplore } from "@/serverFunctions/study";

const search = z.object({
  sourceId: z.string().optional(),
  moduleId: z.string().optional(),
});

export const Route = createFileRoute("/explore/")({
  validateSearch: search,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getExplore({ data: deps }),
  head: () => ({ meta: [{ title: "Explore · MCQ Practice" }] }),
  component: Explore,
});

function counts(item: { answered: number; total: number; right: number }) {
  return `${item.answered}/${item.total} answered · ${item.right} correct`;
}

function Explore() {
  const data = Route.useLoaderData();
  const navigate = useNavigate({ from: "/explore/" });
  return (
    <Page>
      <PageHeader title="Explore" />
      {data.sourceId ? (
        <>
          <div className="flex flex-wrap gap-3">
            <ScopeSelect
              testId="filter-source"
              label="Source"
              value={data.sourceId}
              items={data.sources.map((s) => ({ value: s.id, label: s.name }))}
              onChange={(sourceId) => navigate({ search: { sourceId } })}
            />
            <ScopeSelect
              testId="filter-module"
              label="Module"
              value={data.moduleId ?? "all"}
              items={[
                { value: "all", label: "All modules" },
                ...data.allModules.map((m) => ({ value: m.id, label: m.name })),
              ]}
              onChange={(moduleId) =>
                navigate({
                  search: {
                    sourceId: data.sourceId ?? undefined,
                    moduleId: moduleId === "all" ? undefined : moduleId,
                  },
                })
              }
            />
          </div>
          {data.modules.length ? (
            data.modules.map((mod) => (
              <section key={mod.id} className="space-y-3">
                <div data-testid="explore-module" className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold">{mod.name}</h2>
                    <span className="text-sm text-muted-foreground">
                      {counts(mod)}
                    </span>
                  </div>
                  <Progress
                    value={mod.total ? (mod.answered / mod.total) * 100 : 0}
                    aria-label={`${mod.name} progress`}
                  />
                </div>
                {mod.courses.length ? (
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                    {mod.courses.map((course) => (
                      <li key={course.id} data-testid="explore-course">
                        <Link
                          to="/explore/$courseId"
                          params={{ courseId: course.id }}
                          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-muted/50"
                        >
                          <span className="font-medium">{course.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {counts(course)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState size="sm" title="No courses yet" />
                )}
              </section>
            ))
          ) : (
            <EmptyState title="No modules yet" />
          )}
        </>
      ) : (
        <EmptyState
          title="The bank is empty"
          description="Questions appear here once an admin adds them."
        />
      )}
    </Page>
  );
}
