import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import StatCard from '../components/DashboardStats';
import { DailyTrendChart, SubjectBarChart, SemesterTrendChart } from '../components/AttendanceChart';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { 
  Plus, Edit, Trash2, Download, Upload, Search, Check, AlertTriangle, 
  Users, BookOpen, Building, GraduationCap, Percent, HelpCircle 
} from 'lucide-react';

export default function AdminDashboard({ activeTab }) {
  const { token } = useAuth();
  
  // Stats & Charts data
  const [stats, setStats] = useState(null);
  const [dailyChart, setDailyChart] = useState([]);
  const [subjectChart, setSubjectChart] = useState([]);
  const [semesterChart, setSemesterChart] = useState([]);
  const [lowAttendance, setLowAttendance] = useState([]);
  const [threshold, setThreshold] = useState(75);

  // Common datasets
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Detailed reports filter & results
  const [reportFilters, setReportFilters] = useState({
    department_id: '',
    semester_id: '',
    subject_id: '',
    student_id: ''
  });
  const [reportLogs, setReportLogs] = useState([]);

  // Messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modals state
  const [showUserModal, setShowUserModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // null for new
  const [userForm, setUserForm] = useState({
    username: '', password: '', role: 'student', name: '', email: '',
    roll_number: '', department_id: '', semester_id: ''
  });

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({
    name: '', code: '', department_id: '', semester_id: ''
  });

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [currentDept, setCurrentDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '' });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ faculty_id: '', subject_id: '' });
  const [currentAssignment, setCurrentAssignment] = useState(null);

  const handleOpenAssignModal = (asg = null) => {
    if (asg) {
      setCurrentAssignment(asg);
      setAssignForm({ faculty_id: asg.faculty_id, subject_id: asg.subject_id });
    } else {
      setCurrentAssignment(null);
      setAssignForm({ faculty_id: '', subject_id: '' });
    }
    setShowAssignModal(true);
  };

  // Notifications timeout
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  // Fetch Lookups
  const fetchLookups = async () => {
    try {
      const authHeader = { 'Authorization': `Bearer ${token}` };
      const [deptsRes, semsRes, subsRes] = await Promise.all([
        fetch('/api/departments', { headers: authHeader }),
        fetch('/api/semesters', { headers: authHeader }),
        fetch('/api/subjects', { headers: authHeader })
      ]);

      if (deptsRes.ok) setDepartments(await deptsRes.json());
      if (semsRes.ok) setSemesters(await semsRes.json());
      if (subsRes.ok) setSubjects(await subsRes.json());
    } catch (err) {
      console.error('Error loading lookup values', err);
    }
  };

  // Fetch Dashboard Stats & Charts
  const fetchDashboardData = async () => {
    try {
      const authHeader = { 'Authorization': `Bearer ${token}` };
      const [statsRes, dailyRes, subRes, semRes, lowRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: authHeader }),
        fetch('/api/admin/charts/daily', { headers: authHeader }),
        fetch('/api/admin/charts/subject-wise', { headers: authHeader }),
        fetch('/api/admin/charts/semester-wise', { headers: authHeader }),
        fetch(`/api/admin/low-attendance?threshold=${threshold}`, { headers: authHeader })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (dailyRes.ok) setDailyChart(await dailyRes.json());
      if (subRes.ok) setSubjectChart(await subRes.json());
      if (semRes.ok) setSemesterChart(await semRes.json());
      if (lowRes.ok) setLowAttendance(await lowRes.json());
    } catch (err) {
      console.error('Error loading dashboard analytics', err);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error('Error fetching users', err);
    }
  };

  // Fetch Assignments
  const fetchAssignments = async () => {
    try {
      const res = await fetch('/api/admin/assignments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAssignments(await res.json());
    } catch (err) {
      console.error('Error fetching assignments', err);
    }
  };

  // Fetch Report Logs
  const fetchReportLogs = async () => {
    try {
      const queryParams = new URLSearchParams(reportFilters).toString();
      const res = await fetch(`/api/admin/attendance-details?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setReportLogs(await res.json());
    } catch (err) {
      console.error('Error generating report logs', err);
    }
  };

  // Trigger loads based on activeTab
  useEffect(() => {
    fetchLookups();
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'subjects') {
      fetchAssignments();
    } else if (activeTab === 'reports') {
      fetchReportLogs();
    }
  }, [activeTab, threshold]);

  // Handle users filter change or query change
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReportLogs();
    }
  }, [reportFilters]);


  // ==========================================
  // 1. USERS CRUD OPERATIONS
  // ==========================================
  const handleOpenUserModal = (u = null) => {
    if (u) {
      setCurrentUser(u);
      setUserForm({
        username: u.username,
        password: '', // Keep empty if no change
        role: u.role,
        name: u.name,
        email: u.email,
        roll_number: u.roll_number || '',
        department_id: u.department_id || '',
        semester_id: u.semester_id || ''
      });
    } else {
      setCurrentUser(null);
      setUserForm({
        username: '', password: '', role: 'student', name: '', email: '',
        roll_number: '', department_id: '', semester_id: ''
      });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    const url = currentUser ? `/api/admin/users/${currentUser.id}` : '/api/admin/users';
    const method = currentUser ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userForm)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(currentUser ? 'User details updated!' : 'User record created successfully.');
        setShowUserModal(false);
        fetchUsers();
      } else {
        setErrorMsg(data.message || 'Operation failed.');
      }
    } catch (err) {
      setErrorMsg('Network error saving user details.');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user record? This will delete all their linked data.')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg('User record removed.');
        fetchUsers();
      } else {
        const data = await res.json();
        setErrorMsg(data.message || 'Deletion error.');
      }
    } catch (err) {
      setErrorMsg('Deletion failed.');
    }
  };


  // ==========================================
  // 2. SUBJECTS & DEPARTMENTS CRUD
  // ==========================================
  const handleOpenSubjectModal = (s = null) => {
    if (s) {
      setCurrentSubject(s);
      setSubjectForm({
        name: s.name, code: s.code, department_id: s.department_id, semester_id: s.semester_id
      });
    } else {
      setCurrentSubject(null);
      setSubjectForm({ name: '', code: '', department_id: '', semester_id: '' });
    }
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    const url = currentSubject ? `/api/admin/subjects/${currentSubject.id}` : '/api/admin/subjects';
    const method = currentSubject ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subjectForm)
      });
      if (res.ok) {
        setSuccessMsg(currentSubject ? 'Subject details updated!' : 'New subject added.');
        setShowSubjectModal(false);
        fetchLookups();
        fetchAssignments();
      } else {
        const data = await res.json();
        setErrorMsg(data.message || 'Operation failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to process subject.');
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Delete subject?')) return;
    try {
      const res = await fetch(`/api/admin/subjects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg('Subject deleted.');
        fetchLookups();
        fetchAssignments();
      } else {
        setErrorMsg('Error deleting subject.');
      }
    } catch (err) {
      setErrorMsg('Network error.');
    }
  };

  // Departments CRUD
  const handleOpenDeptModal = (d = null) => {
    if (d) {
      setCurrentDept(d);
      setDeptForm({ name: d.name });
    } else {
      setCurrentDept(null);
      setDeptForm({ name: '' });
    }
    setShowDeptModal(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    const url = currentDept ? `/api/admin/departments/${currentDept.id}` : '/api/admin/departments';
    const method = currentDept ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(deptForm)
      });
      if (res.ok) {
        setSuccessMsg(currentDept ? 'Department updated!' : 'Department added.');
        setShowDeptModal(false);
        fetchLookups();
      } else {
        setErrorMsg('Operation failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to save department.');
    }
  };

  const handleDeleteDept = async (id) => {
    if (!window.confirm('Delete department? All subjects and student fields attached will be affected.')) return;
    try {
      const res = await fetch(`/api/admin/departments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg('Department removed.');
        fetchLookups();
      } else {
        setErrorMsg('Error deleting department.');
      }
    } catch (err) {
      setErrorMsg('Network failure.');
    }
  };

  // Assign Subject to Faculty
  const handleAssignSubject = async (e) => {
    e.preventDefault();
    if (!assignForm.faculty_id || !assignForm.subject_id) {
      setErrorMsg('Please select both faculty member and subject.');
      return;
    }

    const url = currentAssignment ? `/api/admin/assignments/${currentAssignment.id}` : '/api/admin/assignments';
    const method = currentAssignment ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(assignForm)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(currentAssignment ? 'Assignment updated successfully!' : 'Subject assigned successfully!');
        setShowAssignModal(false);
        setAssignForm({ faculty_id: '', subject_id: '' });
        setCurrentAssignment(null);
        fetchAssignments();
      } else {
        setErrorMsg(data.message || 'Assignment failed.');
      }
    } catch (err) {
      setErrorMsg('Network error.');
    }
  };

  const handleUnassignSubject = async (id) => {
    if (!window.confirm('Unassign this subject from faculty?')) return;
    try {
      const res = await fetch(`/api/admin/assignments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg('Assignment removed.');
        fetchAssignments();
      } else {
        setErrorMsg('Error unassigning.');
      }
    } catch (err) {
      setErrorMsg('Network error.');
    }
  };


  // ==========================================
  // 3. EXPORTS: EXCEL & PDF
  // ==========================================
  const exportToExcel = () => {
    if (reportLogs.length === 0) {
      alert('No data rows to export.');
      return;
    }

    const excelData = reportLogs.map(log => ({
      'Date': log.date,
      'Student Name': log.student_name,
      'Roll Number': log.roll_number,
      'Department': log.department_name,
      'Semester': log.semester_name,
      'Subject Code': log.subject_code,
      'Subject Name': log.subject_name,
      'Attendance Status': log.status.toUpperCase(),
      'Marked By': log.marked_by_name || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance History');
    
    // Auto-fit column widths
    const maxLen = {};
    excelData.forEach(row => {
      Object.keys(row).forEach(key => {
        const valStr = String(row[key]);
        maxLen[key] = Math.max(maxLen[key] || 10, valStr.length);
      });
    });
    worksheet['!cols'] = Object.keys(maxLen).map(k => ({ wch: maxLen[k] + 2 }));

    XLSX.writeFile(workbook, 'attendly_attendance_report.xlsx');
  };

  const exportToPDF = () => {
    if (reportLogs.length === 0) {
      alert('No data rows to export.');
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait' });
    
    // Add college letterhead header
    doc.setFillColor(128, 0, 32); // Crimson Maroon banner
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('ATTENDLY UNIVERSITY COLLEGE', 14, 18);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Institution Attendance Report & Logs Summary', 14, 26);

    // Filter criteria section
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 40, 182, 18, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 40, 182, 18);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'bold');
    doc.text('REPORT DETAILS:', 18, 46);
    
    doc.setFont('Helvetica', 'normal');
    const deptTxt = reportFilters.department_id ? departments.find(d => d.id === parseInt(reportFilters.department_id))?.name || 'All' : 'All';
    const semTxt = reportFilters.semester_id ? semesters.find(s => s.id === parseInt(reportFilters.semester_id))?.name || 'All' : 'All';
    const subTxt = reportFilters.subject_id ? subjects.find(s => s.id === parseInt(reportFilters.subject_id))?.name || 'All' : 'All';
    doc.text(`Department: ${deptTxt}   |   Semester: ${semTxt}   |   Subject: ${subTxt}`, 18, 52);

    // Print records table
    let y = 68;
    
    // Table Headers
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y - 6, 182, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DATE', 16, y - 1);
    doc.text('ROLL NO', 38, y - 1);
    doc.text('STUDENT NAME', 62, y - 1);
    doc.text('SUBJECT', 115, y - 1);
    doc.text('STATUS', 176, y - 1);

    doc.setTextColor(71, 85, 105);
    doc.setFont('Helvetica', 'normal');

    reportLogs.forEach((log, index) => {
      // Manage multi-page reports
      if (y > 275) {
        doc.addPage();
        y = 25;
        // Table Headers on new page
        doc.setFillColor(15, 23, 42);
        doc.rect(14, y - 6, 182, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.text('DATE', 16, y - 1);
        doc.text('ROLL NO', 38, y - 1);
        doc.text('STUDENT NAME', 62, y - 1);
        doc.text('SUBJECT', 115, y - 1);
        doc.text('STATUS', 176, y - 1);
        
        doc.setTextColor(71, 85, 105);
        doc.setFont('Helvetica', 'normal');
      }

      // Draw light background for alternating rows
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, 182, 6, 'F');
      }

      // Write student detail rows
      doc.text(log.date, 16, y);
      doc.text(log.roll_number || 'N/A', 38, y);
      doc.text(log.student_name.slice(0, 25), 62, y);
      doc.text(`${log.subject_code} - ${log.subject_name.slice(0, 25)}`, 115, y);
      
      // Color code attendance status
      if (log.status === 'present') {
        doc.setTextColor(16, 185, 129); // Green
      } else if (log.status === 'absent') {
        doc.setTextColor(239, 68, 68); // Red
      } else {
        doc.setTextColor(245, 158, 11); // Yellow
      }
      doc.setFont('Helvetica', 'bold');
      doc.text(log.status.toUpperCase(), 176, y);

      doc.setTextColor(71, 85, 105);
      doc.setFont('Helvetica', 'normal');
      y += 6;
    });

    // Add footer page counts
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`, 14, 290);
    }

    doc.save('attendly_attendance_report.pdf');
  };


  // ==========================================
  // 4. BACKUP & RESTORE
  // ==========================================
  const triggerBackupDownload = async () => {
    try {
      const response = await fetch('/api/admin/backup', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendly_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setSuccessMsg('Database backup JSON file generated successfully!');
      } else {
        setErrorMsg('Backup generation error.');
      }
    } catch (err) {
      setErrorMsg('Backup download failed.');
    }
  };

  const handleUploadRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm('WARNING: Restoring the database will wipe all current records and overwrite them. Do you want to continue?')) {
      e.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const backupData = JSON.parse(evt.target.result);
        const res = await fetch('/api/admin/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(backupData)
        });

        const resData = await res.json();
        if (res.ok) {
          setSuccessMsg('Database restored successfully! Reloading stats...');
          fetchDashboardData();
          fetchLookups();
          fetchUsers();
          fetchAssignments();
        } else {
          setErrorMsg(resData.message || 'Restore failed.');
        }
      } catch (err) {
        setErrorMsg('Failed to parse backup JSON file.');
      }
      e.target.value = null; // Clear input
    };
    reader.readAsText(file);
  };


  return (
    <div>
      {/* Alert Notices */}
      {successMsg && (
        <div class="alert-banner alert-banner-success">
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div class="alert-banner alert-banner-danger">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* RENDER ACTIVE TAB */}
      
      {/* TAB 1: ANALYTICS DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div>
          <div class="page-header">
            <div class="page-title">
              <h2>Institution Dashboard</h2>
              <p>Welcome back, Administrator. Here is a high-level overview of college attendance.</p>
            </div>
            <div class="filters-group" style={{ backgroundColor: 'var(--bg-card)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Warning Threshold:</span>
              <select 
                class="form-control" 
                style={{ minWidth: '80px', padding: '4px 8px' }} 
                value={threshold} 
                onChange={(e) => setThreshold(e.target.value)}
              >
                <option value={80}>80%</option>
                <option value={75}>75%</option>
                <option value={70}>70%</option>
                <option value={60}>60%</option>
              </select>
            </div>
          </div>

          {stats && (
            <div class="stats-grid">
              <StatCard label="Total Students" value={stats.students} icon={<Users size={22} />} color="blue" />
              <StatCard label="Faculty Members" value={stats.faculty} icon={<GraduationCap size={22} />} color="crimson" />
              <StatCard label="Total Subjects" value={stats.subjects} icon={<BookOpen size={22} />} color="gold" />
              <StatCard label="Overall Attendance" value={`${stats.overallAttendanceRate}%`} icon={<Percent size={22} />} color="green" />
            </div>
          )}

          {/* Charts Grid */}
          <div class="charts-grid">
            <div class="chart-card">
              <h3>Daily Attendance Trends</h3>
              <DailyTrendChart data={dailyChart} />
            </div>
            <div class="chart-card">
              <h3>Semester Averages</h3>
              <SemesterTrendChart data={semesterChart} />
            </div>
          </div>
          
          <div class="charts-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div class="chart-card">
              <h3>Subject-wise Attendance Comparison</h3>
              <SubjectBarChart data={subjectChart} />
            </div>
          </div>

          {/* Low Attendance List */}
          <div class="content-card">
            <div class="card-header">
              <h3 class="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-danger)' }}>
                <AlertTriangle size={18} />
                Low Attendance Alert List (Below {threshold}%)
              </h3>
            </div>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Dept & Sem</th>
                    <th>Subject</th>
                    <th>Classes Conducted</th>
                    <th>Attended</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {lowAttendance.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        All students satisfy the {threshold}% attendance requirement!
                      </td>
                    </tr>
                  ) : (
                    lowAttendance.map((st, idx) => (
                      <tr key={idx}>
                        <td><strong>{st.roll_number}</strong></td>
                        <td>{st.name}</td>
                        <td><span style={{ fontSize: '0.8rem' }}>{st.department_name.split(' ')[0]} - {st.semester_name}</span></td>
                        <td>{st.subject_code} - {st.subject_name}</td>
                        <td>{st.total_classes}</td>
                        <td>{st.present + st.late}</td>
                        <td style={{ color: 'var(--brand-danger)', fontWeight: 'bold' }}>{st.rate}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* TAB 2: MANAGE USERS */}
      {activeTab === 'users' && (
        <div>
          <div class="page-header">
            <div class="page-title">
              <h2>Users Database</h2>
              <p>Add, edit, update, or remove Administrators, Faculty members, and Student profiles.</p>
            </div>
            <button class="btn btn-primary" onClick={() => handleOpenUserModal()}>
              <Plus size={16} /> Add User
            </button>
          </div>

          <div class="content-card">
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username / ID</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Dept & Sem Details</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        {u.roll_number && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Roll: {u.roll_number}</div>}
                      </td>
                      <td><code>{u.username}</code></td>
                      <td>
                        <span class={`badge badge-${u.role}`}>{u.role}</span>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        {u.role === 'admin' ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Institution Admin</span>
                        ) : u.role === 'faculty' ? (
                          <span style={{ fontSize: '0.8rem' }}>{u.department_name || 'No Dept'}</span>
                        ) : (
                          <span style={{ fontSize: '0.8rem' }}>
                            {u.department_name ? u.department_name.split(' ')[0] : 'No Dept'} ({u.semester_name || 'No Sem'})
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button class="btn-icon" onClick={() => handleOpenUserModal(u)}>
                            <Edit size={14} />
                          </button>
                          <button class="btn-icon" style={{ color: 'var(--brand-danger)' }} onClick={() => handleDeleteUser(u.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* TAB 3: SUBJECTS & ASSIGNMENTS */}
      {activeTab === 'subjects' && (
        <div>
          <div class="page-header">
            <div class="page-title">
              <h2>Subjects & Faculty Mapping</h2>
              <p>Configure classes, add subjects, and link them to faculty instructors.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button class="btn btn-secondary" onClick={() => handleOpenSubjectModal()}>
                <Plus size={16} /> Add Subject
              </button>
              <button class="btn btn-primary" onClick={() => handleOpenAssignModal()}>
                <Plus size={16} /> Link Faculty
              </button>
            </div>
          </div>

          <div class="content-card">
            <div class="card-header">
              <h3 class="card-title">Assigned Subjects List</h3>
            </div>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Dept & Semester</th>
                    <th>Assigned Faculty</th>
                    <th>Email Address</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No mappings assigned. Assign faculty to subjects to Conduct attendance.
                      </td>
                    </tr>
                  ) : (
                    assignments.map(asg => (
                      <tr key={asg.id}>
                        <td><strong>{asg.subject_code}</strong></td>
                        <td>{asg.subject_name}</td>
                        <td>{asg.department_name.split(' ')[0]} - {asg.semester_name}</td>
                        <td>{asg.faculty_name}</td>
                        <td>{asg.faculty_email}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button class="btn-icon" onClick={() => handleOpenAssignModal(asg)} title="Edit Assignment">
                              <Edit size={14} />
                            </button>
                            <button class="btn-icon" style={{ color: 'var(--brand-danger)' }} onClick={() => handleUnassignSubject(asg.id)} title="Unassign Subject">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subjects CRUD overview */}
          <div class="content-card">
            <div class="card-header">
              <h3 class="card-title">Registered Subjects Database</h3>
            </div>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.code}</strong></td>
                      <td>{s.name}</td>
                      <td>{s.department_name}</td>
                      <td>{s.semester_name}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button class="btn-icon" onClick={() => handleOpenSubjectModal(s)}>
                            <Edit size={14} />
                          </button>
                          <button class="btn-icon" style={{ color: 'var(--brand-danger)' }} onClick={() => handleDeleteSubject(s.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* TAB 4: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div>
          <div class="page-header">
            <div class="page-title">
              <h2>College Courses & Departments</h2>
              <p>Configure courses and departments of the college (e.g. BCA, CSE) to categorize subjects and student branches.</p>
            </div>
            <button class="btn btn-primary" onClick={() => handleOpenDeptModal()}>
              <Plus size={16} /> Add Course / Dept
            </button>
          </div>

          <div class="content-card" style={{ maxWidth: '600px' }}>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Course / Department Name</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map(d => (
                    <tr key={d.id}>
                      <td>{d.id}</td>
                      <td><strong>{d.name}</strong></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button class="btn-icon" onClick={() => handleOpenDeptModal(d)}>
                            <Edit size={14} />
                          </button>
                          <button class="btn-icon" style={{ color: 'var(--brand-danger)' }} onClick={() => handleDeleteDept(d.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* TAB 5: REPORTS */}
      {activeTab === 'reports' && (
        <div>
          <div class="page-header">
            <div class="page-title">
              <h2>Institution Reports Generator</h2>
              <p>Filter, sort, and search logs, and export them into PDF or Excel sheet formats.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button class="btn btn-secondary" onClick={exportToExcel} disabled={reportLogs.length === 0}>
                <Download size={16} /> Export Excel
              </button>
              <button class="btn btn-primary" onClick={exportToPDF} disabled={reportLogs.length === 0}>
                <Download size={16} /> Export PDF
              </button>
            </div>
          </div>

          <div class="content-card">
            <div class="filter-bar">
              <div class="filters-group">
                <select 
                  class="form-control" 
                  value={reportFilters.department_id}
                  onChange={(e) => setReportFilters(prev => ({ ...prev, department_id: e.target.value, subject_id: '' }))}
                >
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>

                <select 
                  class="form-control" 
                  value={reportFilters.semester_id}
                  onChange={(e) => setReportFilters(prev => ({ ...prev, semester_id: e.target.value, subject_id: '' }))}
                >
                  <option value="">All Semesters</option>
                  {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <select 
                  class="form-control" 
                  value={reportFilters.subject_id}
                  onChange={(e) => setReportFilters(prev => ({ ...prev, subject_id: e.target.value }))}
                >
                  <option value="">All Subjects</option>
                  {subjects
                    .filter(s => {
                      const deptMatch = !reportFilters.department_id || s.department_id === parseInt(reportFilters.department_id);
                      const semMatch = !reportFilters.semester_id || s.semester_id === parseInt(reportFilters.semester_id);
                      return deptMatch && semMatch;
                    })
                    .map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                </select>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Found <strong>{reportLogs.length}</strong> records match.
              </span>
            </div>

            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Branch / Semester</th>
                    <th>Subject</th>
                    <th>Attendance Status</th>
                    <th>Marked By</th>
                  </tr>
                </thead>
                <tbody>
                  {reportLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No records match the current filters.
                      </td>
                    </tr>
                  ) : (
                    reportLogs.map(log => (
                      <tr key={log.id}>
                        <td><code>{log.date}</code></td>
                        <td><strong>{log.roll_number || 'N/A'}</strong></td>
                        <td>{log.student_name}</td>
                        <td><span style={{ fontSize: '0.8rem' }}>{log.department_name.split(' ')[0]} ({log.semester_name})</span></td>
                        <td>{log.subject_code} - {log.subject_name}</td>
                        <td>
                          <span class={`badge badge-${log.status}`}>{log.status}</span>
                        </td>
                        <td>{log.marked_by_name || 'System / Restored'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* TAB 6: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div>
          <div class="page-header">
            <div class="page-title">
              <h2>Data Recovery & System Backup</h2>
              <p>Export SQL/JSON logs to a local file or restore institutional records from a file.</p>
            </div>
          </div>

          <div class="charts-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div class="chart-card" style={{ gap: '20px', minHeight: '260px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div class="stat-icon blue"><Download size={24} /></div>
                <h3 style={{ margin: 0 }}>System Data Export</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Create a full, portable JSON backup of the system. This download extracts all departments, semesters, subjects, user profiles, links, and complete attendance logs. You can import this file anytime to restore the application state.
              </p>
              <div>
                <button class="btn btn-primary" onClick={triggerBackupDownload}>
                  <Download size={16} /> Download Backup (.json)
                </button>
              </div>
            </div>

            <div class="chart-card" style={{ gap: '20px', minHeight: '260px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div class="stat-icon crimson"><Upload size={24} /></div>
                <h3 style={{ margin: 0 }}>Database State Restoration</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Restore the database using a previously exported backup file.
                <strong style={{ color: 'var(--brand-danger)', display: 'block', marginTop: '6px' }}>
                  ⚠️ Warning: Restoring will overwrite all existing database records immediately.
                </strong>
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label class="btn btn-secondary" style={{ position: 'relative', cursor: 'pointer' }}>
                  <Upload size={16} /> Choose Backup File
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleUploadRestore} 
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ==========================================
          MODALS & DIALOGS
      ========================================== */}
      
      {/* 1. USER MODAL */}
      {showUserModal && (
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>{currentUser ? 'Edit User Profile' : 'Add New User'}</h3>
              <button class="btn-icon" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div class="modal-body">
                <div class="form-group">
                  <label>Role</label>
                  <select 
                    class="form-control" 
                    value={userForm.role}
                    onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value, roll_number: '', semester_id: '', department_id: '' }))}
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty Member</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" class="form-control" required 
                    value={userForm.name} onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div class="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" class="form-control" required
                    value={userForm.email} onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div class="form-group">
                  <label>Username / Login ID</label>
                  <input 
                    type="text" class="form-control" required
                    value={userForm.username} onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>

                <div class="form-group">
                  <label>Password {currentUser && '(Leave blank to keep current)'}</label>
                  <input 
                    type="password" class="form-control" 
                    required={!currentUser}
                    value={userForm.password} onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>

                {userForm.role === 'student' && (
                  <div class="form-group">
                    <label>Roll Number / Registration ID</label>
                    <input 
                      type="text" class="form-control" required
                      value={userForm.roll_number} onChange={(e) => setUserForm(prev => ({ ...prev, roll_number: e.target.value }))}
                    />
                  </div>
                )}

                {userForm.role !== 'admin' && (
                  <div class="form-group">
                    <label>Course / Department Branch</label>
                    <select 
                      class="form-control" required
                      value={userForm.department_id} onChange={(e) => setUserForm(prev => ({ ...prev, department_id: e.target.value }))}
                    >
                      <option value="">Select Course / Department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                )}

                {userForm.role === 'student' && (
                  <div class="form-group">
                    <label>Current Semester</label>
                    <select 
                      class="form-control" required
                      value={userForm.semester_id} onChange={(e) => setUserForm(prev => ({ ...prev, semester_id: e.target.value }))}
                    >
                      <option value="">Select Semester</option>
                      {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
                <button type="submit" class="btn btn-primary">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. SUBJECT MODAL */}
      {showSubjectModal && (
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>{currentSubject ? 'Edit Subject Details' : 'Add New Subject'}</h3>
              <button class="btn-icon" onClick={() => setShowSubjectModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveSubject}>
              <div class="modal-body">
                <div class="form-group">
                  <label>Subject Code (e.g. CS501)</label>
                  <input 
                    type="text" class="form-control" required 
                    value={subjectForm.code} onChange={(e) => setSubjectForm(prev => ({ ...prev, code: e.target.value }))}
                  />
                </div>

                <div class="form-group">
                  <label>Subject Name</label>
                  <input 
                    type="text" class="form-control" required 
                    value={subjectForm.name} onChange={(e) => setSubjectForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div class="form-group">
                  <label>Course / Department Branch</label>
                  <select 
                    class="form-control" required
                    value={subjectForm.department_id} onChange={(e) => setSubjectForm(prev => ({ ...prev, department_id: e.target.value }))}
                  >
                    <option value="">Select Course / Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div class="form-group">
                  <label>Semester</label>
                  <select 
                    class="form-control" required
                    value={subjectForm.semester_id} onChange={(e) => setSubjectForm(prev => ({ ...prev, semester_id: e.target.value }))}
                  >
                    <option value="">Select Semester</option>
                    {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => setShowSubjectModal(false)}>Cancel</button>
                <button type="submit" class="btn btn-primary">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. DEPARTMENT MODAL */}
      {showDeptModal && (
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>{currentDept ? 'Rename Course / Dept' : 'Add New Course / Dept'}</h3>
              <button class="btn-icon" onClick={() => setShowDeptModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveDept}>
              <div class="modal-body">
                <div class="form-group">
                  <label>Course / Department Name</label>
                  <input 
                    type="text" class="form-control" required 
                    value={deptForm.name} onChange={(e) => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => setShowDeptModal(false)}>Cancel</button>
                <button type="submit" class="btn btn-primary">Save Course / Dept</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. FACULTY LINK ASSIGN MODAL */}
      {showAssignModal && (
        <div class="modal-overlay">
          <div class="modal-content">
            <div class="modal-header">
              <h3>{currentAssignment ? 'Update Faculty Subject Assignment' : 'Assign Faculty to Subject'}</h3>
              <button class="btn-icon" onClick={() => { setShowAssignModal(false); setCurrentAssignment(null); }}>✕</button>
            </div>
            <form onSubmit={handleAssignSubject}>
              <div class="modal-body">
                <div class="form-group">
                  <label>Faculty Member</label>
                  <select 
                    class="form-control" required
                    value={assignForm.faculty_id} onChange={(e) => setAssignForm(prev => ({ ...prev, faculty_id: e.target.value }))}
                  >
                    <option value="">Select Faculty</option>
                    {users
                      .filter(u => u.role === 'faculty')
                      .map(f => <option key={f.id} value={f.id}>{f.name} ({f.department_name ? f.department_name.split(' ')[0] : 'No Dept'})</option>)}
                  </select>
                </div>

                <div class="form-group">
                  <label>Subject</label>
                  <select 
                    class="form-control" required
                    value={assignForm.subject_id} onChange={(e) => setAssignForm(prev => ({ ...prev, subject_id: e.target.value }))}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name} ({s.semester_name})</option>)}
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onClick={() => { setShowAssignModal(false); setCurrentAssignment(null); }}>Cancel</button>
                <button type="submit" class="btn btn-primary">{currentAssignment ? 'Update Assignment' : 'Link Mapping'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
