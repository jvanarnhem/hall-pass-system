// src/components/AdminPanel.jsx
import React, { useState } from 'react';
import {
  Upload,
  Download,
  UserPlus,
  Users,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  orderBy as firestoreOrderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/db';
import { parseCSV, exportToCSV, formatDateForCSV } from '../utils/csvHelpers';
import { 
  useStaffList, 
  useStudentCount, 
  useExportCount,
  useInvalidateQueries 
} from '../hooks/usePassQueries';

const AdminPanel = () => {
  const [expandedSection, setExpandedSection] = useState('export');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // React Query hooks
  const { data: staff = [], isLoading: staffLoading } = useStaffList();
  const { data: studentCount = 0, isLoading: studentCountLoading } = useStudentCount();
  const { invalidateStaff, invalidateStudents, invalidateExport } = useInvalidateQueries();

  // Export state
  const [exportDays, setExportDays] = useState(30);
  const { data: exportCount = null, isLoading: exportCountLoading } = useExportCount(exportDays);

  // Staff state
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({
    email: '',
    name: '',
    room: '',
    role: 'teacher',
  });

  // Student state
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    id: '',
    name: '',
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  const handleExport = async () => {
    setLoading(true);
    
    try {
      let q;
      
      if (exportDays === 'all') {
        q = query(
          collection(db, COLLECTIONS.PASS_HISTORY),
          firestoreOrderBy('createdAt', 'desc')
        );
      } else {
        const since = new Date();
        since.setDate(since.getDate() - exportDays);
        since.setHours(0, 0, 0, 0);
        
        q = query(
          collection(db, COLLECTIONS.PASS_HISTORY),
          where('createdAt', '>=', Timestamp.fromDate(since)),
          firestoreOrderBy('createdAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        showMessage('error', 'No passes found to export');
        setLoading(false);
        return;
      }

      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          studentId: d.studentId || '',
          studentName: d.studentName || '',
          roomFrom: d.roomFrom || '',
          destination: d.destination || '',
          customDestination: d.customDestination || '',
          checkOutTime: formatDateForCSV(d.checkOutTime),
          checkInTime: formatDateForCSV(d.checkInTime),
          duration: d.duration || '',
          status: d.status || '',
          autoCheckedIn: d.autoCheckedIn ? 'Yes' : 'No',
        };
      });

      const today = new Date().toISOString().split('T')[0];
      const filename = `passHistory_${today}.csv`;
      
      exportToCSV(data, filename);
      showMessage('success', `Exported ${data.length} passes successfully`);
      
    } catch (error) {
      console.error('Error exporting:', error);
      showMessage('error', 'Export failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // STAFF FUNCTIONS
  // ============================================

  const handleStaffCSV = async (file, mode) => {
    setLoading(true);
    
    try {
      const text = await file.text();
      const result = parseCSV(text, ['email', 'name', 'role']);
      
      if (!result.success) {
        showMessage('error', result.error);
        setLoading(false);
        return;
      }

      const { data } = result;
      
      // Validate data
      const errors = [];
      data.forEach((row, idx) => {
        if (!row.email.endsWith('@ofcs.net')) {
          errors.push(`Row ${idx + 2}: Email must end with @ofcs.net`);
        }
        if (!['admin', 'teacher'].includes(row.role.toLowerCase())) {
          errors.push(`Row ${idx + 2}: Role must be 'admin' or 'teacher'`);
        }
      });

      if (errors.length > 0) {
        showMessage('error', errors.join(', '));
        setLoading(false);
        return;
      }

      // Confirm action
      const action = mode === 'replace' ? 'REPLACE ALL' : 'MERGE/UPDATE';
      if (!window.confirm(`${action} ${data.length} staff members?`)) {
        setLoading(false);
        return;
      }

      const batch = writeBatch(db);

      // If replace, delete all existing first
      if (mode === 'replace') {
        const existing = await getDocs(collection(db, COLLECTIONS.STAFF));
        existing.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      // Add/update staff
      data.forEach(row => {
        const staffRef = doc(db, COLLECTIONS.STAFF, row.email.toLowerCase());
        const staffData = {
          email: row.email.toLowerCase(),
          name: row.name,
          room: row.room || null,
          role: row.role.toLowerCase(),
          active: true,
          dropdownText: row.room ? `${row.name} (${row.room})` : row.name,
        };
        batch.set(staffRef, staffData, { merge: mode === 'merge' });
      });

      await batch.commit();
      
      showMessage('success', `${action}: ${data.length} staff members processed`);
      invalidateStaff(); // ✅ Invalidate cache
      
    } catch (error) {
      console.error('Error importing staff:', error);
      showMessage('error', 'Import failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.email.endsWith('@ofcs.net')) {
      showMessage('error', 'Email must end with @ofcs.net');
      return;
    }

    if (!newStaff.name || !newStaff.role) {
      showMessage('error', 'Name and role are required');
      return;
    }

    setLoading(true);

    try {
      const staffRef = doc(db, COLLECTIONS.STAFF, newStaff.email.toLowerCase());
      const staffData = {
        email: newStaff.email.toLowerCase(),
        name: newStaff.name,
        room: newStaff.room || null,
        role: newStaff.role,
        active: true,
        dropdownText: newStaff.room ? `${newStaff.name} (${newStaff.room})` : newStaff.name,
      };

      await setDoc(staffRef, staffData);
      
      showMessage('success', `Added ${newStaff.name} successfully`);
      setNewStaff({ email: '', name: '', room: '', role: 'teacher' });
      setShowAddStaff(false);
      invalidateStaff(); // ✅ Invalidate cache
      
    } catch (error) {
      console.error('Error adding staff:', error);
      showMessage('error', 'Failed to add staff: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStaffActive = async (staffMember) => {
    setLoading(true);
    
    try {
      const staffRef = doc(db, COLLECTIONS.STAFF, staffMember.id);
      await updateDoc(staffRef, {
        active: !staffMember.active,
      });
      
      showMessage('success', `${staffMember.name} ${staffMember.active ? 'deactivated' : 'activated'}`);
      invalidateStaff(); // ✅ Invalidate cache
      
    } catch (error) {
      console.error('Error toggling staff:', error);
      showMessage('error', 'Failed to update staff');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // STUDENT FUNCTIONS
  // ============================================

  const handleStudentCSV = async (file, mode) => {
    setLoading(true);
    
    try {
      const text = await file.text();
      const result = parseCSV(text, ['id', 'name']);
      
      if (!result.success) {
        showMessage('error', result.error);
        setLoading(false);
        return;
      }

      const { data } = result;
      
      // Validate data
      const errors = [];
      data.forEach((row, idx) => {
        if (!/^\d{6}$/.test(row.id)) {
          errors.push(`Row ${idx + 2}: Student ID must be 6 digits`);
        }
      });

      if (errors.length > 0) {
        showMessage('error', errors.join(', '));
        setLoading(false);
        return;
      }

      // Confirm action
      const action = mode === 'replace' ? 'REPLACE ALL' : 'MERGE/UPDATE';
      if (!window.confirm(`${action} ${data.length} students?`)) {
        setLoading(false);
        return;
      }

      const batch = writeBatch(db);

      // If replace, delete all existing first
      if (mode === 'replace') {
        const existing = await getDocs(collection(db, COLLECTIONS.STUDENTS));
        existing.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      // Add/update students
      data.forEach(row => {
        const studentRef = doc(db, COLLECTIONS.STUDENTS, row.id);
        const studentData = {
          id: row.id,
          name: row.name,
        };
        batch.set(studentRef, studentData, { merge: mode === 'merge' });
      });

      await batch.commit();
      
      showMessage('success', `${action}: ${data.length} students processed`);
      invalidateStudents(); // ✅ Invalidate cache
      
    } catch (error) {
      console.error('Error importing students:', error);
      showMessage('error', 'Import failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!/^\d{6}$/.test(newStudent.id)) {
      showMessage('error', 'Student ID must be 6 digits');
      return;
    }

    if (!newStudent.name) {
      showMessage('error', 'Name is required');
      return;
    }

    setLoading(true);

    try {
      const studentRef = doc(db, COLLECTIONS.STUDENTS, newStudent.id);
      await setDoc(studentRef, {
        id: newStudent.id,
        name: newStudent.name,
      });
      
      showMessage('success', `Added ${newStudent.name} successfully`);
      setNewStudent({ id: '', name: '' });
      setShowAddStudent(false);
      invalidateStudents(); // ✅ Invalidate cache
      
    } catch (error) {
      console.error('Error adding student:', error);
      showMessage('error', 'Failed to add student: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const Section = ({ id, title, icon: Icon, children }) => {
    const isExpanded = expandedSection === id;
    
    return (
      <div className="bg-white rounded-lg shadow-sm border mb-4">
        <button
          onClick={() => setExpandedSection(isExpanded ? null : id)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Icon size={24} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          </div>
          {isExpanded ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </button>
        
        {isExpanded && (
          <div className="px-6 py-4 border-t">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle size={20} className="mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Export Section */}
      <Section id="export" title="Export Pass History" icon={Download}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Time Period
            </label>
            <select
              value={exportDays}
              onChange={(e) => setExportDays(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border rounded-lg bg-white"
              disabled={loading}
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {exportCount !== null && !exportCountLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Ready to export <strong>{exportCount.toLocaleString()}</strong> passes
              </p>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={loading || exportCount === 0}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={18} />
                Export to CSV
              </>
            )}
          </button>
        </div>
      </Section>

      {/* Staff Section */}
      <Section id="staff" title="Manage Staff" icon={Users}>
        <div className="space-y-6">
          {/* Upload CSV */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Upload CSV</h3>
            <div className="flex gap-3">
              <label className="flex-1">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      if (window.confirm('Replace all existing staff?')) {
                        handleStaffCSV(e.target.files[0], 'replace');
                      }
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                  disabled={loading}
                />
                <div className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                  <Upload size={20} className="mx-auto mb-1 text-gray-400" />
                  <span className="text-sm text-gray-600">Replace All Staff</span>
                </div>
              </label>

              <label className="flex-1">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleStaffCSV(e.target.files[0], 'merge');
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                  disabled={loading}
                />
                <div className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                  <Upload size={20} className="mx-auto mb-1 text-gray-400" />
                  <span className="text-sm text-gray-600">Merge/Update Staff</span>
                </div>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              CSV format: email, name, room (optional), role (admin/teacher)
            </p>
          </div>

          {/* Add Individual */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Add Individual Staff</h3>
              <button
                onClick={() => setShowAddStaff(!showAddStaff)}
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <UserPlus size={16} />
                {showAddStaff ? 'Cancel' : 'Add Staff'}
              </button>
            </div>

            {showAddStaff && (
              <div className="border rounded-lg p-4 space-y-3">
                <input
                  type="email"
                  placeholder="Email (@ofcs.net)"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Name"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Room (optional)"
                  value={newStaff.room}
                  onChange={(e) => setNewStaff({ ...newStaff, room: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={handleAddStaff}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  Add Staff Member
                </button>
              </div>
            )}
          </div>

          {/* Current Staff */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Current Staff ({staffLoading ? '...' : staff.length} total)
            </h3>
            {staffLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={24} className="animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {staff.map((s) => (
                  <div key={s.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{s.name}</p>
                      <p className="text-sm text-gray-500">
                        {s.email} • Room {s.room || 'N/A'} • {s.role}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleStaffActive(s)}
                      disabled={loading}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        s.active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {s.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Students Section */}
      <Section id="students" title="Manage Students" icon={GraduationCap}>
        <div className="space-y-6">
          {/* Upload CSV */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Upload CSV</h3>
            <div className="flex gap-3">
              <label className="flex-1">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      if (window.confirm('Replace all existing students?')) {
                        handleStudentCSV(e.target.files[0], 'replace');
                      }
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                  disabled={loading}
                />
                <div className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                  <Upload size={20} className="mx-auto mb-1 text-gray-400" />
                  <span className="text-sm text-gray-600">Replace All Students</span>
                </div>
              </label>

              <label className="flex-1">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleStudentCSV(e.target.files[0], 'merge');
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                  disabled={loading}
                />
                <div className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                  <Upload size={20} className="mx-auto mb-1 text-gray-400" />
                  <span className="text-sm text-gray-600">Merge/Update Students</span>
                </div>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              CSV format: id (6 digits), name
            </p>
          </div>

          {/* Add Individual */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Add Individual Student</h3>
              <button
                onClick={() => setShowAddStudent(!showAddStudent)}
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <UserPlus size={16} />
                {showAddStudent ? 'Cancel' : 'Add Student'}
              </button>
            </div>

            {showAddStudent && (
              <div className="border rounded-lg p-4 space-y-3">
                <input
                  type="text"
                  placeholder="Student ID (6 digits)"
                  value={newStudent.id}
                  onChange={(e) => setNewStudent({ ...newStudent, id: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  maxLength={6}
                />
                <input
                  type="text"
                  placeholder="Student Name"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <button
                  onClick={handleAddStudent}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  Add Student
                </button>
              </div>
            )}
          </div>

          {/* Student Count */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>{studentCountLoading ? '...' : studentCount.toLocaleString()}</strong> students in database
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default AdminPanel;