import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { GraduationCap, Lock, User, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Registration form state
  const [isRegister, setIsRegister] = useState(false);
  const [regForm, setRegForm] = useState({
    username: '',
    password: '',
    role: 'student',
    name: '',
    email: '',
    roll_number: '',
    department_id: '',
    semester_id: ''
  });

  // Lookups for registration
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isRegister) {
      setError(null);
      setSuccess(null);
      // Fetch departments and semesters publicly
      fetch('/api/auth/departments')
        .then(res => res.json())
        .then(data => setDepartments(data))
        .catch(err => console.error(err));

      fetch('/api/auth/semesters')
        .then(res => res.json())
        .then(data => setSemesters(data))
        .catch(err => console.error(err));
    }
  }, [isRegister]);

  const demoLogin = (userInput, passInput) => {
    const demoAccounts = {
      'admin@college.edu': {
        token: 'demo-admin-token',
        user: {
          id: 1,
          username: 'admin',
          role: 'admin',
          name: 'Dean Rajesh Sharma',
          email: 'admin@college.edu'
        }
      },
      'aditya@college.edu': {
        token: 'demo-faculty-token',
        user: {
          id: 2,
          username: 'aditya',
          role: 'faculty',
          name: 'Prof. Aditya Verma',
          email: 'aditya@college.edu'
        }
      },
      'student@college.edu': {
        token: 'demo-student-token',
        user: {
          id: 3,
          username: 'CS202601',
          role: 'student',
          name: 'Aarav Mehta',
          email: 'student@college.edu',
          roll_number: 'CS202601'
        }
      }
    };

    const passMap = {
      'admin@college.edu': 'admin123',
      'aditya@college.edu': 'faculty123',
      'student@college.edu': 'student123'
    };

    if (demoAccounts[userInput] && passMap[userInput] === passInput) {
      return demoAccounts[userInput];
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError(null);
    setLoading(true);

    const demoUser = demoLogin(username, password);
    if (demoUser) {
      login(demoUser.token, demoUser.user);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token, data.user);
      } else {
        setError(data.message || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      const fallbackDemo = demoLogin(username, password);
      if (fallbackDemo) {
        login(fallbackDemo.token, fallbackDemo.user);
      } else {
        setError('Cannot reach server. Verify connection.');
        console.error('Login request error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!regForm.username || !regForm.password || !regForm.name || !regForm.email) {
      setError('Please fill in all required fields.');
      return;
    }

    if (regForm.role === 'student' && (!regForm.roll_number || !regForm.department_id || !regForm.semester_id)) {
      setError('Please specify your Course/Department, Semester, and Roll Number.');
      return;
    }

    if (regForm.role === 'faculty' && !regForm.department_id) {
      setError('Please specify your assigned Department/Course.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Registration successful! You can now log in.');
        // Reset form
        setRegForm({
          username: '',
          password: '',
          role: 'student',
          name: '',
          email: '',
          roll_number: '',
          department_id: '',
          semester_id: ''
        });
        setTimeout(() => {
          setIsRegister(false);
        }, 1500);
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch (err) {
      setError('Network error during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role) => {
    if (role === 'admin') {
      setUsername('admin@college.edu');
      setPassword('admin123');
    } else if (role === 'faculty') {
      setUsername('aditya@college.edu');
      setPassword('faculty123');
    } else if (role === 'student') {
      setUsername('student@college.edu');
      setPassword('student123');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <GraduationCap size={32} />
          </div>
          <h2>Attendly Portal</h2>
          <p>Online College Attendance Management System</p>
        </div>

        {error && (
          <div className="alert-banner alert-banner-danger" style={{ margin: '0 0 16px 0' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-banner alert-banner-success" style={{ margin: '0 0 16px 0' }}>
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        {!isRegister ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Username / Roll No / Email</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '36px', width: '100%', minWidth: 'auto' }}
                  placeholder="Enter credentials"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: '36px', width: '100%', minWidth: 'auto' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Securing Session...' : 'Sign In'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '8px', color: 'var(--text-secondary)' }}>
              New member?{' '}
              <span
                style={{ color: '#800020', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setIsRegister(true)}
              >
                Create an account
              </span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Account Role</label>
              <select
                className="form-control"
                value={regForm.role}
                onChange={(e) => setRegForm({ ...regForm, role: e.target.value, roll_number: '', department_id: '', semester_id: '' })}
                disabled={loading}
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty Teacher</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="E.g., Amit Kumar"
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="E.g., amit@college.edu"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Username / Login ID</label>
              <input
                type="text"
                className="form-control"
                placeholder="E.g., amit_k"
                value={regForm.username}
                onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Choose password"
                value={regForm.password}
                onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                disabled={loading}
                required
              />
            </div>

            {regForm.role === 'student' && (
              <div className="form-group" style={{ margin: 0 }}>
                <label>Roll Number / Registration ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="E.g., BCA202610"
                  value={regForm.roll_number}
                  onChange={(e) => setRegForm({ ...regForm, roll_number: e.target.value })}
                  disabled={loading}
                  required
                />
              </div>
            )}

            {regForm.role !== 'admin' && (
              <div className="form-group" style={{ margin: 0 }}>
                <label>Course / Department Branch</label>
                <select
                  className="form-control"
                  value={regForm.department_id}
                  onChange={(e) => setRegForm({ ...regForm, department_id: e.target.value })}
                  disabled={loading}
                  required
                >
                  <option value="">Select Course / Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            {regForm.role === 'student' && (
              <div className="form-group" style={{ margin: 0 }}>
                <label>Semester</label>
                <select
                  className="form-control"
                  value={regForm.semester_id}
                  onChange={(e) => setRegForm({ ...regForm, semester_id: e.target.value })}
                  disabled={loading}
                  required
                >
                  <option value="">Select Semester</option>
                  {semesters.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Register'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.875rem', marginTop: '8px', color: 'var(--text-secondary)' }}>
              Already registered?{' '}
              <span
                style={{ color: '#800020', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setIsRegister(false)}
              >
                Sign In
              </span>
            </p>
          </form>
        )}

        {!isRegister && (
          <div className="login-demo-credits">
            <span style={{ fontWeight: 700, display: 'block', marginBottom: '8px' }}>⚡ Quick Demo Accounts:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                onClick={() => handleQuickLogin('admin')}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, padding: '4px 8px' }}
              >
                Admin
              </button>
              <button
                onClick={() => handleQuickLogin('faculty')}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, padding: '4px 8px' }}
              >
                Faculty
              </button>
              <button
                onClick={() => handleQuickLogin('student')}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, padding: '4px 8px' }}
              >
                Student
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
