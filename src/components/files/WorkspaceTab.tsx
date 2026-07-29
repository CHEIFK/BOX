/** WorkspaceTab — a single tab in the workspace tab bar */
import type { Workspace } from '../../hooks/useWorkspace';
import './WorkspaceTab.css';

interface WorkspaceTabProps {
  workspace: Workspace;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

export default function WorkspaceTab({
  workspace,
  isActive,
  onClick,
  onClose,
}: WorkspaceTabProps) {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <button
      className={`ws-tab${isActive ? ' ws-tab--active' : ''}`}
      onClick={onClick}
      title={workspace.path}
      aria-label={`Workspace: ${workspace.name}`}
      aria-selected={isActive}
      role="tab"
    >
      <span className="ws-tab__icon" aria-hidden="true">
        {workspace.loading ? '⏳' : '📂'}
      </span>
      <span className="ws-tab__name">{workspace.name}</span>
      <span
        className="ws-tab__close"
        onClick={handleClose}
        role="button"
        aria-label={`Close ${workspace.name}`}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClose()}
      >
        ×
      </span>
    </button>
  );
}
