import { useState, type ReactNode } from "react";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { errorMessage } from "@/client/lib/format";
import type { Correction, PlayQuestion } from "@/server/study";
import { submitAnswer } from "@/serverFunctions/study";
import { ChoiceList, Explanation, ResultBadge } from "./ChoiceList";
import { Comments } from "./Comments";

/** One question to answer, then its correction and discussion. */
export function QuestionPlayer({
  question,
  mode,
  heading,
  next,
}: {
  question: PlayQuestion;
  mode: "explore" | "revise";
  heading?: ReactNode;
  /** Shown once the question is answered. */
  next: (correction: Correction) => ReactNode;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      setCorrection(
        await submitAnswer({
          data: { questionId: question.id, selected, mode },
        }),
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {heading}
            <span>
              {question.sourceName} › {question.moduleName} ›{" "}
              {question.courseName}
            </span>
            {question.examYear ? (
              <Badge variant="outline">{question.examYear}</Badge>
            ) : null}
          </div>
          <p
            data-testid="question-stem"
            className="text-base font-medium whitespace-pre-wrap"
          >
            {question.stem}
          </p>
          <ChoiceList
            choices={question.choices}
            selected={correction ? correction.selected : selected}
            correctIds={correction?.correctIds}
            onToggle={(id) =>
              setSelected((list) =>
                list.includes(id)
                  ? list.filter((x) => x !== id)
                  : [...list, id],
              )
            }
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {correction ? (
            <div className="space-y-4">
              <ResultBadge right={correction.right} />
              <Explanation text={correction.explanation} />
              <div className="flex justify-end">{next(correction)}</div>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button
                data-testid="submit-answer"
                disabled={!selected.length}
                pending={pending}
                onClick={submit}
              >
                Check answer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {correction || question.answeredBefore ? (
        <Comments
          questionId={question.id}
          key={correction ? "after" : "before"}
        />
      ) : null}
    </div>
  );
}
