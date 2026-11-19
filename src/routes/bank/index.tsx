import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Library, Plus } from "lucide-react";
import { useState } from "react";
import { Page } from "@/client/components/AppNav";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { plural } from "@/client/lib/format";
import { NameDialog } from "@/client/study/NameDialog";
import { getSources, saveSource } from "@/serverFunctions/bank";

export const Route = createFileRoute("/bank/")({
  loader: () => getSources(),
  head: () => ({ meta: [{ title: "Bank · MCQ Practice" }] }),
  component: Bank,
});

function Bank() {
  const { sources, canEdit } = Route.useLoaderData();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  return (
    <Page>
      <PageHeader
        title="Question bank"
        actions={
          canEdit ? (
            <Button data-testid="new-source" onClick={() => setAdding(true)}>
              <Plus /> New source
            </Button>
          ) : null
        }
      />
      {sources.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {sources.map((source) => (
            <li
              key={source.id}
              data-testid="source-row"
              className="flex items-center gap-3 px-4 py-3"
            >
              <Library
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <Link
                  to="/bank/$sourceId"
                  params={{ sourceId: source.id }}
                  className="font-medium hover:underline"
                >
                  {source.name}
                </Link>
                {source.description ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {source.description}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">
                {plural(source.questionCount, "question")}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="The bank is empty"
          description={
            canEdit
              ? "Add a source, such as a past-paper bank or a book."
              : "An admin has not added any questions yet."
          }
        />
      )}
      {adding ? (
        <NameDialog
          title="New source"
          testId="source"
          onClose={() => setAdding(false)}
          onSave={async (name) => {
            await saveSource({ data: { name } });
            await router.invalidate();
          }}
        />
      ) : null}
    </Page>
  );
}
