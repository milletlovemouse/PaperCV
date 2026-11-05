import { Toast } from "radix-ui";
import { CheckCheck, X } from "lucide-react";
import { IconButton } from "./IconButton";

export function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <Toast.Provider duration={4500} swipeDirection="right" label="提示">
      <Toast.Root
        key={message}
        className="toast"
        defaultOpen
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <CheckCheck size={17} aria-hidden="true" />
        <Toast.Description asChild>
          <span>{message}</span>
        </Toast.Description>
        <Toast.Close asChild>
          <IconButton title="关闭提示" tooltip={false}>
            <X size={14} />
          </IconButton>
        </Toast.Close>
      </Toast.Root>
      <Toast.Viewport className="toast-viewport" label="通知（{hotkey}）" />
    </Toast.Provider>
  );
}
