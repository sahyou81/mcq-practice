import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/client/components/AppNav";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { HistoryRow } from "@/client/study/HistoryRow";
import { getHistory } from "@/serverFunctions/study";

export const Route = createFileRoute("/history")({
  loader: () => getHistory(),
  head: () => ({ meta: [{ title: "History · MCQ Practice" }] }),
  component: History,
});

function History() {
  const items = Route.useLoaderData();
  return (
    <Page>
      <PageHeader title="History" />
      {items.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {items.map((item) => (
            <HistoryRow key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No activity yet"
          description="Courses you study and exams you take appear here."
        />
      )}
    </Page>
  );
}
