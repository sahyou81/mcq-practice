import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";

/** A labelled single-choice filter. */
export function ScopeSelect({
  testId,
  label,
  value,
  items,
  onChange,
}: {
  testId: string;
  label: string;
  value: string;
  items: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => next !== null && onChange(next)}
    >
      <SelectTrigger
        data-testid={testId}
        aria-label={label}
        className="w-full min-w-0 sm:w-64"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const ALL = "all";

/** Sources and their modules as filter items: whole bank, each source, each module. */
export function scopeItems(
  rows: Array<{
    sourceId: string;
    sourceName: string;
    moduleId: string | null;
    moduleName: string | null;
  }>,
  whole: string,
) {
  const items = [{ value: ALL, label: whole }];
  for (const row of rows) {
    if (!items.some((i) => i.value === `s:${row.sourceId}`))
      items.push({ value: `s:${row.sourceId}`, label: row.sourceName });
    if (row.moduleId)
      items.push({
        value: `m:${row.moduleId}`,
        label: `${row.sourceName} › ${row.moduleName}`,
      });
  }
  return items;
}

export function scopeValue(search: { sourceId?: string; moduleId?: string }) {
  return search.moduleId
    ? `m:${search.moduleId}`
    : search.sourceId
      ? `s:${search.sourceId}`
      : ALL;
}

export function scopeSearch(value: string): {
  sourceId?: string;
  moduleId?: string;
} {
  if (value.startsWith("m:")) return { moduleId: value.slice(2) };
  if (value.startsWith("s:")) return { sourceId: value.slice(2) };
  return {};
}
