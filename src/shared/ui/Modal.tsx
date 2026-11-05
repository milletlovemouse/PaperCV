import { Dialog } from "@radix-ui/themes";
import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";

export function Modal({
  title,
  subtitle,
  children,
  footer,
  onClose,
  wide = false,
  busy = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
  busy?: boolean;
}) {
  const descriptionId = useId();
  // These dialogs can open from many controls, including preview actions without a Dialog.Trigger.
  const returnFocus = useRef(document.activeElement as HTMLElement | null);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Content
        className={`modal ${wide ? "modal-wide" : ""}`}
        aria-describedby={subtitle ? descriptionId : undefined}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          if (returnFocus.current?.isConnected) {
            event.preventDefault();
            returnFocus.current.focus();
          }
        }}
      >
        <div className="modal-head">
          <div>
            <Dialog.Title as="h2">{title}</Dialog.Title>
            {subtitle && <Dialog.Description id={descriptionId}>{subtitle}</Dialog.Description>}
          </div>
          <IconButton title="关闭弹窗" tooltip={false} onClick={onClose} disabled={busy}>
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
