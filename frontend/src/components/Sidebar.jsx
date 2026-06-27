import React from 'react';
import { useAuth } from '../App';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Building, 
  FileSpreadsheet, 
  Database,
  CheckSquare,
  History,
  LogOut,
  GraduationCap
} from 'lucide-react';

export default function Sidebar({ activeTab, onTabChange }) {
  const { user, logout } = useAuth();

  const getNavItems = (role) => {
    switch (role) {
      case 'admin':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
          { id: 'users', label: 'Manage Users', icon: <Users size={18} /> },
          { id: 'subjects', label: 'Subjects & Faculty', icon: <BookOpen size={18} /> },
          { id: 'departments', label: 'Courses & Depts', icon: <Building size={18} /> },
          { id: 'reports', label: 'Attendance Reports', icon: <FileSpreadsheet size={18} /> },
          { id: 'backup', label: 'System Backup', icon: <Database size={18} /> },
        ];
      case 'faculty':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
          { id: 'mark', label: 'Mark Attendance', icon: <CheckSquare size={18} /> },
          { id: 'reports', label: 'Class Reports', icon: <FileSpreadsheet size={18} /> },
        ];
      case 'student':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
          { id: 'history', label: 'Attendance History', icon: <History size={18} /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems(user?.role);

  return (
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">
          <GraduationCap size={20} />
        </div>
        <span class="logo-text">Attendly</span>
      </div>
      
      <ul class="sidebar-menu">
        {navItems.map((item) => (
          <li key={item.id}>
            <span 
              onClick={() => onTabChange(item.id)}
              class={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </span>
          </li>
        ))}
      </ul>
      
      <div class="sidebar-footer">
        <span 
          onClick={logout} 
          class="sidebar-link" 
          style={{ color: '#ef4444' }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </span>
      </div>
    </aside>
  );
}
