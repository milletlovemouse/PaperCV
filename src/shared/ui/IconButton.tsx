import { IconButton as RadixIconButton, Tooltip } from "@radix-ui/themes";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

type Props = ComponentPropsWithoutRef<typeof RadixIconButton> & {
  title: string;
  tooltip?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { title, tooltip = true, className = "", ...props },
  ref,
) {
  const button = (
    <RadixIconButton
      ref={ref}
      type="button"
      size="1"
      variant="ghost"
      aria-label={title}
      {...props}
      className={`icon-button ${className}`}
    />
  );
  return tooltip ? (
    <Tooltip content={title} delayDuration={450} className="ui-tooltip">
      {button}
    </Tooltip>
  ) : (
    button
  );
});
