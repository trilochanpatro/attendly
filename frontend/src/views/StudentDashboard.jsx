import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import StatCard from '../components/DashboardStats';
import { jsPDF } from 'jspdf';
import { 
  Percent, BookOpen, AlertTriangle, Calendar, Download, 
  Search, Check, ShieldAlert, Award, FileText
} from 'lucide-react';

export default function StudentDashboard({ activeTab }) {
  const { token, user } = useAuth();
  
  // Dashboard & History data
  const [dashboardData, setDashboardData] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch Dashboard Stats
  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/student/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDashboardData(await res.json());
      }
    } catch (err) {
      console.error('Error fetching student dashboard', err);
    }
  };

  // Fetch History
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/student/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setHistoryLogs(await res.json());
      }
    } catch (err) {
      console.error('Error fetching student history', err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchHistory();
  }, []);

  // Filter history logs
  const filteredHistory = historyLogs.filter(log => {
    const text = searchQuery.toLowerCase();
    return (
      log.date.includes(text) ||
      log.subject_code.toLowerCase().includes(text) ||
      log.subject_name.toLowerCase().includes(text) ||
      log.status.toLowerCase().includes(text)
    );
  });

  // Calculate critical alerts (subjects < 75%)
  const lowAttendanceSubjects = dashboardData?.subjects.filter(s => s.attendance_percentage < 75.0 && s.total_classes > 0) || [];

  // ==========================================
  // PDF REPORT CARD EXPORT
  // ==========================================
  const downloadReportPDF = () => {
    if (!dashboardData) return;

    const doc = new jsPDF();
    const student = dashboardData.student;
    
    // Crimson banner
    doc.setFillColor(128, 0, 32);
    doc.rect(0, 0, 210, 40, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('ATTENDLY UNIVERSITY COLLEGE', 14, 20);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Official Student Attendance Progress Sheet', 14, 28);

    // Student Info Card
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 48, 182, 32, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, 48, 182, 32);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.text(`Student Name: ${student.name}`, 18, 55);
    doc.text(`Roll Number:  ${student.roll_number}`, 18, 62);
    doc.text(`Department:   ${student.department_name}`, 18, 69);
    doc.text(`Semester:     ${student.semester_name}`, 18, 76);

    // Overall stats block (drawn in gold/crimson highlight)
    doc.setFillColor(128, 0, 32);
    doc.rect(145, 53, 45, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('OVERALL ATTENDANCE', 148, 59);
    doc.setFontSize(18);
    doc.text(`${dashboardData.overallPercentage}%`, 148, 70);

    // Table Headers
    let y = 95;
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y - 6, 182, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CODE', 16, y - 1);
    doc.text('SUBJECT COURSE NAME', 35, y - 1);
    doc.text('TOTAL CLASSES', 110, y - 1);
    doc.text('ATTENDED', 140, y - 1);
    doc.text('PERCENTAGE', 170, y - 1);

    doc.setTextColor(71, 85, 105);
    doc.setFont('Helvetica', 'normal');

    dashboardData.subjects.forEach((sub, idx) => {
      // Row formatting
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, 182, 6, 'F');
      }

      doc.text(sub.subject_code, 16, y);
      doc.text(sub.subject_name.slice(0, 35), 35, y);
      doc.text(String(sub.total_classes), 110, y);
      doc.text(String(sub.present_count + sub.late_count), 140, y);
      
      // Color percentage
      const rate = sub.attendance_percentage;
      if (rate < 75.0 && sub.total_classes > 0) {
        doc.setTextColor(239, 68, 68); // Red for alert
        doc.setFont('Helvetica', 'bold');
      } else {
        doc.setTextColor(16, 185, 129); // Green
      }
      doc.text(`${rate}%`, 170, y);

      doc.setTextColor(71, 85, 105);
      doc.setFont('Helvetica', 'normal');
      y += 6;
    });

    // Verification Seal/Footer
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 20, 196, y + 20);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text('This report is digitally signed and generated from the Attendly College Portal database.', 14, y + 28);
    doc.text(`Verification ID: ATD-${student.roll_number}-${Date.now().toString().slice(-6)}`, 14, y + 33);

    doc.save(`attendly_report_${student.roll_number}.pdf`);
  };

  return (
    <div>
      {/* 1. WARNING NOTICES IF ATTENDANCE IS LOW */}
      {lowAttendanceSubjects.map((sub, idx) => (
        <div class="alert-banner alert-banner-danger" key={idx} style={{ animation: 'pulse 2s infinite' }}>
          <ShieldAlert size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Low Attendance Alert!</strong> Your attendance in <strong>{sub.subject_code} - {sub.subject_name}</strong> is currently <strong>{sub.attendance_percentage}%</strong>. 
            This is below the required 75% threshold. Please contact your course instructor (marked by {sub.total_classes} conducted classes).
          </div>
        </div>
      ))}

      {/* RENDER ACTIVE TAB */}

      {/* TAB 1: DASHBOARD PORTAL */}
      {activeTab === 'dashboard' && dashboardData && (
        <div>
          <div class="page-header">
            <div class="page-title">
              <h2>My Attendance Dashboard</h2>
              <p>Academic profile performance overview for {dashboardData.student.name}.</p>
            </div>
            <button class="btn btn-primary" onClick={downloadReportPDF}>
              <Download size={16} /> Download Report Card (PDF)
            </button>
          </div>

          <div class="stats-grid">
            <StatCard label="Overall Attendance" value={`${dashboardData.overallPercentage}%`} icon={<Percent size={22} />} color={dashboardData.overallPercentage >= 75 ? "green" : "crimson"} />
            <StatCard label="Conducted Lectures" value={dashboardData.totalClasses} icon={<Calendar size={22} />} color="blue" />
            <StatCard label="Attended Lectures" value={dashboardData.attendedClasses} icon={<BookOpen size={22} />} color="gold" />
          </div>

          {/* Subject wise Breakdown progress cards */}
          <div class="content-card">
            <div class="card-header">
              <h3 class="card-title">Subject-wise Class Records</h3>
            </div>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Course Name</th>
                    <th>Conducted</th>
                    <th>Attended</th>
                    <th>Absent</th>
                    <th>Late Record</th>
                    <th style={{ width: '25%' }}>Attendance Meter</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.subjects.map((sub) => {
                    const lowAtt = sub.attendance_percentage < 75.0 && sub.total_classes > 0;
                    return (
                      <tr key={sub.subject_id}>
                        <td><strong>{sub.subject_code}</strong></td>
                        <td>{sub.subject_name}</td>
                        <td>{sub.total_classes}</td>
                        <td><span style={{ color: 'var(--brand-success)', fontWeight: 600 }}>{sub.present_count}</span></td>
                        <td><span style={{ color: 'var(--brand-danger)', fontWeight: 600 }}>{sub.absent_count}</span></td>
                        <td><span style={{ color: 'var(--brand-accent)', fontWeight: 600 }}>{sub.late_count}</span></td>
                        <td>
                          <div class="progress-container">
                            <div class="progress-bar-bg">
                              <div 
                                class={`progress-bar-fill ${sub.total_classes === 0 ? 'success' : lowAtt ? 'danger' : 'success'}`} 
                                style={{ width: `${sub.attendance_percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: sub.total_classes === 0 ? 'var(--text-muted)' : lowAtt ? 'var(--brand-danger)' : 'var(--brand-success)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {sub.attendance_percentage}%
                            {lowAtt && <AlertTriangle size={14} title="Below 75% required!" />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Informative Guidance Section */}
          <div class="content-card" style={{ borderLeft: '5px solid var(--brand-primary)' }}>
            <div class="card-body" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div class="stat-icon crimson" style={{ marginTop: '4px' }}>
                <Award size={20} />
              </div>
              <div>
                <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>Academic Attendance Guidelines</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Students must maintain a minimum attendance of <strong>75%</strong> in each course module to qualify for final semester examinations. Any subject falling below this threshold is flagged. Late arrivals are logged as attended but marked as "Late" on your records, serving as a reminder to arrive on schedule.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* TAB 2: ATTENDANCE HISTORY LOG */}
      {activeTab === 'history' && (
        <div>
          <div class="page-header">
            <div class="page-title">
              <h2>My Attendance History Logs</h2>
              <p>A chronological record of daily attendance marks logged by faculty members.</p>
            </div>
          </div>

          <div class="content-card">
            <div class="filter-bar">
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  class="form-control"
                  style={{ paddingLeft: '34px', width: '280px' }}
                  placeholder="Search date, subject, or status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing <strong>{filteredHistory.length}</strong> matching entries.
              </span>
            </div>

            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subject Code</th>
                    <th>Subject Course Name</th>
                    <th>Instructor Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        No history entries found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((log) => (
                      <tr key={log.id}>
                        <td><code>{log.date}</code></td>
                        <td><strong>{log.subject_code}</strong></td>
                        <td>{log.subject_name}</td>
                        <td>{log.marked_by_name || 'System / Seeded'}</td>
                        <td>
                          <span class={`badge badge-${log.status}`}>{log.status}</span>
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
    </div>
  );
}
