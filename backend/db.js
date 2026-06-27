import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DB_PATH
  ? path.resolve(__dirname, process.env.DB_PATH)
  : path.join(__dirname, 'database.db');

// Connect to SQLite DB
const conn = new DatabaseSync(dbPath);

console.log(`Using SQLite database at: ${dbPath}`);

// Helper functions for ease of use
export const query = (sql, params = []) => {
  return conn.prepare(sql).all(...params);
};

export const get = (sql, params = []) => {
  return conn.prepare(sql).get(...params);
};

export const run = (sql, params = []) => {
  return conn.prepare(sql).run(...params);
};

export const exec = (sql) => {
  return conn.exec(sql);
};

// Initialize schema and seed data
export const initDb = () => {
  // Enable foreign keys
  conn.exec('PRAGMA foreign_keys = ON;');

  // Create tables
  conn.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'faculty', 'student')),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      roll_number TEXT UNIQUE,
      department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS faculty_subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      UNIQUE(faculty_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      date TEXT NOT NULL, -- YYYY-MM-DD
      status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late')),
      marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT,
      UNIQUE(student_id, subject_id, date)
    );
  `);

  // Check if seeding is needed
  const deptCount = get('SELECT COUNT(*) as count FROM departments');
  if (deptCount.count > 0) {
    console.log('Database already initialized.');
    seedBca();
    return;
  }

  console.log('Seeding database with default records...');

  // 1. Seed Departments
  const depts = [
    'Computer Science & Engineering',
    'Information Technology',
    'Electronics & Communication Engineering',
    'Mechanical Engineering'
  ];
  depts.forEach(dept => {
    run('INSERT INTO departments (name) VALUES (?)', [dept]);
  });

  // Fetch inserted department IDs
  const deptMap = {};
  query('SELECT id, name FROM departments').forEach(d => {
    deptMap[d.name] = d.id;
  });

  // 2. Seed Semesters
  const sems = [
    'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4',
    'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'
  ];
  sems.forEach(sem => {
    run('INSERT INTO semesters (name) VALUES (?)', [sem]);
  });

  // Fetch inserted semester IDs
  const semMap = {};
  query('SELECT id, name FROM semesters').forEach(s => {
    semMap[s.name] = s.id;
  });

  // 3. Seed Subjects
  // CSE Semester 5 Subjects
  const subjects = [
    { name: 'Database Management Systems', code: 'CS501', dept: 'Computer Science & Engineering', sem: 'Semester 5' },
    { name: 'Web Technologies', code: 'CS502', dept: 'Computer Science & Engineering', sem: 'Semester 5' },
    { name: 'Design & Analysis of Algorithms', code: 'CS503', dept: 'Computer Science & Engineering', sem: 'Semester 5' },
    // CSE Semester 6 Subjects
    { name: 'Software Engineering', code: 'CS601', dept: 'Computer Science & Engineering', sem: 'Semester 6' },
    { name: 'Computer Networks', code: 'CS602', dept: 'Computer Science & Engineering', sem: 'Semester 6' },
    { name: 'Artificial Intelligence', code: 'CS603', dept: 'Computer Science & Engineering', sem: 'Semester 6' },
    // IT Semester 5 Subjects
    { name: 'Software Project Management', code: 'IT501', dept: 'Information Technology', sem: 'Semester 5' },
    { name: 'Internet of Things', code: 'IT502', dept: 'Information Technology', sem: 'Semester 5' }
  ];

  subjects.forEach(sub => {
    run(
      'INSERT INTO subjects (name, code, department_id, semester_id) VALUES (?, ?, ?, ?)',
      [sub.name, sub.code, deptMap[sub.dept], semMap[sub.sem]]
    );
  });

  // Fetch inserted subject IDs
  const subMap = {};
  query('SELECT id, code FROM subjects').forEach(s => {
    subMap[s.code] = s.id;
  });

  // 4. Seed Users (with hashed passwords)
  const salt = bcrypt.genSaltSync(10);
  const adminPassword = bcrypt.hashSync('admin123', salt);
  const facultyPassword = bcrypt.hashSync('faculty123', salt);
  const studentPassword = bcrypt.hashSync('student123', salt);

  // Admin
  run(
    'INSERT INTO users (username, password, role, name, email) VALUES (?, ?, ?, ?, ?)',
    ['admin', adminPassword, 'admin', 'Dean Rajesh Sharma', 'admin@college.edu']
  );

  // Faculty
  run(
    'INSERT INTO users (username, password, role, name, email) VALUES (?, ?, ?, ?, ?)',
    ['aditya', facultyPassword, 'faculty', 'Prof. Aditya Verma', 'aditya@college.edu']
  );
  run(
    'INSERT INTO users (username, password, role, name, email) VALUES (?, ?, ?, ?, ?)',
    ['gayatri', facultyPassword, 'faculty', 'Dr. Gayatri Sen', 'gayatri@college.edu']
  );
  run(
    'INSERT INTO users (username, password, role, name, email) VALUES (?, ?, ?, ?, ?)',
    ['ananya', facultyPassword, 'faculty', 'Dr. Ananya Iyer', 'ananya@college.edu']
  );

  // Fetch inserted faculty IDs
  const facultyMap = {};
  query("SELECT id, username FROM users WHERE role = 'faculty'").forEach(f => {
    facultyMap[f.username] = f.id;
  });

  // Students for CSE Semester 5
  const students = [
    { username: 'CS202601', name: 'Aarav Mehta', email: 'student@college.edu', roll: 'CS202601', dept: 'Computer Science & Engineering', sem: 'Semester 5' },
    { username: 'CS202602', name: 'Diya Patel', email: 'diya.patel@college.edu', roll: 'CS202602', dept: 'Computer Science & Engineering', sem: 'Semester 5' },
    { username: 'CS202603', name: 'Kabir Sharma', email: 'kabir.sharma@college.edu', roll: 'CS202603', dept: 'Computer Science & Engineering', sem: 'Semester 5' },
    { username: 'CS202604', name: 'Ishaan Gupta', email: 'ishaan.gupta@college.edu', roll: 'CS202604', dept: 'Computer Science & Engineering', sem: 'Semester 5' },
    { username: 'CS202605', name: 'Ananya Rao', email: 'ananya.rao@college.edu', roll: 'CS202605', dept: 'Computer Science & Engineering', sem: 'Semester 5' },
    // Some for CSE Semester 6
    { username: 'CS202606', name: 'Rohan Das', email: 'rohan.das@college.edu', roll: 'CS202606', dept: 'Computer Science & Engineering', sem: 'Semester 6' },
    { username: 'CS202607', name: 'Sanya Malhotra', email: 'sanya.malhotra@college.edu', roll: 'CS202607', dept: 'Computer Science & Engineering', sem: 'Semester 6' }
  ];

  students.forEach(st => {
    run(
      'INSERT INTO users (username, password, role, name, email, roll_number, department_id, semester_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [st.username, studentPassword, 'student', st.name, st.email, st.roll, deptMap[st.dept], semMap[st.sem]]
    );
  });

  // Fetch inserted student IDs
  const studentMap = {};
  query("SELECT id, username FROM users WHERE role = 'student'").forEach(s => {
    studentMap[s.username] = s.id;
  });

  // 5. Assign Subjects to Faculty
  const assignments = [
    // Aditya Verma: Web Tech (CS502) & Networks (CS602)
    { faculty: 'aditya', code: 'CS502' },
    { faculty: 'aditya', code: 'CS602' },
    // Gayatri Sen: DBMS (CS501) & Software Eng (CS601)
    { faculty: 'gayatri', code: 'CS501' },
    { faculty: 'gayatri', code: 'CS601' },
    // Ananya Iyer: Algorithms (CS503) & AI (CS603)
    { faculty: 'ananya', code: 'CS503' },
    { faculty: 'ananya', code: 'CS603' }
  ];

  assignments.forEach(asg => {
    run(
      'INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (?, ?)',
      [facultyMap[asg.faculty], subMap[asg.code]]
    );
  });

  // 6. Seed Attendance History for CSE Semester 5 Students (past 14 weekdays)
  // Let's generate dates for the past 14 weekdays (excluding Saturdays and Sundays)
  const dates = [];
  let d = new Date();
  // Set time to noon to avoid timezone shift issues
  d.setHours(12, 0, 0, 0);

  while (dates.length < 14) {
    d.setDate(d.getDate() - 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) { // Not Sunday or Saturday
      // Format YYYY-MM-DD
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
    }
  }
  // Reverse to make it chronological
  dates.reverse();

  console.log(`Generating attendance data for dates: ${dates[0]} to ${dates[dates.length - 1]}`);

  const activeStudents = ['CS202601', 'CS202602', 'CS202603', 'CS202604', 'CS202605'];
  const sem5Subjects = ['CS501', 'CS502', 'CS503'];

  // Seed history
  dates.forEach(dateStr => {
    sem5Subjects.forEach(subCode => {
      const subjectId = subMap[subCode];

      // Determine marking faculty based on subject assignment
      let markedBy = null;
      if (subCode === 'CS501') markedBy = facultyMap['gayatri'];
      if (subCode === 'CS502') markedBy = facultyMap['aditya'];
      if (subCode === 'CS503') markedBy = facultyMap['ananya'];

      activeStudents.forEach(roll => {
        const studentId = studentMap[roll];
        let status = 'present';

        // Add some variation to make the logs realistic:
        // Aarav Mehta (CS202601) - DBMS: ~85%, Web Tech: ~64% (triggered alert), Algorithms: ~92%
        if (roll === 'CS202601') {
          if (subCode === 'CS501') {
            // 2 absences out of 14
            if (dateStr === dates[3] || dateStr === dates[8]) status = 'absent';
          } else if (subCode === 'CS502') {
            // 5 absences out of 14 -> ~64% attendance
            if ([dates[1], dates[4], dates[7], dates[10]].includes(dateStr)) {
              status = 'absent';
            } else if (dateStr === dates[12]) {
              status = 'late';
            }
          } else if (subCode === 'CS503') {
            // 1 absence
            if (dateStr === dates[5]) status = 'late';
          }
        } else if (roll === 'CS202602') {
          // Diya Patel - Excellent student (~95%)
          if (dateStr === dates[2] && subCode === 'CS502') status = 'absent';
        } else if (roll === 'CS202603') {
          // Kabir Sharma - Slacker student (~70% overall)
          // Absent on many days
          const idx = dates.indexOf(dateStr);
          if (idx % 3 === 0) {
            status = (idx % 6 === 0) ? 'absent' : 'late';
          }
        } else if (roll === 'CS202604') {
          // Ishaan Gupta - Regular student (~88%)
          if ([dates[0], dates[9]].includes(dateStr) && subCode === 'CS501') status = 'absent';
        } else {
          // Ananya Rao - High present (~92%)
          if (dateStr === dates[11] && subCode === 'CS503') status = 'absent';
        }

        run(
          'INSERT INTO attendance (student_id, subject_id, date, status, marked_by) VALUES (?, ?, ?, ?, ?)',
          [studentId, subjectId, dateStr, status, markedBy]
        );
      });
    });
  });

  seedBca();
  console.log('Database seeded successfully!');
};

export const seedBca = () => {
  let bcaDept = get("SELECT id FROM departments WHERE name = 'Bachelor of Computer Application (BCA)'");
  let bcaDeptId;
  if (!bcaDept) {
    run("INSERT INTO departments (name) VALUES ('Bachelor of Computer Application (BCA)')");
    bcaDept = get("SELECT id FROM departments WHERE name = 'Bachelor of Computer Application (BCA)'");
    console.log("Created 'Bachelor of Computer Application (BCA)' course.");
  }
  bcaDeptId = bcaDept.id;

  const dbSemesters = query("SELECT id, name FROM semesters");
  const dbSemMap = {};
  dbSemesters.forEach(s => {
    dbSemMap[s.name] = s.id;
  });

  const bcaSubjects = [
    // Semester 1
    { name: 'Language and Communication Skills: Hindi Composition', code: 'BCA-AEC-1', sem: 'Semester 1' },
    { name: 'Value Added Course - 1', code: 'BCA-VAC-1', sem: 'Semester 1' },
    { name: 'Digital Education', code: 'BCA-SEC-1', sem: 'Semester 1' },
    { name: 'Multi-Disciplinary Course - 1', code: 'BCA-MDC-1', sem: 'Semester 1' },
    { name: 'Minor From Discipline-1', code: 'BCA-MN-1A', sem: 'Semester 1' },
    { name: '(Th): C Programming Language', code: 'BCA-MJ-1-Th', sem: 'Semester 1' },
    { name: '(Pr): C Programming Language Lab', code: 'BCA-MJ-1-Pr', sem: 'Semester 1' },

    // Semester 2
    { name: 'Language and Communication Skills: English Composition', code: 'BCA-AEC-2', sem: 'Semester 2' },
    { name: 'Communication Skills and Personality Development', code: 'BCA-SEC-2', sem: 'Semester 2' },
    { name: 'Multi-Disciplinary Course - 2', code: 'BCA-MDC-2', sem: 'Semester 2' },
    { name: 'Minor From Vocational Studies/Discipline - 2', code: 'BCA-MN-2A', sem: 'Semester 2' },
    { name: '(Th): Object Oriented Programming with C++', code: 'BCA-MJ-2-Th', sem: 'Semester 2' },
    { name: '(Pr): C++ Programming Language Lab', code: 'BCA-MJ-2-Pr', sem: 'Semester 2' },
    { name: '(Th): Data Structure using C++', code: 'BCA-MJ-3-Th', sem: 'Semester 2' },
    { name: '(Pr): Data Structure Lab', code: 'BCA-MJ-3-Pr', sem: 'Semester 2' },

    // Semester 3
    { name: 'Language and Communication Skills', code: 'BCA-AEC-3', sem: 'Semester 3' },
    { name: 'Mathematical & Computational Thinking Analysis', code: 'BCA-SEC-3', sem: 'Semester 3' },
    { name: 'Multi-Disciplinary Course- 3', code: 'BCA-MDC-3', sem: 'Semester 3' },
    { name: 'Minor From Discipline-1', code: 'BCA-MN-1B', sem: 'Semester 3' },
    { name: '(Th): Relational Database Management System', code: 'BCA-MJ-4-Th', sem: 'Semester 3' },
    { name: '(Pr): RDBMS (SQL) Lab', code: 'BCA-MJ-4-Pr', sem: 'Semester 3' },
    { name: '(Th): Java Programming Language-I', code: 'BCA-MJ-5-Th', sem: 'Semester 3' },
    { name: '(Pr): Java Programming Language-I Lab', code: 'BCA-MJ-5-Pr', sem: 'Semester 3' },

    // Semester 4
    { name: 'Language and Communication Skills', code: 'BCA-AEC-4', sem: 'Semester 4' },
    { name: 'Value Added Course - 2', code: 'BCA-VAC-2', sem: 'Semester 4' },
    { name: 'Minor From Vocational Studies/Discipline - 2', code: 'BCA-MN-2B', sem: 'Semester 4' },
    { name: '(Th): Java Programming Language-II', code: 'BCA-MJ-6-Th', sem: 'Semester 4' },
    { name: '(Pr): Java Programming language-II Lab', code: 'BCA-MJ-6-Pr', sem: 'Semester 4' },
    { name: '(Th): Operating System-I', code: 'BCA-MJ-7-Th', sem: 'Semester 4' },
    { name: '(Pr): Operating System-I Lab', code: 'BCA-MJ-7-Pr', sem: 'Semester 4' },
    { name: '(Th): Software Engineering', code: 'BCA-MJ-8', sem: 'Semester 4' },

    // Semester 5
    { name: 'Minor From Discipline-1', code: 'BCA-MN-1C', sem: 'Semester 5' },
    { name: '(Th): Operating System-II and Introduction to Linux', code: 'BCA-MJ-9-Th', sem: 'Semester 5' },
    { name: '(Pr): Operating System-II Lab', code: 'BCA-MJ-9-Pr', sem: 'Semester 5' },
    { name: '(Th): Digital Logic Design', code: 'BCA-MJ-10', sem: 'Semester 5' },
    { name: '(Th): Web Technologies', code: 'BCA-MJ-11-Th', sem: 'Semester 5' },
    { name: '(Pr): Web Technologies Lab', code: 'BCA-MJ-11-Pr', sem: 'Semester 5' },
    { name: 'Internship/Apprenticeship/Field Work/Dissertation/Project', code: 'BCA-IAP', sem: 'Semester 5' },

    // Semester 6
    { name: 'Minor From Vocational Studies/Discipline - 2', code: 'BCA-MN-2C', sem: 'Semester 6' },
    { name: '(Th): Python Programming Language', code: 'BCA-MJ-12-Th', sem: 'Semester 6' },
    { name: '(Pr): Python Programming Language Lab', code: 'BCA-MJ-12-Pr', sem: 'Semester 6' },
    { name: '(Th): Data Communication and Computer Network-I', code: 'BCA-MJ-13', sem: 'Semester 6' },
    { name: '(Th): Computer Organization and Architecture', code: 'BCA-MJ-14', sem: 'Semester 6' },
    { name: '(Th): Web Development using JSP', code: 'BCA-MJ-15-Th', sem: 'Semester 6' },
    { name: '(Pr): JSP Lab', code: 'BCA-MJ-15-Pr', sem: 'Semester 6' },

    // Semester 7
    { name: 'Minor From Discipline-1', code: 'BCA-MN-1D', sem: 'Semester 7' },
    { name: '(Th): Data Communication and Computer Network-II', code: 'BCA-MJ-16', sem: 'Semester 7' },
    { name: '(Th): Computer Oriented Numerical Methods', code: 'BCA-MJ-17', sem: 'Semester 7' },
    { name: '(Th): Computer Graphics', code: 'BCA-MJ-18-Th', sem: 'Semester 7' },
    { name: '(Pr): Computer Graphics Lab', code: 'BCA-MJ-18-Pr', sem: 'Semester 7' },
    { name: '(Th): Information Security', code: 'BCA-MJ-19-Th', sem: 'Semester 7' },
    { name: '(Pr): Information Security Lab', code: 'BCA-MJ-19-Pr', sem: 'Semester 7' },

    // Semester 8
    { name: 'Minor From Vocational Studies/Discipline - 2', code: 'BCA-MN-2D', sem: 'Semester 8' },
    { name: '(Th): Introduction to Data Science', code: 'BCA-MJ-20-Th', sem: 'Semester 8' },
    { name: '(Pr): Data Science Lab', code: 'BCA-MJ-20-Pr', sem: 'Semester 8' },
    { name: 'Research Internship/Field Work/Dissertation', code: 'BCA-RC', sem: 'Semester 8' },
    { name: '(Th): Artificial Intelligence', code: 'BCA-AMJ-1', sem: 'Semester 8' },
    { name: '(Th): Assembly Language Programming', code: 'BCA-AMJ-2', sem: 'Semester 8' },
    { name: '(Pr): Artificial Intelligence and Assembly Language Programming Lab', code: 'BCA-AMJ-3', sem: 'Semester 8' }
  ];

  bcaSubjects.forEach(sub => {
    const semId = dbSemMap[sub.sem];
    if (!semId) return;
    const existing = get("SELECT id FROM subjects WHERE code = ?", [sub.code]);
    if (!existing) {
      run(
        "INSERT INTO subjects (name, code, department_id, semester_id) VALUES (?, ?, ?, ?)",
        [sub.name, sub.code, bcaDeptId, semId]
      );
    }
  });
};

