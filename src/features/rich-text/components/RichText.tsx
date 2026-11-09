import { Toolbar } from "radix-ui";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { Resume } from "@resume/model";
import { bulletMarkers } from "@resume/list-markers";
import { Button, IconButton, TextField } from "@/shared/ui";
import { blockTags, safeLink, sanitizeRichText } from "../lib/sanitize";
import { bookmark, restoreBookmark, type Bookmark, type Snapshot } from "../lib/selection";

export default function RichText({
  value,
  onChange,
  label = "经历描述",
  bulletStyle = "disc",
}: {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  bulletStyle?: Resume["style"]["bulletStyle"];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const savedSelection = useRef<Bookmark | null>(null);
  const history = useRef<Snapshot[]>([]);
  const historyIndex = useRef(0);
  const lastOutput = useRef<string | null>(null);
  const composing = useRef(false);
  const runningCommand = useRef(false);
  const pendingValue = useRef<string | null>(null);
  const [, refreshHistory] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const linkInput = useRef<HTMLInputElement>(null);
  const linkId = useId();

  function applyValue(next: string) {
    const root = ref.current;
    if (!root) return;
    const html = sanitizeRichText(next);
    const currentSelection = bookmark(root);
    if (root.innerHTML !== html) {
      root.innerHTML = html;
      if (currentSelection) restoreBookmark(root, currentSelection);
    }
    savedSelection.current = bookmark(root);
    lastOutput.current = html;
    history.current = [{ html, selection: savedSelection.current }];
    historyIndex.current = 0;
    refreshHistory((count) => count + 1);
  }

  useEffect(() => {
    if (value === lastOutput.current) return;
    if (composing.current) {
      pendingValue.current = value;
      return;
    }
    applyValue(value);
  }, [value]);

  useEffect(() => {
    const save = () => {
      const root = ref.current;
      if (!root) return;
      const selection = bookmark(root);
      if (selection) {
        savedSelection.current = selection;
        const current = history.current[historyIndex.current];
        if (current) current.selection = selection;
      }
    };
    document.addEventListener("selectionchange", save);
    return () => document.removeEventListener("selectionchange", save);
  }, []);

  useEffect(() => {
    if (linkOpen) linkInput.current?.focus();
  }, [linkOpen]);

  function emitChange() {
    const root = ref.current;
    if (!root || composing.current || runningCommand.current) return;
    const html = sanitizeRichText(root.innerHTML);
    const selection = bookmark(root);
    if (root.innerHTML !== html) {
      root.innerHTML = html;
      if (selection) restoreBookmark(root, selection);
    }
    savedSelection.current = bookmark(root);
    const current = history.current[historyIndex.current];
    if (current?.html !== html) {
      history.current = history.current.slice(0, historyIndex.current + 1);
      history.current.push({ html, selection: savedSelection.current });
      if (history.current.length > 100) history.current.shift();
      historyIndex.current = history.current.length - 1;
      refreshHistory((count) => count + 1);
    } else if (current) {
      current.selection = savedSelection.current;
    }
    lastOutput.current = html;
    onChange(html);
  }

  function focusSelection() {
    const root = ref.current;
    if (!root) return;
    root.focus({ preventScroll: true });
    if (savedSelection.current) restoreBookmark(root, savedSelection.current);
    else {
      const range = document.createRange();
      range.selectNodeContents(root);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  }

  function travel(direction: number) {
    const next = historyIndex.current + direction;
    const snapshot = history.current[next];
    const root = ref.current;
    if (!root || !snapshot) return;
    historyIndex.current = next;
    root.innerHTML = snapshot.html;
    savedSelection.current = snapshot.selection;
    focusSelection();
    lastOutput.current = snapshot.html;
    onChange(snapshot.html);
    refreshHistory((count) => count + 1);
  }

  function selectedBlocks() {
    const root = ref.current!;
    const selection = window.getSelection();
    if (!selection?.rangeCount) return [];
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      let element =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as HTMLElement)
          : range.startContainer.parentElement;
      while (element && element !== root) {
        if (blockTags.has(element.tagName)) return [element];
        element = element.parentElement;
      }
      return [];
    }
    return Array.from(root.querySelectorAll<HTMLElement>("p, div, li, blockquote")).filter((element) =>
      range.intersectsNode(element),
    );
  }

  function command(cmd: string) {
    if (composing.current) return;
    if (cmd === "undo" || cmd === "redo") {
      travel(cmd === "undo" ? -1 : 1);
      return;
    }
    if (ref.current) savedSelection.current = bookmark(ref.current) || savedSelection.current;
    focusSelection();
    if (cmd === "link") {
      const selection = window.getSelection();
      const node = selection?.anchorNode;
      const anchor = (node instanceof Element ? node : node?.parentElement)?.closest("a");
      setLinkUrl(anchor && ref.current?.contains(anchor) ? anchor.getAttribute("href") || "" : "");
      setLinkError("");
      setLinkOpen(true);
      return;
    }
    if (cmd === "indent") {
      const selection = window.getSelection();
      const targets = selectedBlocks();
      const start = selection?.anchorNode;
      const element = start instanceof Element ? start : start?.parentElement;
      // Native indentation preserves list nesting. Cap its cumulative quote/list depth.
      const depth = (target: Element | null | undefined) => {
        let count = 0;
        while (target && target !== ref.current) {
          if (["BLOCKQUOTE", "UL", "OL"].includes(target.tagName)) count++;
          target = target.parentElement;
        }
        return count;
      };
      if (Math.max(depth(element), ...targets.map(depth)) >= 3) return;
    }
    runningCommand.current = true;
    try {
      document.execCommand(cmd === "clear" ? "removeFormat" : cmd);
      if (cmd === "clear") {
        document.execCommand("unlink");
        const selection = bookmark(ref.current!);
        const blocks = selectedBlocks();
        // A collapsed caret can be inside a paragraph within an indented quote.
        blocks.slice().forEach((element) => {
          let parent = element.parentElement;
          while (parent && parent !== ref.current) {
            if (parent.tagName === "BLOCKQUOTE" && !blocks.includes(parent)) blocks.push(parent);
            parent = parent.parentElement;
          }
        });
        blocks.forEach((element) => {
          element.removeAttribute("style");
          element.removeAttribute("align");
          if (element.tagName === "BLOCKQUOTE") element.replaceWith(...element.childNodes);
        });
        if (selection) restoreBookmark(ref.current!, selection);
      }
    } finally {
      runningCommand.current = false;
    }
    emitChange();
  }

  function closeLink() {
    setLinkOpen(false);
    setLinkError("");
    focusSelection();
  }

  function insertLink() {
    const href = safeLink(linkUrl);
    if (!href) {
      setLinkError("请输入有效的 http://、https://、mailto: 或 tel: 链接");
      linkInput.current?.focus();
      return;
    }
    focusSelection();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      const node = selection.anchorNode;
      const anchor = (node instanceof Element ? node : node?.parentElement)?.closest("a");
      if (anchor && ref.current?.contains(anchor)) anchor.setAttribute("href", href);
      else {
        const anchor = document.createElement("a");
        anchor.setAttribute("href", href);
        anchor.textContent = href;
        range.insertNode(anchor);
        range.setStartAfter(anchor);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else document.execCommand("createLink", false, href);
    setLinkOpen(false);
    emitChange();
  }

  const tools = [
    [Undo2, "undo", "撤销"],
    [Redo2, "redo", "重做"],
    [Bold, "bold", "加粗"],
    [Italic, "italic", "斜体"],
    [Underline, "underline", "下划线"],
    [AlignLeft, "justifyLeft", "左对齐"],
    [AlignCenter, "justifyCenter", "居中对齐"],
    [AlignRight, "justifyRight", "右对齐"],
    [AlignJustify, "justifyFull", "两端对齐"],
    [List, "insertUnorderedList", "无序列表"],
    [ListOrdered, "insertOrderedList", "有序列表"],
    [IndentDecrease, "outdent", "减少缩进"],
    [IndentIncrease, "indent", "增加缩进"],
    [Link, "link", "插入链接"],
    [RemoveFormatting, "clear", "清除格式"],
  ] as const;
  return (
    <div className="rich-field">
      <label>{label}</label>
      <div className="rich-box">
        <Toolbar.Root className="rich-toolbar" aria-label={`${label}格式工具`} style={{ flexWrap: "wrap" }}>
          {tools.map(([Icon, cmd, title]) => (
            <Toolbar.Button key={cmd} asChild>
              <IconButton
                variant="ghost"
                size="1"
                key={cmd}
                type="button"
                aria-label={title}
                title={title}
                disabled={
                  cmd === "undo"
                    ? historyIndex.current === 0
                    : cmd === "redo"
                      ? historyIndex.current >= history.current.length - 1
                      : false
                }
                aria-expanded={cmd === "link" ? linkOpen : undefined}
                aria-controls={cmd === "link" ? `${linkId}-form` : undefined}
                style={{ flexShrink: 0 }}
                onMouseDown={(event) => {
                  if (ref.current) savedSelection.current = bookmark(ref.current) || savedSelection.current;
                  event.preventDefault();
                }}
                onClick={() => command(cmd)}
              >
                <Icon size={15} />
              </IconButton>
            </Toolbar.Button>
          ))}
          <span>写下你的行动与成果</span>
        </Toolbar.Root>
        {linkOpen && (
          <form
            id={`${linkId}-form`}
            aria-label="链接设置"
            className="rich-link-form"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              insertLink();
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Escape") {
                event.preventDefault();
                closeLink();
              }
            }}
          >
            <div className="rich-link-heading">
              <label htmlFor={`${linkId}-url`}>
                <Link size={14} aria-hidden="true" />
                链接地址
              </label>
              <IconButton variant="ghost" size="1" title="关闭链接设置" onClick={closeLink}>
                <X size={14} />
              </IconButton>
            </div>
            <div className="rich-link-row">
              <TextField.Root
                id={`${linkId}-url`}
                ref={linkInput}
                type="text"
                value={linkUrl}
                placeholder="https://example.com"
                autoComplete="off"
                inputMode="url"
                spellCheck={false}
                aria-invalid={Boolean(linkError)}
                aria-describedby={linkError ? `${linkId}-error` : `${linkId}-hint`}
                className="rich-link-input"
                onChange={(event) => {
                  setLinkUrl(event.target.value);
                  setLinkError("");
                }}
              />
              <Button type="submit" variant="solid" aria-label="应用链接">
                <Check size={14} aria-hidden="true" />
                应用链接
              </Button>
            </div>
            {linkError && (
              <span id={`${linkId}-error`} role="alert" className="rich-link-error">
                {linkError}
              </span>
            )}
            <p id={`${linkId}-hint`} className="rich-link-hint">
              为选中文字添加链接；未选中文字时插入链接地址。
            </p>
          </form>
        )}
        <div
          ref={ref}
          role="textbox"
          aria-label={label}
          aria-multiline="true"
          className="rich-content"
          style={
            Object.fromEntries(
              bulletMarkers(bulletStyle).map((marker, index) => [
                `--list-marker-${index + 1}`,
                marker === "diamond" ? '"◆  "' : marker,
              ]),
            ) as CSSProperties
          }
          contentEditable
          suppressContentEditableWarning
          data-placeholder="用具体的行动、数据和结果，讲好你的经历…"
          onInput={emitChange}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
            if (pendingValue.current !== null) {
              const pending = pendingValue.current;
              pendingValue.current = null;
              applyValue(pending);
            } else emitChange();
          }}
          onBeforeInput={(event) => {
            const type = (event.nativeEvent as InputEvent).inputType;
            if (type === "historyUndo" || type === "historyRedo") {
              event.preventDefault();
              travel(type === "historyUndo" ? -1 : 1);
            }
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey
            ) {
              const selection = window.getSelection();
              const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
              const node = selection?.anchorNode;
              const item = (node instanceof Element ? node : node?.parentElement)?.closest("li");
              const nested = item && Array.from(item.children).find((child) => child.matches("ul,ol"));
              if (range?.collapsed && nested && ref.current?.contains(item)) {
                const beforeList = document.createRange();
                beforeList.setStartBefore(nested);
                beforeList.collapse(true);
                if (range.compareBoundaryPoints(Range.START_TO_START, beforeList) <= 0) {
                  const remaining = range.cloneRange();
                  remaining.setEndBefore(nested);
                  const tail = remaining.cloneContents();
                  if (!tail.textContent?.trim() && !tail.querySelector("br")) {
                    event.preventDefault();
                    const paragraph = document.createElement("div");
                    paragraph.append(document.createElement("br"));
                    nested.before(paragraph);
                    range.setStart(paragraph, 0);
                    range.collapse(true);
                    selection!.removeAllRanges();
                    selection!.addRange(range);
                    emitChange();
                    return;
                  }
                }
              }
            }
            if (event.key === "Tab") {
              event.preventDefault();
              event.stopPropagation();
              command(event.shiftKey ? "outdent" : "indent");
              return;
            }
            if ((event.metaKey || event.ctrlKey) && !event.altKey) {
              const key = event.key.toLowerCase();
              if (key === "z" || key === "y") {
                event.preventDefault();
                event.stopPropagation();
                travel(key === "y" || event.shiftKey ? 1 : -1);
              } else if (key === "k") {
                event.preventDefault();
                event.stopPropagation();
                command("link");
              }
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
            emitChange();
          }}
          onDrop={(event) => {
            event.preventDefault();
            // Treat dropped HTML like pasted HTML: only insert its plain text.
            focusSelection();
            document.execCommand("insertText", false, event.dataTransfer.getData("text/plain"));
            emitChange();
          }}
        />
      </div>
    </div>
  );
}
