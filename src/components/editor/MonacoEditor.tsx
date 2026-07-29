/** MonacoEditor — wrapper around @monaco-editor/react with AGY Studio config */
import { useRef } from 'react';
import Editor, { type OnMount, type OnChange } from '@monaco-editor/react';
import type * as MonacoType from 'monaco-editor';
import './MonacoEditor.css';

interface MonacoEditorProps {
  content: string;
  language: string;
  minimapEnabled: boolean;
  onChange: (value: string) => void;
  /** Called once when editor mounts — used to add keybindings */
  onMount?: OnMount;
}

export default function MonacoEditor({
  content,
  language,
  minimapEnabled,
  onChange,
  onMount,
}: MonacoEditorProps) {
  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    onMount?.(editor, monaco);
  };

  const handleChange: OnChange = (value) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  return (
    <div className="monaco-editor-wrapper">
      <Editor
        height="100%"
        language={language}
        value={content}
        theme="vs-dark"
        onChange={handleChange}
        onMount={handleMount}
        options={{
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 13,
          lineHeight: 1.6,
          renderWhitespace: 'selection',
          formatOnPaste: true,
          smoothScrolling: true,
          minimap: { enabled: minimapEnabled },
          bracketPairColorization: { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,
          folding: true,
          lineNumbers: 'on',
          glyphMargin: true,
          contextmenu: true,
        }}
      />
    </div>
  );
}
