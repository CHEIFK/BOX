/** Sidebar — Primary navigation panel */
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  title: string;   // tooltip when collapsed
}

const NAV_ITEMS: NavItem[] = [
  { path: '/chat',     icon: '💬', label: 'Chat',     title: 'Chat' },
  { path: '/files',    icon: '📁', label: 'Files',    title: 'Files' },
  { path: '/editor',   icon: '✏️',  label: 'Editor',   title: 'Editor' },
  { path: '/terminal', icon: '⬛', label: 'Terminal', title: 'Terminal' },
];

const BOTTOM_ITEMS: NavItem[] = [
  { path: '/settings', icon: '⚙️', label: 'Settings', title: 'Settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}
      aria-label="Primary navigation"
    >
      {/* Logo */}
      <div className="sidebar__logo">
        <span className="sidebar__logo-mark" aria-hidden="true">A</span>
        <span className="sidebar__logo-text">AGY Studio</span>
      </div>

      {/* Main nav */}
      <nav className="sidebar__nav" aria-label="Main">
        <div className="sidebar__nav-section">
          <div className="sidebar__nav-label" aria-hidden={collapsed}>Workspace</div>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
              }
              title={collapsed ? item.title : undefined}
            >
              <span className="sidebar__nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="sidebar__nav-text">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom nav (Settings) */}
      <div className="sidebar__nav-section" style={{ paddingBottom: '4px' }}>
        {BOTTOM_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
            }
            title={collapsed ? item.title : undefined}
          >
            <span className="sidebar__nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="sidebar__nav-text">{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Collapse toggle */}
      <div className="sidebar__toggle">
        <button
          className="sidebar__toggle-btn"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          ‹
        </button>
      </div>
    </aside>
  );
}
