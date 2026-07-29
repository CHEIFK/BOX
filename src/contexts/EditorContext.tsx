/** EditorContext — provides openFile() globally so the Files panel can open files */
import { createContext, useContext } from 'react';
import type { UseEditorReturn } from '../hooks/useEditor';

export type EditorContextValue = UseEditorReturn;

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditorContext(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error('useEditorContext must be used inside EditorContext.Provider');
  }
  return ctx;
}
