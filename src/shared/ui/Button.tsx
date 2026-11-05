import { Button as RadixButton } from "@radix-ui/themes";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

export const Button = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof RadixButton>>(
  function Button({ className = "", variant = "surface", ...props }, ref) {
    return (
      <RadixButton
        ref={ref}
        type="button"
        size="2"
        variant={variant}
        {...props}
        className={`ui-button ${className}`}
      />
    );
  },
);
