/** EditorPage — container for the Monaco-based code editor (Phase 6) */
import { useContext } from 'react';
import { EditorContext } from '../contexts/EditorContext';
import EditorTabs from '../components/editor/EditorTabs';
import EditorToolbar from '../components/editor/EditorToolbar';
import MonacoEditor from '../components/editor/MonacoEditor';
import WelcomeTab from '../components/editor/WelcomeTab';
import { useMinimapToggle } from '../hooks/useMinimapToggle';
import './pages.css';
import './EditorPage.css';

export default function EditorPage() {
  const editor = useContext(EditorContext);
  const { minimapEnabled, toggleMinimap } = useMinimapToggle();

  if (!editor) {
    return (
      <div className="editor-page">
        <WelcomeTab />
      </div>
    );
  }

  const { tabs, activeTabPath, activeTab, setActiveTab, closeTab, updateContent, isSaving } = editor;

  return (
    <div className="editor-page">
      <EditorTabs
        tabs={tabs}
        activeTabPath={activeTabPath}
        onActivate={setActiveTab}
        onClose={closeTab}
      />

      {activeTab ? (
        <>
          <EditorToolbar
            language={activeTab.language}
            minimapEnabled={minimapEnabled}
            onToggleMinimap={toggleMinimap}
            isSaving={isSaving}
            filePath={activeTab.path}
          />
          <MonacoEditor
            key={activeTab.path}
            content={activeTab.content}
            language={activeTab.language}
            minimapEnabled={minimapEnabled}
            onChange={(value) => updateContent(activeTab.path, value)}
          />
        </>
      ) : (
        <WelcomeTab />
      )}
    </div>
  );
}
