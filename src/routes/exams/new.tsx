import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { Page } from "@/client/components/AppNav";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { Checkbox } from "@/client/components/ui/checkbox";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { errorMessage } from "@/client/lib/format";
import { getCustomOptions, startCustomAttempt } from "@/serverFunctions/exams";

export const Route = createFileRoute("/exams/new")({
  loader: () => getCustomOptions(),
  head: () => ({ meta: [{ title: "Custom exam · MCQ Practice" }] }),
  component: CustomExam,
});

function CustomExam() {
  const rows = Route.useLoaderData();
  const navigate = useNavigate();
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [moduleIds, setModuleIds] = useState<string[]>([]);
  const [count, setCount] = useState("20");
  const [minutes, setMinutes] = useState("30");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sources = [
    ...new Map(rows.map((r) => [r.sourceId, r.sourceName])).entries(),
  ];
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  async function start() {
    setPending(true);
    setError(null);
    try {
      const { attemptId } = await startCustomAttempt({
        data: {
          sourceIds,
          moduleIds,
          count: Number(count),
          minutes: Number(minutes),
        },
      });
      await navigate({ to: "/attempts/$attemptId", params: { attemptId } });
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
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
        title="Custom exam"
      />
      {sources.length ? (
        <Card>
          <CardContent className="space-y-6">
            <fieldset className="space-y-4">
              <legend className="mb-2 text-sm font-medium">
                Draw questions from
              </legend>
              {sources.map(([sourceId, sourceName]) => {
                const whole = sourceIds.includes(sourceId);
                return (
                  <div key={sourceId} className="space-y-2">
                    <label
                      data-testid="scope-source"
                      className="flex items-center gap-2 text-sm font-medium"
                    >
                      <Checkbox
                        checked={whole}
                        onCheckedChange={() =>
                          setSourceIds((l) => toggle(l, sourceId))
                        }
                      />
                      {sourceName}
                    </label>
                    <div className="ml-6 flex flex-wrap gap-x-5 gap-y-2">
                      {rows
                        .filter((r) => r.sourceId === sourceId && r.moduleId)
                        .map((r) => (
                          <label
                            key={r.moduleId}
                            data-testid="scope-module"
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={whole || moduleIds.includes(r.moduleId!)}
                              disabled={whole}
                              onCheckedChange={() =>
                                setModuleIds((l) => toggle(l, r.moduleId!))
                              }
                            />
                            {r.moduleName}
                          </label>
                        ))}
                    </div>
                  </div>
                );
              })}
            </fieldset>
            <div className="flex flex-wrap gap-4">
              <div className="w-36 space-y-2">
                <Label htmlFor="count">Questions</Label>
                <Input
                  id="count"
                  data-testid="question-count"
                  inputMode="numeric"
                  value={count}
                  onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className="w-36 space-y-2">
                <Label htmlFor="duration">Minutes</Label>
                <Input
                  id="duration"
                  data-testid="duration"
                  inputMode="numeric"
                  value={minutes}
                  onChange={(e) =>
                    setMinutes(e.target.value.replace(/\D/g, ""))
                  }
                />
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end">
              <Button
                data-testid="start-custom"
                pending={pending}
                disabled={
                  !(sourceIds.length + moduleIds.length) ||
                  !Number(count) ||
                  !Number(minutes)
                }
                onClick={start}
              >
                Start exam
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState title="The bank is empty" />
      )}
    </Page>
  );
}
