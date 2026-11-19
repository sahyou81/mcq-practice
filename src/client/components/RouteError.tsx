import type { ErrorComponentProps } from "@tanstack/react-router";
import { EmptyState } from "@/client/components/EmptyState";
import { Page } from "@/client/components/AppNav";

/** What a page shows when its data can't load, such as a link to something deleted. */
export function RouteError({ error }: ErrorComponentProps) {
  return (
    <Page>
      <EmptyState
        kind="error"
        title={
          (error instanceof Error && error.message) || "Something went wrong"
        }
      />
    </Page>
  );
}
