import { CircleHelp, FilePlus2, Github, LayoutTemplate, PencilLine, Settings2 } from "lucide-react";

import { ChoiceGroup, ChoiceItem } from "@/shared/ui";

import type { EditorTab } from "../types";

interface Props {
  tab: EditorTab;
  previewOnly: boolean;
  onTabChange: (tab: EditorTab) => void;
  onNew: () => void;
  onHelp: () => void;
}

export default function EditorNavigation({ tab, previewOnly, onTabChange, onNew, onHelp }: Props) {
  return (
    <nav className="rail" aria-label="编辑器导航">
      <div className="rail-top">
        <ChoiceGroup
          label="编辑面板"
          value={previewOnly ? "" : tab}
          onChange={(next) => onTabChange(next as EditorTab)}
          orientation="vertical"
        >
          {(
            [
              ["content", PencilLine, "内容"],
              ["templates", LayoutTemplate, "模板"],
              ["style", Settings2, "排版"],
            ] as const
          ).map(([key, Icon, label]) => (
            <ChoiceItem key={key} value={key} asChild>
              <button className={`rail-item ${tab === key && !previewOnly ? "active" : ""}`}>
                <Icon size={21} strokeWidth={1.6} />
                <span>{label}</span>
              </button>
            </ChoiceItem>
          ))}
        </ChoiceGroup>
        <div className="rail-divider" />
        <button className="rail-item" onClick={onNew}>
          <FilePlus2 size={21} strokeWidth={1.6} />
          <span>新建</span>
        </button>
      </div>
      <div className="rail-bottom">
        <button className="rail-item" onClick={onHelp}>
          <CircleHelp size={20} strokeWidth={1.6} />
          <span>帮助</span>
        </button>
        <a
          className="github-link"
          href="https://github.com/milletlovemouse/PaperCV"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub 代码仓库（新标签页打开）"
          title="GitHub 代码仓库"
        >
          <Github size={20} strokeWidth={1.7} aria-hidden="true" />
        </a>
      </div>
    </nav>
  );
}
