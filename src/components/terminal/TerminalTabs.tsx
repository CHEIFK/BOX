/**
 * TerminalTabs — tab bar for the multi-terminal panel.
 * Shows open terminal tabs + a "+" button to add a new one (max 5).
 */
import type { TerminalInstance } from '../../hooks/useTerminals';
import TerminalTab from './TerminalTab';
import './TerminalTabs.css';

interface TerminalTabsProps {
  terminals: TerminalInstance[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
  maxReached: boolean;
}

const MAX_TERMINALS = 5;

export default function TerminalTabs({
  terminals,
  activeId,
  onActivate,
  onClose,
  onAdd,
  maxReached,
}: TerminalTabsProps) {
  return (
    <div className="terminal-tabs" role="tablist" aria-label="Terminal tabs">
      {terminals.map((t) => (
        <TerminalTab
          key={t.id}
          id={t.id}
          title={t.title}
          isActive={t.id === activeId}
          onActivate={onActivate}
          onClose={onClose}
        />
      ))}

      {!maxReached && (
        <button
          className="terminal-tabs__add"
          aria-label="New terminal"
          title={`New terminal (max ${MAX_TERMINALS})`}
          onClick={onAdd}
        >
          +
        </button>
      )}

      <div className="terminal-tabs__spacer" aria-hidden="true" />
    </div>
  );
}
