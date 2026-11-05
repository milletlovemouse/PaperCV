import { Dialog } from "@radix-ui/themes";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";

export function Modal({
  title,
  subtitle,
  children,
  footer,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  // These dialogs can open from many controls, including preview actions without a Dialog.Trigger.
  const returnFocus = useRef(document.activeElement as HTMLElement | null);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Content
        className={`modal ${wide ? "modal-wide" : ""}`}
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
      >
        <div className="modal-head">
          <div>
            <Dialog.Title as="h2">{title}</Dialog.Title>
            {subtitle && <Dialog.Description>{subtitle}</Dialog.Description>}
          </div>
          <IconButton title="关闭弹窗" onClick={onClose}>
            <X size={19} />
          </IconButton>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </Dialog.Content>
    </Dialog.Root>
  );
}

import { IconButton } from "./IconButton";
