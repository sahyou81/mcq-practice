import { useState } from "react";
import { FormDialog } from "@/client/components/FormDialog";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { errorMessage } from "@/client/lib/format";

/** Names or renames one thing in the bank. */
export function NameDialog({
  title,
  label = "Name",
  initial = "",
  testId,
  onSave,
  onClose,
}: {
  title: string;
  label?: string;
  initial?: string;
  testId: string;
  onSave: (name: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setPending(true);
    setError(null);
    try {
      await onSave(name);
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }
  return (
    <FormDialog
      title={title}
      onClose={onClose}
      actions={
        <Button
          data-testid={`save-${testId}`}
          pending={pending}
          disabled={!name.trim()}
          onClick={save}
        >
          Save
        </Button>
      }
    >
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) void save();
        }}
      >
        <Label htmlFor={`${testId}-name`}>{label}</Label>
        <Input
          id={`${testId}-name`}
          data-testid={`${testId}-name`}
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </form>
    </FormDialog>
  );
}
