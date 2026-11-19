import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { ChevronLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Page } from "@/client/components/AppNav";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { errorMessage, plural } from "@/client/lib/format";
import { NameDialog } from "@/client/study/NameDialog";
import {
  deleteCourse,
  deleteModule,
  deleteSource,
  getSource,
  saveCourse,
  saveModule,
  saveSource,
} from "@/serverFunctions/bank";

export const Route = createFileRoute("/bank/$sourceId")({
  loader: ({ params }) => getSource({ data: { id: params.sourceId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.source.name ?? "Source"} · MCQ Practice` }],
  }),
  component: SourcePage,
});

type Dialog =
  | { kind: "rename-source" }
  | { kind: "new-module" }
  | { kind: "rename-module"; id: string; name: string }
  | { kind: "new-course"; moduleId: string }
  | { kind: "rename-course"; id: string; moduleId: string; name: string }
  | {
      kind: "delete";
      what: "source" | "module" | "course";
      id: string;
      name: string;
    };

function SourcePage() {
  const { source, canEdit } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => setDialog(null);
  const refresh = () => router.invalidate();

  return (
    <Page>
      <PageHeader
        backLink={
          <Link
            to="/bank"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden /> Question bank
          </Link>
        }
        title={source.name}
        description={source.description}
        actions={
          canEdit ? (
            <>
              <Button
                variant="outline"
                onClick={() => setDialog({ kind: "rename-source" })}
              >
                <Pencil /> Rename
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setDialog({
                    kind: "delete",
                    what: "source",
                    id: source.id,
                    name: source.name,
                  })
                }
              >
                <Trash2 /> Delete
              </Button>
              <Button
                data-testid="new-module"
                onClick={() => setDialog({ kind: "new-module" })}
              >
                <Plus /> New module
              </Button>
            </>
          ) : null
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {source.modules.length ? (
        source.modules.map((mod) => (
          <section
            key={mod.id}
            data-testid="module-section"
            className="space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{mod.name}</h2>
              {canEdit ? (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Rename ${mod.name}`}
                    onClick={() =>
                      setDialog({
                        kind: "rename-module",
                        id: mod.id,
                        name: mod.name,
                      })
                    }
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${mod.name}`}
                    onClick={() =>
                      setDialog({
                        kind: "delete",
                        what: "module",
                        id: mod.id,
                        name: mod.name,
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                  <Button
                    data-testid="new-course"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDialog({ kind: "new-course", moduleId: mod.id })
                    }
                  >
                    <Plus /> Course
                  </Button>
                </div>
              ) : null}
            </div>
            {mod.courses.length ? (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {mod.courses.map((course) => (
                  <li
                    key={course.id}
                    data-testid="course-row"
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <Link
                      to="/bank/course/$courseId"
                      params={{ courseId: course.id }}
                      className="min-w-0 flex-1 truncate font-medium hover:underline"
                    >
                      {course.name}
                    </Link>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {plural(course.questionCount, "question")}
                    </span>
                    {canEdit ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Rename ${course.name}`}
                          onClick={() =>
                            setDialog({
                              kind: "rename-course",
                              id: course.id,
                              moduleId: mod.id,
                              name: course.name,
                            })
                          }
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${course.name}`}
                          onClick={() =>
                            setDialog({
                              kind: "delete",
                              what: "course",
                              id: course.id,
                              name: course.name,
                            })
                          }
                        >
                          <Trash2 />
                        </Button>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState size="sm" title="No courses yet" />
            )}
          </section>
        ))
      ) : (
        <EmptyState
          title="No modules yet"
          description={
            canEdit
              ? "Split this source into modules, then courses."
              : undefined
          }
        />
      )}

      {dialog?.kind === "rename-source" ? (
        <NameDialog
          title="Rename source"
          testId="source"
          initial={source.name}
          onClose={close}
          onSave={async (name) => {
            await saveSource({
              data: {
                id: source.id,
                name,
                description: source.description ?? undefined,
              },
            });
            await refresh();
          }}
        />
      ) : null}
      {dialog?.kind === "new-module" ? (
        <NameDialog
          title="New module"
          testId="module"
          onClose={close}
          onSave={async (name) => {
            await saveModule({ data: { sourceId: source.id, name } });
            await refresh();
          }}
        />
      ) : null}
      {dialog?.kind === "rename-module" ? (
        <NameDialog
          title="Rename module"
          testId="module"
          initial={dialog.name}
          onClose={close}
          onSave={async (name) => {
            await saveModule({
              data: { id: dialog.id, sourceId: source.id, name },
            });
            await refresh();
          }}
        />
      ) : null}
      {dialog?.kind === "new-course" ? (
        <NameDialog
          title="New course"
          testId="course"
          onClose={close}
          onSave={async (name) => {
            await saveCourse({ data: { moduleId: dialog.moduleId, name } });
            await refresh();
          }}
        />
      ) : null}
      {dialog?.kind === "rename-course" ? (
        <NameDialog
          title="Rename course"
          testId="course"
          initial={dialog.name}
          onClose={close}
          onSave={async (name) => {
            await saveCourse({
              data: { id: dialog.id, moduleId: dialog.moduleId, name },
            });
            await refresh();
          }}
        />
      ) : null}
      {dialog?.kind === "delete" ? (
        <ConfirmDialog
          title={`Delete ${dialog.name}?`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onClose={close}
          onConfirm={async () => {
            setPending(true);
            setError(null);
            try {
              const data = { id: dialog.id };
              if (dialog.what === "source") {
                await deleteSource({ data });
                await navigate({ to: "/bank" });
              } else {
                await (dialog.what === "module"
                  ? deleteModule({ data })
                  : deleteCourse({ data }));
                await refresh();
              }
            } catch (cause) {
              setError(errorMessage(cause));
            } finally {
              setPending(false);
              close();
            }
          }}
        >
          Every question inside it, with members' answers and comments on them,
          is deleted.
        </ConfirmDialog>
      ) : null}
    </Page>
  );
}
