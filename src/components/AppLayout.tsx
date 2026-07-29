/** AppLayout — Shell that wraps all pages */
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import StatusBar from './StatusBar';
import './AppLayout.css';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <div className="app-layout__body">
        <Sidebar />
        <div className="app-layout__main">
          <Header />
          <main className="app-layout__content" role="main">
            <Outlet />
          </main>
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
