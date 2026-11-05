import { RadioGroup } from "radix-ui";
import { type ReactNode } from "react";

export function ChoiceGroup({
  label,
  value,
  onChange,
  className,
  orientation = "horizontal",
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  orientation?: "horizontal" | "vertical";
  children: ReactNode;
}) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={onChange}
      aria-label={label}
      orientation={orientation}
      className={className}
    >
      {children}
    </RadioGroup.Root>
  );
}
export const ChoiceItem = RadioGroup.Item;
