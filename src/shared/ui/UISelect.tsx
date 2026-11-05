import { Select } from "@radix-ui/themes";
import { useId } from "react";

export function UISelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <Select.Root
      value={value || "__empty__"}
      onValueChange={(value) => onChange(value === "__empty__" ? "" : value)}
    >
      <Select.Trigger id={id} aria-label={label} className="ui-select" variant="surface" />
      <Select.Content position="popper" className="ui-select-content" variant="solid">
        {options.map(([key, text]) => (
          <Select.Item key={key || "__empty__"} value={key || "__empty__"}>
            {text}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
