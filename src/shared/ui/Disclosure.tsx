import { Collapsible } from "radix-ui";
import { ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

export function Disclosure({
  title,
  children,
  className = "",
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [visited, setVisited] = useState(defaultOpen);
  return (
    <Collapsible.Root
      className={`ui-disclosure ${className}`}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setVisited(true);
      }}
    >
      <Collapsible.Trigger className="ui-disclosure-trigger">
        <ChevronRight size={13} aria-hidden="true" />
        <span>{title}</span>
      </Collapsible.Trigger>
      {visited && (
        <Collapsible.Content className="ui-disclosure-content" forceMount hidden={!open}>
          {children}
        </Collapsible.Content>
      )}
    </Collapsible.Root>
  );
}
