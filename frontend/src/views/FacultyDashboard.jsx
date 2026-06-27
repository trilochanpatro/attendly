import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import * as XLSX from 'xlsx';
import StatCard from '../components/DashboardStats';
import { 
  Check, AlertTriangle, AlertCircle, Calendar, Users, 
  BookOpen, FileSpreadsheet, Download, RefreshCw 
} from 'lucide-react';

export default function FacultyDashboard({ activeTab }) {
  const { token } = useAuth();

  // Faculty Assigned subjects
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  
  // Selection state for marking
  const [selectedSubject, setSelectedSubject] = useState(null); // Full subject object
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Class attendance markings
  const [students, setStudents] = useState([]);
  const [markings, setMarkings] = useState({}); // { studentId: 'present'|'absent'|'late' }
  const [originalMarkings, setOriginalMarkings] = useState({}); // For change tracking

  // Report state
  const [reportSubjectId, setReportSubjectId] = useState('');
  const [reportData, setReportData] = useState([]);

  // Messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Clear messages timeout
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  // Fetch Assigned Subjects
  const fetchAssignedSubjects = async () => {
    try {
      const res = await fetch('/api/faculty/subjects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssignedSubjects(data);
        if (data.length > 0 && !selectedSubject) {
          setSelectedSubject(data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching assigned subjects', err);
    }
  };

  // Fetch students & attendance records for selected subject/date
  const fetchMarkingGrid = async () => {
    if (!selectedSubject) return;

    try {
      const authHeader = { 'Authorization': `Bearer ${token}` };
      
      // 1. Fetch all students in the department & semester of the subject
      const studRes = await fetch(
        `/api/faculty/students?department_id=${selectedSubject.department_id}&semester_id=${selectedSubject.semester_id}`,
        { headers: authHeader }
      );
      
      // 2. Fetch existing markings for this subject and date
      const attRes = await fetch(
        `/api/faculty/attendance?subject_id=${selectedSubject.subject_id}&date=${attendanceDate}`,
        { headers: authHeader }
      );

      if (studRes.ok && attRes.ok) {
        const studentList = await studRes.json();
        const logs = await attRes.json();

        // Map markings
        const tempMarkings = {};
        const logMap = {};
        logs.forEach(l => {
          logMap[l.student_id] = l.status;
        });

        studentList.forEach(st => {
          // If already marked, use it. Otherwise, default to 'present' for easy marking!
          tempMarkings[st.id] = logMap[st.id] || 'present';
        });

        setStudents(studentList);
        setMarkings(tempMarkings);
        setOriginalMarkings({ ...tempMarkings });
      }
    } catch (err) {
      console.error('Error loading marking grid', err);
    }
  };

  // Fetch report data
  const fetchReportData = async () => {
    if (!reportSubjectId) {
      setReportData([]);
      return;
    }
    try {
      const res = await fetch(`/api/faculty/reports?subject_id=${reportSubjectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReportData(await res.json());
      } else {
        setReportData([]);
      }
    } catch (err) {
      console.error('Error loading class report', err);
    }
  };

  // Trigger loading based on activeTab
  useEffect(() => {
    fetchAssignedSubjects();
  }, []);

  useEffect(() => {
    if (activeTab === 'mark' && selectedSubject) {
      fetchMarkingGrid();
    } else if (activeTab === 'reports') {
      fetchReportData();
    }
  }, [activeTab, selectedSubject, attendanceDate, reportSubjectId]);


  // ==========================================
  // 1. MARK / UPDATE ATTENDANCE
  // ==========================================
  const toggleStatus = (studentId, status) => {
    setMarkings(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSubject) return;

    const records = Object.keys(markings).map(id => ({
      student_id: parseInt(id),
      status: markings[id]
    }));

    try {
      const res = await fetch('/api/faculty/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject_id: selectedSubject.subject_id,
          date: attendanceDate,
          records
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Attendance saved successfully for ${attendanceDate}!`);
        setOriginalMarkings({ ...markings });
        // Refresh grid
        fetchMarkingGrid();
      } else {
        setErrorMsg(data.message || 'Failed to save attendance.');
      }
    } catch (err) {
      setErrorMsg('Network error. Attendance not updated.');
    }
  };

  const handleMarkAll = (status) => {
    const tempMarkings = {};
    students.forEach(st => {
      tempMarkings[st.id] = status;
    });
    setMarkings(tempMarkings);
  };


  // ==========================================
  // 2. REPORT EXPORT
  // ==========================================
  const exportClassReportExcel = () => {
    if (reportData.length === 0) return;

    const sub = assignedSubjects.find(s => s.subject_id === parseInt(reportSubjectId));
    const title = sub ? `${sub.code}_Attendance_Report` : 'Class_Attendance_Report';

    const excelRows = reportData.map(r => ({
      'Roll Number': r.roll_number,
      'Student Name': r.student_name,
      'Total Classes Conducted': r.total_classes,
      'Present Count': r.present_count,
      'Absent Count': r.absent_count,
      'Late Count': r.late_count,
      'Attendance Percentage': `${r.attendance_percentage}%`
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Summary');
    XLSX.writeFile(workbook, `${title}.xlsx`);
  };

  // Compare if markings changed to show save indicators
  const hasChanges = JSON.stringify(markings) !== JSON.stringify(originalMarkings);

  return (
    <div>
      {/* Messages banner */}
      {successMsg && (
        <div class="alert-banner alert-banner-success">
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div class="alert-banner alert-banner-danger">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* RENDER VIEWS */}

      {/* TAB 1: FACULTY DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div>
          <div class="page-header">
            <div class="page-title">
              <h2>Faculty Workspace</h2>
              <p>Welcome back. Here are your assigned lecture courses and subjects for this semester.</p>
            </div>
          </div>

          <div class="stats-grid">
            <StatCard label="Assigned Subjects" value={assignedSubjects.length} icon={<BookOpen size={22} />} color="crimson" />
            <StatCard label="Direct Modules" value={assignedSubjects.filter(s => s.semester_name.includes('5')).length} icon={<Users size={22} />} color="blue" />
          </div>

          <div class="content-card">
            <div class="card-header">
              <h3 class="card-title">My Assigned Course Curriculum</h3>
            </div>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Branch / Department</th>
                    <th>Semester Schedule</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedSubjects.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No subjects mapped to your account. Please ask the college Administrator.
                      </td>
                    </tr>
                  ) : (
                    assignedSubjects.map(sub => (
                      <tr key={sub.assignment_id}>
                        <td><strong>{sub.code}</strong></td>
                        <td>{sub.name}</td>
                        <td>{sub.department_name}</td>
                        <td>{sub.semester_name}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span 
                            style={{ cursor: 'pointer', color: 'var(--brand-primary)', fontWeight: 600 }}
                            onClick={() => {
                              setSelectedSubject(sub);
                              // Trigger tab change in parent layout
                              document.querySelector('.sidebar-menu span:nth-child(2)').click();
                            }}
                          >
                            Mark Attendance →
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* TAB 2: MARK DAILY ATTENDANCE */}
      {activeTab === 'mark' && (
        <div>
          <div class="page-header">
            <div class="page-title">
              <h2>Mark Class Attendance</h2>
              <p>Log student attendance indices by selecting the date and marking students Present, Absent, or Late.</p>
            </div>
            {hasChanges && (
              <span style={{ fontSize: '0.85rem', color: 'var(--brand-accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} /> Unsaved changes in progress
              </span>
            )}
          </div>

          <div class="content-card">
            <div class="filter-bar" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
              <div class="filters-group">
                <div class="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                  <label style={{ whiteSpace: 'nowrap' }}>Subject Course:</label>
                  <select 
                    class="form-control"
                    value={selectedSubject?.subject_id || ''}
                    onChange={(e) => {
                      const sub = assignedSubjects.find(s => s.subject_id === parseInt(e.target.value));
                      setSelectedSubject(sub);
                    }}
                  >
                    {assignedSubjects.map(s => (
                      <option key={s.subject_id} value={s.subject_id}>{s.code} - {s.name} ({s.semester_name})</option>
                    ))}
                  </select>
                </div>

                <div class="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                  <label style={{ whiteSpace: 'nowrap' }}>Attendance Date:</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Calendar size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                    <input 
                      type="date" 
                      class="form-control"
                      style={{ paddingLeft: '34px', minWidth: '150px' }}
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button class="btn btn-secondary btn-sm" onClick={() => handleMarkAll('present')}>All Present</button>
                <button class="btn btn-secondary btn-sm" onClick={() => handleMarkAll('absent')}>All Absent</button>
                <button class="btn btn-primary" onClick={handleSaveAttendance}>
                  Save Attendance
                </button>
              </div>
            </div>

            <div class="card-body">
              {students.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No students are enrolled in this semester branch.
                </div>
              ) : (
                <div class="attendance-grid">
                  {students.map((st) => (
                    <div class="attendance-row" key={st.id}>
                      <div class="attendance-student-info">
                        <span class="attendance-student-name">{st.name}</span>
                        <span class="attendance-student-roll">Roll Number: {st.roll_number} | Email: {st.email}</span>
                      </div>
                      
                      <div class="attendance-actions">
                        <button 
                          class={`attendance-btn ${markings[st.id] === 'present' ? 'active-present' : ''}`}
                          onClick={() => toggleStatus(st.id, 'present')}
                        >
                          Present
                        </button>
                        <button 
                          class={`attendance-btn ${markings[st.id] === 'absent' ? 'active-absent' : ''}`}
                          onClick={() => toggleStatus(st.id, 'absent')}
                        >
                          Absent
                        </button>
                        <button 
                          class={`attendance-btn ${markings[st.id] === 'late' ? 'active-late' : ''}`}
                          onClick={() => toggleStatus(st.id, 'late')}
                        >
                          Late
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div class="card-header" style={{ borderTop: '1px solid var(--border-color)', justifyContent: 'flex-end' }}>
              <button class="btn btn-primary" onClick={handleSaveAttendance} disabled={students.length === 0}>
                Save & Update Attendance Grid
              </button>
            </div>
          </div>
        </div>
      )}


      {/* TAB 3: SUBJECT REPORTS */}
      {activeTab === 'reports' && (
        <div>
          <div class="page-header">
            <div class="page-title">
              <h2>Subject Performance & Class Reports</h2>
              <p>View complete statistics of student attendance for the subjects assigned to you.</p>
            </div>
            <button 
              class="btn btn-primary" 
              onClick={exportClassReportExcel} 
              disabled={reportData.length === 0}
            >
              <Download size={16} /> Export Excel
            </button>
          </div>

          <div class="content-card">
            <div class="filter-bar">
              <div class="filters-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <label>Select Course Module:</label>
                <select 
                  class="form-control"
                  value={reportSubjectId}
                  onChange={(e) => setReportSubjectId(e.target.value)}
                >
                  <option value="">Choose Course...</option>
                  {assignedSubjects.map(s => (
                    <option key={s.subject_id} value={s.subject_id}>{s.code} - {s.name} ({s.semester_name})</option>
                  ))}
                </select>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {reportData.length > 0 ? `Displaying ${reportData.length} records.` : 'Select a course module to view reports.'}
              </span>
            </div>

            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Total Lectures Conducted</th>
                    <th>Present Count</th>
                    <th>Absent Count</th>
                    <th>Late Count</th>
                    <th>Attendance Ratio</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        No records loaded. Please select a course module from the dropdown filter above.
                      </td>
                    </tr>
                  ) : (
                    reportData.map(row => {
                      const lowAtt = row.attendance_percentage < 75;
                      return (
                        <tr key={row.student_id}>
                          <td><strong>{row.roll_number}</strong></td>
                          <td>{row.student_name}</td>
                          <td>{row.total_classes}</td>
                          <td><span style={{ color: 'var(--brand-success)' }}>{row.present_count}</span></td>
                          <td><span style={{ color: 'var(--brand-danger)' }}>{row.absent_count}</span></td>
                          <td><span style={{ color: 'var(--brand-accent)' }}>{row.late_count}</span></td>
                          <td>{row.present_count + row.late_count} / {row.total_classes}</td>
                          <td style={{ fontWeight: 700, color: lowAtt ? 'var(--brand-danger)' : 'var(--brand-success)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {row.attendance_percentage}%
                              {lowAtt && <AlertTriangle size={14} title="Attendance below 75%!" />}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
