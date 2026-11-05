import { AlertDialog } from "@radix-ui/themes";
import { X } from "lucide-react";
import { useRef } from "react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";

export function ConfirmDialog({
  title,
  message,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const returnFocus = useRef(document.activeElement as HTMLElement | null);
  return (
    <AlertDialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialog.Content
        className="modal"
        onCloseAutoFocus={(event) => {
          if (returnFocus.current?.isConnected) {
            event.preventDefault();
            returnFocus.current.focus();
          }
        }}
      >
        <div className="modal-head">
          <AlertDialog.Title as="h2">{title}</AlertDialog.Title>
          <AlertDialog.Cancel>
            <IconButton title="关闭弹窗">
              <X size={19} />
            </IconButton>
          </AlertDialog.Cancel>
        </div>
        <div className="modal-body">
          <AlertDialog.Description className="confirm-message">{message}</AlertDialog.Description>
        </div>
        <div className="modal-footer">
          <AlertDialog.Cancel>
            <Button className="button secondary">取消</Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button variant="solid" className="button primary" onClick={onConfirm}>
              确认
            </Button>
          </AlertDialog.Action>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
