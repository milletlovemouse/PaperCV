import { Button as RadixButton } from "@radix-ui/themes";
import { type ComponentProps } from "react";

export function Button({ className = "", ...props }: ComponentProps<typeof RadixButton>) {
  return (
    <RadixButton
      type="button"
      size="2"
      variant={className.includes("primary") ? "solid" : "surface"}
      {...props}
      className={`ui-button ${className}`}
    />
  );
}
