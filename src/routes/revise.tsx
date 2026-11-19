import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Page } from "@/client/components/AppNav";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { errorMessage, when } from "@/client/lib/format";
import { QuestionPlayer } from "@/client/study/QuestionPlayer";
import {
  ScopeSelect,
  scopeItems,
  scopeSearch,
  scopeValue,
} from "@/client/study/ScopeSelect";
import { getDue } from "@/serverFunctions/study";

const search = z.object({
  sourceId: z.string().optional(),
  moduleId: z.string().optional(),
});

export const Route = createFileRoute("/revise")({
  validateSearch: search,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getDue({ data: { ...deps, exclude: [] } }),
  head: () => ({ meta: [{ title: "Revise · MCQ Practice" }] }),
  component: Revise,
});

function Revise() {
  const loaded = Route.useLoaderData();
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: "/revise" });
  const [session, setSession] = useState(loaded);
  // Questions already shown this session, so a missed one doesn't come straight back.
  const [seen, setSeen] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setSession(loaded);
    setSeen([]);
  }, [loaded]);

  async function next(exclude: string[]) {
    setError(null);
    try {
      setSeen(exclude);
      setSession(await getDue({ data: { ...filters, exclude } }));
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Page>
      <PageHeader
        title="Revise"
        description={
          <Badge
            data-testid="due-count"
            variant="secondary"
          >{`${session.due} due`}</Badge>
        }
        actions={
          <ScopeSelect
            testId="revise-scope"
            label="Revise from"
            value={scopeValue(filters)}
            items={scopeItems(loaded.scopes, "Whole bank")}
            onChange={(value) => navigate({ search: scopeSearch(value) })}
          />
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {session.question ? (
        <QuestionPlayer
          key={`${session.question.id}-${seen.length}`}
          question={session.question}
          mode="revise"
          next={() => (
            <Button
              data-testid="next-question"
              onClick={() => next([...seen, session.question!.id])}
            >
              Next <ArrowRight />
            </Button>
          )}
        />
      ) : session.due ? (
        <EmptyState
          title="Round complete"
          description={`${session.due} still due, missed this round.`}
          action={<Button onClick={() => next([])}>Go again</Button>}
        />
      ) : (
        <EmptyState
          title="Nothing to review"
          description={
            session.nextDueAt
              ? `Next question due ${when(session.nextDueAt)}.`
              : "Questions you answer while exploring are scheduled here."
          }
          action={
            <Button
              variant="outline"
              render={<Link to="/explore" />}
              nativeButton={false}
            >
              Explore
            </Button>
          }
        />
      )}
    </Page>
  );
}
