import { createRouter } from "@tanstack/react-router";
import { RouteError } from "@/client/components/RouteError";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: () => (
      <RouteError error={new Error("Page not found")} reset={() => {}} />
    ),
  });
}
