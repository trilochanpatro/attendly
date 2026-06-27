import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, query, get, run, exec } from './db.js';
import { verifyToken, requireRole, JWT_SECRET } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
initDb();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const frontendDist = path.join(__dirname, '../frontend/dist');

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username/Roll number and password are required.' });
  }

  try {
    // Find user by username/roll number or email
    const user = get(
      'SELECT * FROM users WHERE username = ? OR email = ? OR roll_number = ?',
      [username, username, username]
    );

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return profile details
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        roll_number: user.roll_number,
        department_id: user.department_id,
        semester_id: user.semester_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

app.get('/api/auth/me', verifyToken, (req, res) => {
  try {
    const user = get(
      'SELECT id, username, role, name, email, roll_number, department_id, semester_id FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, role, name, email, roll_number, department_id, semester_id } = req.body;

  if (!username || !password || !role || !name || !email) {
    return res.status(400).json({ message: 'Missing required user fields.' });
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    run(
      `INSERT INTO users (username, password, role, name, email, roll_number, department_id, semester_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        hashedPassword,
        role,
        name,
        email,
        role === 'student' ? roll_number : null,
        role !== 'admin' ? parseInt(department_id) : null,
        role === 'student' ? parseInt(semester_id) : null
      ]
    );

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: 'Username, email, or roll number already exists.' });
    }
    res.status(500).json({ message: 'Error registering user: ' + error.message });
  }
});

app.get('/api/auth/departments', (req, res) => {
  try {
    const depts = query('SELECT * FROM departments ORDER BY name');
    res.json(depts);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving departments.' });
  }
});

app.get('/api/auth/semesters', (req, res) => {
  try {
    const semesters = query('SELECT * FROM semesters ORDER BY id');
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving semesters.' });
  }
});


// ==========================================
// 2. COMMON / LOOKUP ROUTES
// ==========================================

app.get('/api/departments', verifyToken, (req, res) => {
  try {
    const depts = query('SELECT * FROM departments ORDER BY name');
    res.json(depts);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving departments.' });
  }
});

app.get('/api/semesters', verifyToken, (req, res) => {
  try {
    const semesters = query('SELECT * FROM semesters ORDER BY id');
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving semesters.' });
  }
});

app.get('/api/subjects', verifyToken, (req, res) => {
  const { department_id, semester_id } = req.query;
  try {
    let sql = `
      SELECT s.*, d.name as department_name, sem.name as semester_name 
      FROM subjects s
      JOIN departments d ON s.department_id = d.id
      JOIN semesters sem ON s.semester_id = sem.id
    `;
    const params = [];

    if (department_id && semester_id) {
      sql += ' WHERE s.department_id = ? AND s.semester_id = ?';
      params.push(department_id, semester_id);
    } else if (department_id) {
      sql += ' WHERE s.department_id = ?';
      params.push(department_id);
    } else if (semester_id) {
      sql += ' WHERE s.semester_id = ?';
      params.push(semester_id);
    }

    sql += ' ORDER BY s.code';
    const subjects = query(sql, params);
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving subjects.' });
  }
});


// ==========================================
// 3. ADMINISTRATOR ROUTES (Admin only)
// ==========================================

// Users Management
app.get('/api/admin/users', verifyToken, requireRole(['admin']), (req, res) => {
  const { role, department_id, semester_id } = req.query;
  try {
    let sql = `
      SELECT u.id, u.username, u.role, u.name, u.email, u.roll_number, 
             u.department_id, u.semester_id, d.name as department_name, s.name as semester_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN semesters s ON u.semester_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      sql += ' AND u.role = ?';
      params.push(role);
    }
    if (department_id) {
      sql += ' AND u.department_id = ?';
      params.push(department_id);
    }
    if (semester_id) {
      sql += ' AND u.semester_id = ?';
      params.push(semester_id);
    }

    sql += ' ORDER BY u.role, u.name';
    const users = query(sql, params);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving users.' });
  }
});

app.post('/api/admin/users', verifyToken, requireRole(['admin']), (req, res) => {
  const { username, password, role, name, email, roll_number, department_id, semester_id } = req.body;

  if (!username || !password || !role || !name || !email) {
    return res.status(400).json({ message: 'Missing required user fields.' });
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    run(
      `INSERT INTO users (username, password, role, name, email, roll_number, department_id, semester_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        hashedPassword,
        role,
        name,
        email,
        role === 'student' ? roll_number : null,
        role !== 'admin' ? department_id : null,
        role === 'student' ? semester_id : null
      ]
    );

    res.status(201).json({ message: 'User created successfully.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: 'Username, email, or roll number already exists.' });
    }
    res.status(500).json({ message: 'Error creating user: ' + error.message });
  }
});

app.put('/api/admin/users/:id', verifyToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { username, password, role, name, email, roll_number, department_id, semester_id } = req.body;

  if (!username || !role || !name || !email) {
    return res.status(400).json({ message: 'Missing required user fields.' });
  }

  try {
    let sql, params;
    if (password && password.trim() !== '') {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      sql = `
        UPDATE users 
        SET username = ?, password = ?, role = ?, name = ?, email = ?, 
            roll_number = ?, department_id = ?, semester_id = ?
        WHERE id = ?
      `;
      params = [
        username,
        hashedPassword,
        role,
        name,
        email,
        role === 'student' ? roll_number : null,
        role !== 'admin' ? department_id : null,
        role === 'student' ? semester_id : null,
        id
      ];
    } else {
      sql = `
        UPDATE users 
        SET username = ?, role = ?, name = ?, email = ?, 
            roll_number = ?, department_id = ?, semester_id = ?
        WHERE id = ?
      `;
      params = [
        username,
        role,
        name,
        email,
        role === 'student' ? roll_number : null,
        role !== 'admin' ? department_id : null,
        role === 'student' ? semester_id : null,
        id
      ];
    }

    run(sql, params);
    res.json({ message: 'User updated successfully.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: 'Username, email, or roll number already exists.' });
    }
    res.status(500).json({ message: 'Error updating user.' });
  }
});

app.delete('/api/admin/users/:id', verifyToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  try {
    run('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user.' });
  }
});

// Departments CRUD
app.post('/api/admin/departments', verifyToken, requireRole(['admin']), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Department name required.' });
  try {
    run('INSERT INTO departments (name) VALUES (?)', [name]);
    res.status(201).json({ message: 'Department created.' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating department.' });
  }
});

app.put('/api/admin/departments/:id', verifyToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Department name required.' });
  try {
    run('UPDATE departments SET name = ? WHERE id = ?', [name, id]);
    res.json({ message: 'Department updated.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating department.' });
  }
});

app.delete('/api/admin/departments/:id', verifyToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  try {
    run('DELETE FROM departments WHERE id = ?', [id]);
    res.json({ message: 'Department deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting department.' });
  }
});

// Subjects CRUD
app.post('/api/admin/subjects', verifyToken, requireRole(['admin']), (req, res) => {
  const { name, code, department_id, semester_id } = req.body;
  if (!name || !code || !department_id || !semester_id) {
    return res.status(400).json({ message: 'Missing fields.' });
  }
  try {
    run(
      'INSERT INTO subjects (name, code, department_id, semester_id) VALUES (?, ?, ?, ?)',
      [name, code, department_id, semester_id]
    );
    res.status(201).json({ message: 'Subject created.' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating subject.' });
  }
});

app.put('/api/admin/subjects/:id', verifyToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { name, code, department_id, semester_id } = req.body;
  if (!name || !code || !department_id || !semester_id) {
    return res.status(400).json({ message: 'Missing fields.' });
  }
  try {
    run(
      'UPDATE subjects SET name = ?, code = ?, department_id = ?, semester_id = ? WHERE id = ?',
      [name, code, department_id, semester_id, id]
    );
    res.json({ message: 'Subject updated.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating subject.' });
  }
});

app.delete('/api/admin/subjects/:id', verifyToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  try {
    run('DELETE FROM subjects WHERE id = ?', [id]);
    res.json({ message: 'Subject deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting subject.' });
  }
});

// Faculty Subject Assignments
app.get('/api/admin/assignments', verifyToken, requireRole(['admin']), (req, res) => {
  try {
    const assignments = query(`
      SELECT fs.id, fs.faculty_id, fs.subject_id, u.name as faculty_name, u.email as faculty_email,
             s.name as subject_name, s.code as subject_code, d.name as department_name, sem.name as semester_name
      FROM faculty_subjects fs
      JOIN users u ON fs.faculty_id = u.id
      JOIN subjects s ON fs.subject_id = s.id
      JOIN departments d ON s.department_id = d.id
      JOIN semesters sem ON s.semester_id = sem.id
      ORDER BY u.name, s.code
    `);
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving assignments.' });
  }
});

app.post('/api/admin/assignments', verifyToken, requireRole(['admin']), (req, res) => {
  const { faculty_id, subject_id } = req.body;
  if (!faculty_id || !subject_id) {
    return res.status(400).json({ message: 'Faculty and Subject IDs required.' });
  }
  try {
    run('INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (?, ?)', [faculty_id, subject_id]);
    res.status(201).json({ message: 'Subject assigned successfully.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: 'Subject already assigned to this faculty.' });
    }
    res.status(500).json({ message: 'Error assigning subject.' });
  }
});

app.delete('/api/admin/assignments/:id', verifyToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  try {
    run('DELETE FROM faculty_subjects WHERE id = ?', [id]);
    res.json({ message: 'Assignment removed.' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing assignment.' });
  }
});

app.put('/api/admin/assignments/:id', verifyToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { faculty_id, subject_id } = req.body;
  if (!faculty_id || !subject_id) {
    return res.status(400).json({ message: 'Faculty and Subject IDs required.' });
  }
  try {
    run('UPDATE faculty_subjects SET faculty_id = ?, subject_id = ? WHERE id = ?', [parseInt(faculty_id), parseInt(subject_id), id]);
    res.json({ message: 'Assignment updated successfully.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ message: 'Subject already assigned to this faculty.' });
    }
    res.status(500).json({ message: 'Error updating assignment.' });
  }
});

// Dashboard Analytics & Charts
app.get('/api/admin/stats', verifyToken, requireRole(['admin']), (req, res) => {
  try {
    const students = get("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
    const faculty = get("SELECT COUNT(*) as count FROM users WHERE role = 'faculty'");
    const subjects = get("SELECT COUNT(*) as count FROM subjects");
    const departments = get("SELECT COUNT(*) as count FROM departments");

    // Average overall attendance percentage
    const avgAttendance = get(`
      SELECT COALESCE(COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 100.0) as rate 
      FROM attendance
    `);

    // Today's attendance stats
    const today = new Date().toISOString().split('T')[0];
    const todayStats = get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late
      FROM attendance
      WHERE date = ?
    `, [today]);

    res.json({
      students: students.count,
      faculty: faculty.count,
      subjects: subjects.count,
      departments: departments.count,
      overallAttendanceRate: Math.round(avgAttendance.rate * 100) / 100,
      today: {
        date: today,
        total: todayStats.total,
        present: todayStats.present,
        absent: todayStats.absent,
        late: todayStats.late
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating stats.' });
  }
});

// Daily attendance trends (last 7 dates marked)
app.get('/api/admin/charts/daily', verifyToken, requireRole(['admin']), (req, res) => {
  try {
    const dailyData = query(`
      SELECT date,
             COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
             COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
             COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
             COUNT(*) as total
      FROM attendance
      GROUP BY date
      ORDER BY date DESC
      LIMIT 10
    `);
    // Return in chronological order
    res.json(dailyData.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Error generating daily charts.' });
  }
});

// Subject-wise attendance charts
app.get('/api/admin/charts/subject-wise', verifyToken, requireRole(['admin']), (req, res) => {
  try {
    const subjectData = query(`
      SELECT s.code, s.name,
             COALESCE(COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 100.0) as rate
      FROM subjects s
      LEFT JOIN attendance a ON s.id = a.subject_id
      GROUP BY s.id
      ORDER BY s.code
    `);
    res.json(subjectData.map(d => ({ ...d, rate: Math.round(d.rate * 100) / 100 })));
  } catch (error) {
    res.status(500).json({ message: 'Error generating subject charts.' });
  }
});

// Semester-wise attendance trends
app.get('/api/admin/charts/semester-wise', verifyToken, requireRole(['admin']), (req, res) => {
  try {
    const semData = query(`
      SELECT sem.name,
             COALESCE(COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 100.0) as rate
      FROM semesters sem
      JOIN subjects sub ON sem.id = sub.semester_id
      LEFT JOIN attendance a ON sub.id = a.subject_id
      GROUP BY sem.id
      ORDER BY sem.id
    `);
    res.json(semData.map(d => ({ ...d, rate: Math.round(d.rate * 100) / 100 })));
  } catch (error) {
    res.status(500).json({ message: 'Error generating semester charts.' });
  }
});

// List students below a threshold (default 75%)
app.get('/api/admin/low-attendance', verifyToken, requireRole(['admin']), (req, res) => {
  const threshold = parseFloat(req.query.threshold || 75.0);
  try {
    const lowAtt = query(`
      SELECT u.id, u.name, u.roll_number, d.name as department_name, sem.name as semester_name,
             sub.code as subject_code, sub.name as subject_name,
             COUNT(a.id) as total_classes,
             COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
             COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
             COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
             COALESCE(COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 100.0) as rate
      FROM users u
      JOIN departments d ON u.department_id = d.id
      JOIN semesters sem ON u.semester_id = sem.id
      CROSS JOIN subjects sub ON sub.department_id = d.id AND sub.semester_id = sem.id
      LEFT JOIN attendance a ON u.id = a.student_id AND sub.id = a.subject_id
      WHERE u.role = 'student'
      GROUP BY u.id, sub.id
      HAVING rate < ? AND total_classes > 0
      ORDER BY rate ASC
    `, [threshold]);
    res.json(lowAtt.map(d => ({ ...d, rate: Math.round(d.rate * 100) / 100 })));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving low attendance data.' });
  }
});

// Comprehensive attendance details report (filters: department, semester, subject, student)
app.get('/api/admin/attendance-details', verifyToken, requireRole(['admin']), (req, res) => {
  const { department_id, semester_id, subject_id, student_id } = req.query;
  try {
    let sql = `
      SELECT a.id, a.date, a.status, 
             st.name as student_name, st.roll_number, 
             dept.name as department_name, sem.name as semester_name,
             sub.name as subject_name, sub.code as subject_code,
             f.name as marked_by_name
      FROM attendance a
      JOIN users st ON a.student_id = st.id
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN departments dept ON st.department_id = dept.id
      JOIN semesters sem ON st.semester_id = sem.id
      LEFT JOIN users f ON a.marked_by = f.id
      WHERE 1=1
    `;
    const params = [];

    if (department_id) {
      sql += ' AND st.department_id = ?';
      params.push(department_id);
    }
    if (semester_id) {
      sql += ' AND st.semester_id = ?';
      params.push(semester_id);
    }
    if (subject_id) {
      sql += ' AND a.subject_id = ?';
      params.push(subject_id);
    }
    if (student_id) {
      sql += ' AND a.student_id = ?';
      params.push(student_id);
    }

    sql += ' ORDER BY a.date DESC, st.roll_number ASC';
    const logs = query(sql, params);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving detailed attendance reports.' });
  }
});

// Data Backup (JSON Export)
app.get('/api/admin/backup', verifyToken, requireRole(['admin']), (req, res) => {
  try {
    const data = {
      departments: query('SELECT * FROM departments'),
      semesters: query('SELECT * FROM semesters'),
      subjects: query('SELECT * FROM subjects'),
      users: query('SELECT * FROM users'), // Hashes are safe since password editing checks
      faculty_subjects: query('SELECT * FROM faculty_subjects'),
      attendance: query('SELECT * FROM attendance')
    };
    res.setHeader('Content-disposition', 'attachment; filename=attendly_backup.json');
    res.setHeader('Content-type', 'application/json');
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error backing up database.' });
  }
});

// Data Restore (JSON Import)
app.post('/api/admin/restore', verifyToken, requireRole(['admin']), (req, res) => {
  const { departments, semesters, subjects, users, faculty_subjects, attendance } = req.body;
  if (!departments || !semesters || !subjects || !users || !faculty_subjects || !attendance) {
    return res.status(400).json({ message: 'Invalid backup structure. All tables must be present.' });
  }

  try {
    // Run database rebuild inside transactional boundaries
    run('PRAGMA foreign_keys = OFF;');

    // Clear current tables
    run('DELETE FROM attendance');
    run('DELETE FROM faculty_subjects');
    run('DELETE FROM users');
    run('DELETE FROM subjects');
    run('DELETE FROM semesters');
    run('DELETE FROM departments');

    // Restore Departments
    departments.forEach(d => {
      run('INSERT INTO departments (id, name) VALUES (?, ?)', [d.id, d.name]);
    });

    // Restore Semesters
    semesters.forEach(s => {
      run('INSERT INTO semesters (id, name) VALUES (?, ?)', [s.id, s.name]);
    });

    // Restore Subjects
    subjects.forEach(s => {
      run(
        'INSERT INTO subjects (id, name, code, department_id, semester_id) VALUES (?, ?, ?, ?, ?)',
        [s.id, s.name, s.code, s.department_id, s.semester_id]
      );
    });

    // Restore Users
    users.forEach(u => {
      run(
        `INSERT INTO users (id, username, password, role, name, email, roll_number, department_id, semester_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, u.username, u.password, u.role, u.name, u.email, u.roll_number, u.department_id, u.semester_id]
      );
    });

    // Restore Faculty Subject Assignments
    faculty_subjects.forEach(fs => {
      run(
        'INSERT INTO faculty_subjects (id, faculty_id, subject_id) VALUES (?, ?, ?)',
        [fs.id, fs.faculty_id, fs.subject_id]
      );
    });

    // Restore Attendance logs
    attendance.forEach(a => {
      run(
        `INSERT INTO attendance (id, student_id, subject_id, date, status, marked_by, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.id, a.student_id, a.subject_id, a.date, a.status, a.marked_by, a.created_at, a.updated_at]
      );
    });

    run('PRAGMA foreign_keys = ON;');
    res.json({ message: 'Database restored successfully!' });
  } catch (error) {
    run('PRAGMA foreign_keys = ON;');
    res.status(500).json({ message: 'Error restoring database: ' + error.message });
  }
});


// ==========================================
// 4. FACULTY ROUTES (Faculty only)
// ==========================================

// Get subjects assigned to specific faculty
app.get('/api/faculty/subjects', verifyToken, requireRole(['faculty']), (req, res) => {
  try {
    const subjects = query(`
      SELECT fs.id as assignment_id, s.id as subject_id, s.name, s.code, 
             dept.id as department_id, dept.name as department_name, 
             sem.id as semester_id, sem.name as semester_name
      FROM faculty_subjects fs
      JOIN subjects s ON fs.subject_id = s.id
      JOIN departments dept ON s.department_id = dept.id
      JOIN semesters sem ON s.semester_id = sem.id
      WHERE fs.faculty_id = ?
      ORDER BY s.code
    `, [req.user.id]);
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving assigned subjects.' });
  }
});

// Get student list for marking attendance (by dept and semester)
app.get('/api/faculty/students', verifyToken, requireRole(['faculty']), (req, res) => {
  const { department_id, semester_id } = req.query;
  if (!department_id || !semester_id) {
    return res.status(400).json({ message: 'Department and Semester IDs required.' });
  }

  try {
    const students = query(`
      SELECT id, name, roll_number, email 
      FROM users 
      WHERE role = 'student' AND department_id = ? AND semester_id = ?
      ORDER BY roll_number ASC
    `, [department_id, semester_id]);
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving students.' });
  }
});

// Fetch attendance status for a specific subject & date
app.get('/api/faculty/attendance', verifyToken, requireRole(['faculty']), (req, res) => {
  const { subject_id, date } = req.query;
  if (!subject_id || !date) {
    return res.status(400).json({ message: 'Subject ID and Date required.' });
  }

  try {
    const attendanceRecords = query(`
      SELECT student_id, status, updated_at, created_at
      FROM attendance
      WHERE subject_id = ? AND date = ?
    `, [subject_id, date]);
    res.json(attendanceRecords);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving attendance records.' });
  }
});

// Mark / Update Daily Attendance
app.post('/api/faculty/attendance', verifyToken, requireRole(['faculty']), (req, res) => {
  const { subject_id, date, records } = req.body; // records: [{student_id, status: 'present'/'absent'/'late'}]

  if (!subject_id || !date || !records || !Array.isArray(records)) {
    return res.status(400).json({ message: 'Invalid parameters. Need subject_id, date, and records.' });
  }

  try {
    const timestamp = new Date().toISOString();

    // Process each student record
    records.forEach(record => {
      const { student_id, status } = record;

      // Upsert: Try insert, on conflict update status and updated_at
      run(`
        INSERT INTO attendance (student_id, subject_id, date, status, marked_by)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(student_id, subject_id, date) DO UPDATE SET
          status = excluded.status,
          marked_by = excluded.marked_by,
          updated_at = ?
      `, [student_id, subject_id, date, status, req.user.id, timestamp]);
    });

    res.json({ message: 'Attendance records updated successfully.' });
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ message: 'Error saving attendance: ' + error.message });
  }
});

// Faculty Class Summary Report
app.get('/api/faculty/reports', verifyToken, requireRole(['faculty']), (req, res) => {
  const { subject_id } = req.query;
  if (!subject_id) return res.status(400).json({ message: 'Subject ID required.' });

  try {
    // Subject details to verify assignment
    const isAssigned = get(
      'SELECT id FROM faculty_subjects WHERE faculty_id = ? AND subject_id = ?',
      [req.user.id, subject_id]
    );
    if (!isAssigned) {
      return res.status(403).json({ message: 'Access denied. You do not teach this subject.' });
    }

    const report = query(`
      SELECT u.id as student_id, u.name as student_name, u.roll_number,
             COUNT(a.id) as total_classes,
             COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
             COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
             COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
             COALESCE(COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 100.0) as attendance_percentage
      FROM subjects sub
      JOIN users u ON u.department_id = sub.department_id AND u.semester_id = sub.semester_id
      LEFT JOIN attendance a ON u.id = a.student_id AND sub.id = a.subject_id
      WHERE sub.id = ? AND u.role = 'student'
      GROUP BY u.id
      ORDER BY u.roll_number ASC
    `, [subject_id]);

    res.json(report.map(r => ({
      ...r,
      attendance_percentage: Math.round(r.attendance_percentage * 100) / 100
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error generating reports.' });
  }
});


// ==========================================
// 5. STUDENT ROUTES (Student only)
// ==========================================

app.get('/api/student/dashboard', verifyToken, requireRole(['student']), (req, res) => {
  try {
    const studentId = req.user.id;

    // Get student details
    const student = get(`
      SELECT u.id, u.name, u.roll_number, d.name as department_name, sem.name as semester_name,
             u.department_id, u.semester_id
      FROM users u
      JOIN departments d ON u.department_id = d.id
      JOIN semesters sem ON u.semester_id = sem.id
      WHERE u.id = ?
    `, [studentId]);

    if (!student) {
      return res.status(404).json({ message: 'Student details not found.' });
    }

    // Get subject-wise attendance stats
    const subjectsStats = query(`
      SELECT s.id as subject_id, s.name as subject_name, s.code as subject_code,
             COUNT(a.id) as total_classes,
             COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
             COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
             COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
             COALESCE(COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0), 100.0) as attendance_percentage
      FROM subjects s
      LEFT JOIN attendance a ON s.id = a.subject_id AND a.student_id = ?
      WHERE s.department_id = ? AND s.semester_id = ?
      GROUP BY s.id
      ORDER BY s.code
    `, [studentId, student.department_id, student.semester_id]);

    const formattedStats = subjectsStats.map(s => ({
      ...s,
      attendance_percentage: Math.round(s.attendance_percentage * 100) / 100
    }));

    // Calculate overall percentage
    let totalClassesAll = 0;
    let attendedClassesAll = 0;

    formattedStats.forEach(s => {
      totalClassesAll += s.total_classes;
      attendedClassesAll += (s.present_count + s.late_count);
    });

    const overallPercentage = totalClassesAll > 0
      ? Math.round((attendedClassesAll * 100.0 / totalClassesAll) * 100) / 100
      : 100.0;

    res.json({
      student,
      subjects: formattedStats,
      overallPercentage,
      totalClasses: totalClassesAll,
      attendedClasses: attendedClassesAll
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    res.status(500).json({ message: 'Error retrieving student dashboard.' });
  }
});

app.get('/api/student/history', verifyToken, requireRole(['student']), (req, res) => {
  try {
    const studentId = req.user.id;
    const history = query(`
      SELECT a.id, a.date, a.status, s.name as subject_name, s.code as subject_code, f.name as marked_by_name
      FROM attendance a
      JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN users f ON a.marked_by = f.id
      WHERE a.student_id = ?
      ORDER BY a.date DESC, s.code ASC
    `, [studentId]);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving history.' });
  }
});


// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendDist));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Attendly backend is running.');
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
