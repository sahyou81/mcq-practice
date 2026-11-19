import { Link } from "@tanstack/react-router";
import { BookOpen, Timer } from "lucide-react";
import { Badge } from "@/client/components/ui/badge";
import { when } from "@/client/lib/format";
import type { HistoryItem } from "@/server/progress";

/** Where a history item picks up: the next unanswered question, the open attempt, or its result. */
export function ResumeLink({
  item,
  ...rest
}: { item: HistoryItem } & React.ComponentProps<"a">) {
  return item.kind === "course" ? (
    <Link {...rest} to="/explore/$courseId" params={{ courseId: item.id }} />
  ) : (
    <Link {...rest} to="/attempts/$attemptId" params={{ attemptId: item.id }} />
  );
}

export function historyStatus(item: HistoryItem) {
  if (item.kind === "course") {
    return item.answered >= item.total
      ? `All ${item.total} answered`
      : `${item.answered}/${item.total} answered`;
  }
  if (item.open) return "In progress";
  return item.score === null ? "Submitted" : `${item.score} / ${item.total}`;
}

export function HistoryRow({ item }: { item: HistoryItem }) {
  const Icon = item.kind === "course" ? BookOpen : Timer;
  return (
    <li data-testid="history-row">
      <ResumeLink
        item={item}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{item.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {item.context} · {when(item.at)}
          </span>
        </span>
        <Badge
          variant={item.kind === "exam" && item.open ? "warning" : "secondary"}
        >
          {historyStatus(item)}
        </Badge>
      </ResumeLink>
    </li>
  );
}
