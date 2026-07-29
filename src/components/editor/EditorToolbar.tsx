/** EditorToolbar — minimap toggle button and language badge */
import './EditorToolbar.css';

interface EditorToolbarProps {
  language: string;
  minimapEnabled: boolean;
  onToggleMinimap: () => void;
  isSaving: boolean;
  filePath: string | null;
}

export default function EditorToolbar({
  language,
  minimapEnabled,
  onToggleMinimap,
  isSaving,
  filePath,
}: EditorToolbarProps) {
  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Editor toolbar">
      <div className="editor-toolbar__left">
        {filePath && (
          <span className="editor-toolbar__filepath" title={filePath}>
            {filePath}
          </span>
        )}
      </div>
      <div className="editor-toolbar__right">
        {isSaving && (
          <span className="editor-toolbar__saving" aria-live="polite" aria-label="Saving">
            Saving…
          </span>
        )}
        <button
          className={`editor-toolbar__btn${minimapEnabled ? ' editor-toolbar__btn--active' : ''}`}
          onClick={onToggleMinimap}
          aria-pressed={minimapEnabled}
          aria-label={minimapEnabled ? 'Hide minimap' : 'Show minimap'}
          title={minimapEnabled ? 'Hide minimap' : 'Show minimap'}
        >
          <span aria-hidden="true">⬛</span>
          <span>Minimap</span>
        </button>
        <span
          className="editor-toolbar__lang"
          aria-label={`Language: ${language}`}
          title={`Language: ${language}`}
        >
          {language}
        </span>
      </div>
    </div>
  );
}
