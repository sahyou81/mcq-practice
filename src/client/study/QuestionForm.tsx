import { useNavigate } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { Checkbox } from "@/client/components/ui/checkbox";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Textarea } from "@/client/components/ui/textarea";
import { errorMessage } from "@/client/lib/format";
import { saveQuestion } from "@/serverFunctions/bank";

interface Draft {
  id?: string;
  courseId: string;
  stem: string;
  explanation: string;
  examYear: number | null;
  choices: Array<{ text: string; isCorrect: boolean }>;
}

/** Writes or edits one question with its choices and key. */
export function QuestionForm({ initial }: { initial: Draft }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(initial);
  const [year, setYear] = useState(
    initial.examYear ? String(initial.examYear) : "",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setChoice = (
    index: number,
    change: Partial<Draft["choices"][number]>,
  ) =>
    setDraft((d) => ({
      ...d,
      choices: d.choices.map((c, i) => (i === index ? { ...c, ...change } : c)),
    }));

  async function save() {
    setPending(true);
    setError(null);
    try {
      await saveQuestion({
        data: {
          id: draft.id,
          courseId: draft.courseId,
          stem: draft.stem,
          explanation: draft.explanation || undefined,
          examYear: year ? Number(year) : null,
          choices: draft.choices,
        },
      });
      await navigate({
        to: "/bank/course/$courseId",
        params: { courseId: draft.courseId },
      });
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="stem">Question</Label>
          <Textarea
            id="stem"
            data-testid="question-stem"
            value={draft.stem}
            onChange={(e) => setDraft({ ...draft, stem: e.target.value })}
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">
            Choices (tick every correct one)
          </legend>
          {draft.choices.map((choice, index) => (
            <div key={index} className="flex items-center gap-3">
              <Checkbox
                data-testid={`choice-correct-${index}`}
                aria-label={`Choice ${index + 1} is correct`}
                checked={choice.isCorrect}
                onCheckedChange={(checked) =>
                  setChoice(index, { isCorrect: checked })
                }
              />
              <Input
                data-testid={`choice-text-${index}`}
                aria-label={`Choice ${index + 1}`}
                value={choice.text}
                onChange={(e) => setChoice(index, { text: e.target.value })}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove choice ${index + 1}`}
                disabled={draft.choices.length <= 2}
                onClick={() =>
                  setDraft({
                    ...draft,
                    choices: draft.choices.filter((_, i) => i !== index),
                  })
                }
              >
                <X />
              </Button>
            </div>
          ))}
          <Button
            data-testid="add-choice"
            variant="outline"
            size="sm"
            disabled={draft.choices.length >= 10}
            onClick={() =>
              setDraft({
                ...draft,
                choices: [...draft.choices, { text: "", isCorrect: false }],
              })
            }
          >
            <Plus /> Add choice
          </Button>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="explanation">Explanation</Label>
          <Textarea
            id="explanation"
            data-testid="question-explanation"
            value={draft.explanation}
            onChange={(e) =>
              setDraft({ ...draft, explanation: e.target.value })
            }
          />
        </div>
        <div className="max-w-40 space-y-2">
          <Label htmlFor="year">Exam year</Label>
          <Input
            id="year"
            data-testid="question-year"
            inputMode="numeric"
            value={year}
            onChange={(e) =>
              setYear(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() =>
              navigate({
                to: "/bank/course/$courseId",
                params: { courseId: draft.courseId },
              })
            }
          >
            Cancel
          </Button>
          <Button data-testid="save-question" pending={pending} onClick={save}>
            Save question
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
