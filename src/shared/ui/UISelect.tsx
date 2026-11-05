import { Select } from "@radix-ui/themes";
import { useId } from "react";

export function UISelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  size = "default",
  contentClassName = "",
}: {
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: "default" | "compact";
  contentClassName?: string;
}) {
  const id = useId();
  return (
    <Select.Root
      size={size === "compact" ? "1" : "2"}
      disabled={disabled}
      value={value || "__empty__"}
      onValueChange={(value) => onChange(value === "__empty__" ? "" : value)}
    >
      <Select.Trigger
        id={id}
        aria-label={label}
        className={`ui-select${size === "compact" ? " ui-select-compact" : ""}`}
        variant="surface"
      />
      <Select.Content
        position="popper"
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className={`ui-select-content ${contentClassName}`}
        variant="soft"
      >
        {options.map(([key, text]) => (
          <Select.Item key={key || "__empty__"} value={key || "__empty__"}>
            {text}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
