import React, { createContext, useState, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './views/Login';
import AdminDashboard from './views/AdminDashboard';
import FacultyDashboard from './views/FacultyDashboard';
import StudentDashboard from './views/StudentDashboard';
import Sidebar from './components/Sidebar';
import { Moon, Sun, LogOut } from 'lucide-react';

// Create Contexts
export const AuthContext = createContext(null);
export const ThemeContext = createContext(null);

export const useAuth = () => useContext(AuthContext);
export const useTheme = () => useContext(ThemeContext);

// Layout for Authenticated Pages
const AppLayout = ({ activeTab, setActiveTab, children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Get user initials for profile badge
  const getInitials = (name) => {
    return name
      ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : 'U';
  };

  return (
    <div class="app-container">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div class="main-content">
        <header class="top-header">
          <div class="header-title-section">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 800 }}>
              Attendly <span style={{ fontSize: '0.8rem', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(128, 0, 32, 0.08)', color: '#800020' }}>College Portal</span>
            </h1>
          </div>
          <div class="header-user-section">
            <button class="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div class="user-profile-badge">
              <div class="profile-avatar">{getInitials(user.name)}</div>
              <div class="profile-info">
                <span class="profile-name">{user.name}</span>
                <span class="profile-role">{user.role}</span>
              </div>
            </div>
            <button
              class="theme-toggle-btn"
              onClick={logout}
              title="Sign Out"
              style={{ marginLeft: '10px', color: '#ef4444' }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main class="page-container">
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('attendly-user') || 'null');
    } catch {
      return null;
    }
  })();

  const [user, setUser] = useState(storedUser);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Apply theme class
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Reset tab to dashboard on user login/change
  useEffect(() => {
    setActiveTab('dashboard');
  }, [user]);

  // Fetch current user details if token exists
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      const savedUser = (() => {
        try {
          return JSON.parse(localStorage.getItem('attendly-user') || 'null');
        } catch {
          return null;
        }
      })();

      if (token.startsWith('demo-') && savedUser) {
        setUser(savedUser);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          localStorage.setItem('attendly-user', JSON.stringify(data.user));
        } else if (savedUser) {
          setUser(savedUser);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('attendly-user');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Auth verification failed', err);
        if (savedUser) {
          setUser(savedUser);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('attendly-user');
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('attendly-user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('attendly-user');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Outfit, sans-serif',
        backgroundColor: theme === 'light' ? '#f8fafc' : '#090d16',
        color: theme === 'light' ? '#0f172a' : '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#800020', letterSpacing: '1px' }}>Attendly</h2>
          <p style={{ marginTop: '8px', color: '#94a3b8', fontSize: '0.9rem' }}>Securing institution portals...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <AuthContext.Provider value={{ user, token, login, logout }}>
        <Router>
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/dashboard" replace /> : <Login />}
            />

            <Route
              path="/dashboard"
              element={
                user ? (
                  <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
                    {user.role === 'admin' && <AdminDashboard activeTab={activeTab} />}
                    {user.role === 'faculty' && <FacultyDashboard activeTab={activeTab} />}
                    {user.role === 'student' && <StudentDashboard activeTab={activeTab} />}
                  </AppLayout>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="*"
              element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
            />
          </Routes>
        </Router>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}
