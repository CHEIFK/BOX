/** EditorTab — a single tab in the editor tab bar */
import type { EditorTab as TabData } from '../../hooks/useEditor';
import './EditorTab.css';

interface EditorTabProps {
  tab: TabData;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}

export default function EditorTab({ tab, isActive, onActivate, onClose }: EditorTabProps) {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const handleMiddleClick = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className={`editor-tab${isActive ? ' editor-tab--active' : ''}${tab.isDirty ? ' editor-tab--dirty' : ''}`}
      role="tab"
      aria-selected={isActive}
      aria-label={`${tab.name}${tab.isDirty ? ' (unsaved)' : ''}`}
      tabIndex={isActive ? 0 : -1}
      onClick={onActivate}
      onMouseDown={handleMiddleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
      }}
      title={tab.path}
    >
      {tab.isDirty && (
        <span className="editor-tab__dirty-dot" aria-label="Unsaved changes" title="Unsaved changes" />
      )}
      <span className="editor-tab__name">{tab.name}</span>
      <button
        className="editor-tab__close"
        onClick={handleClose}
        aria-label={`Close ${tab.name}`}
        tabIndex={-1}
        title="Close"
      >
        ×
      </button>
    </div>
  );
}
