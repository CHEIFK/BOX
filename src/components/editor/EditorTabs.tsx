/** EditorTabs — horizontal tab bar for open editor files */
import type { EditorTab as TabData } from '../../hooks/useEditor';
import EditorTab from './EditorTab';
import './EditorTabs.css';

interface EditorTabsProps {
  tabs: TabData[];
  activeTabPath: string | null;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
}

export default function EditorTabs({ tabs, activeTabPath, onActivate, onClose }: EditorTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="editor-tabs" role="tablist" aria-label="Open files">
      {tabs.map((tab) => (
        <EditorTab
          key={tab.path}
          tab={tab}
          isActive={tab.path === activeTabPath}
          onActivate={() => onActivate(tab.path)}
          onClose={() => onClose(tab.path)}
        />
      ))}
    </div>
  );
}
