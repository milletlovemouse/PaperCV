import { IconButton as RadixIconButton } from "@radix-ui/themes";
import { type ReactNode } from "react";

export function IconButton({
  title,
  children,
  onClick,
  disabled,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <RadixIconButton
      type="button"
      size="1"
      variant="ghost"
      className={`icon-button ${className}`}
      aria-label={title}
      title={title}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </RadixIconButton>
  );
}
