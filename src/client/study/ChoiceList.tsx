import { cn } from "cn";
import { Checkbox } from "@/client/components/ui/checkbox";

interface Choice {
  id: string;
  text: string;
}

/**
 * The choices of one question. Without `correctIds` they can be picked;
 * with them, each shows whether it was right, a wrong pick or missed.
 */
export function ChoiceList({
  choices,
  selected,
  onToggle,
  correctIds,
  disabled,
}: {
  choices: Choice[];
  selected: string[];
  onToggle?: (id: string) => void;
  correctIds?: string[];
  disabled?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {choices.map((choice, index) => {
        const picked = selected.includes(choice.id);
        const result = correctIds
          ? correctIds.includes(choice.id)
            ? picked
              ? "right"
              : "missed"
            : picked
              ? "wrong"
              : "neutral"
          : undefined;
        return (
          <li key={choice.id}>
            <label
              data-testid="choice"
              data-selected={picked}
              data-result={result}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/50",
                picked && !result && "border-primary bg-primary/5",
                result === "right" && "border-success bg-success/10",
                result === "missed" && "border-success border-dashed",
                result === "wrong" && "border-destructive bg-destructive/10",
                (disabled || correctIds) && "cursor-default hover:bg-card",
              )}
            >
              <Checkbox
                checked={picked}
                disabled={disabled || Boolean(correctIds)}
                onCheckedChange={() => onToggle?.(choice.id)}
                className="mt-0.5"
              />
              <span className="font-medium text-muted-foreground">
                {String.fromCharCode(65 + index)}.
              </span>
              <span className="flex-1">{choice.text}</span>
              {result === "right" ? (
                <span className="text-xs text-success">Correct</span>
              ) : null}
              {result === "missed" ? (
                <span className="text-xs text-success">Missed</span>
              ) : null}
              {result === "wrong" ? (
                <span className="text-xs text-destructive">Wrong</span>
              ) : null}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export function ResultBadge({ right }: { right: boolean }) {
  return (
    <span
      data-testid="answer-result"
      className={cn(
        "text-sm font-semibold",
        right ? "text-success" : "text-destructive",
      )}
    >
      {right ? "Correct" : "Incorrect"}
    </span>
  );
}

export function Explanation({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div
      data-testid="explanation"
      className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm"
    >
      <p className="mb-1 font-medium">Explanation</p>
      <p className="whitespace-pre-wrap text-muted-foreground">{text}</p>
    </div>
  );
}
