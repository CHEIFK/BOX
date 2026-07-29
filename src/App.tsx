/** App — Root component; sets up routing for AGY Studio */
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ChatPage     from './pages/ChatPage';
import FilesPage    from './pages/FilesPage';
import EditorPage   from './pages/EditorPage';
import TerminalPage from './pages/TerminalPage';
import SettingsPage from './pages/SettingsPage';
import { AgyProvider } from './contexts/AgyContext';

export default function App() {
  return (
    <AgyProvider>
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/chat" replace />} />
            <Route path="/chat"     element={<ChatPage />} />
            <Route path="/files"    element={<FilesPage />} />
            <Route path="/editor"   element={<EditorPage />} />
            <Route path="/terminal" element={<TerminalPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AgyProvider>
  );
}
