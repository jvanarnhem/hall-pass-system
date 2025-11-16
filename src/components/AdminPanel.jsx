// src/components/AdminPanel.jsx
import React, { useState, useMemo } from 'react';
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
  Edit2,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';
import {
  collection,
  getDocs,
  getDoc,
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
  useInvalidateQueries
} from '../hooks/usePassQueries';

// ============================================
// EDIT DIALOGS
// ============================================

const EditStaffDialog = ({ staff, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    email: staff.email || '',
    name: staff.name || '',
    room: staff.room || '',
    role: staff.role || 'teacher',
  });

  const handleSave = () => {
    if (!formData.email.endsWith('@ofcs.net')) {
      alert('Email must end with @ofcs.net');
      return;
    }
    if (!formData.name) {
      alert('Name is required');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Edit Staff Member</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed (it's the document ID)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
            <input
              type="text"
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const EditStudentDialog = ({ student, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    id: student.id || '',
    name: student.name || '',
  });

  const handleSave = () => {
    if (!/^\d{6}$/.test(formData.id)) {
      alert('Student ID must be 6 digits');
      return;
    }
    if (!formData.name) {
      alert('Name is required');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Edit Student</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
            <input
              type="text"
              value={formData.id}
              className="w-full px-3 py-2 border rounded-lg bg-gray-100"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">ID cannot be changed (it's the document ID)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const CleanupResultsDialog = ({ results, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Database Cleanup Results</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap">
            {results}
          </pre>
        </div>

        <div className="flex gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SECTION COMPONENT (outside to prevent re-creation)
// ============================================

const Section = ({ id, title, icon: Icon, children, isExpanded, onToggle }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border mb-4">
      <button
        onClick={onToggle}
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

const AdminPanel = () => {
  const [expandedSection, setExpandedSection] = useState('export');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // React Query hooks
  const { data: staff = [], isLoading: staffLoading } = useStaffList();
  const { data: studentCount = 0, isLoading: studentCountLoading } = useStudentCount();
  const { invalidateStaff, invalidateStudents } = useInvalidateQueries();

  // Export state - date range instead of days
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [exportStartDate, setExportStartDate] = useState(getDateDaysAgo(30));
  const [exportEndDate, setExportEndDate] = useState(getTodayString());

  // Staff state
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({
    email: '',
    name: '',
    room: '',
    role: 'teacher',
  });
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffPage, setStaffPage] = useState(0);
  const STAFF_PER_PAGE = 25;

  // Student state
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    id: '',
    name: '',
  });
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentPage, setStudentPage] = useState(0);
  const [allStudents, setAllStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const STUDENTS_PER_PAGE = 25;

  // Cleanup state
  const [cleanupResults, setCleanupResults] = useState(null);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    checkoutEnabled: true,
    maxCheckoutMinutes: 46,
    blockWeekends: true,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Load settings when component mounts or settings section is expanded
  React.useEffect(() => {
    if (expandedSection === 'settings') {
      loadSettings();
    }
  }, [expandedSection]);

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const docRef = doc(db, COLLECTIONS.SETTINGS, 'system');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        // Set defaults if no settings exist
        setSettings({
          checkoutEnabled: true,
          maxCheckoutMinutes: 46,
          blockWeekends: true,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('error', 'Failed to load settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  // ============================================
  // FILTERED & PAGINATED DATA
  // ============================================

  // Staff filtering and pagination
  const filteredStaff = useMemo(() => {
    if (!staffSearchQuery) return staff;
    const query = staffSearchQuery.toLowerCase();
    return staff.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      (s.room && s.room.toLowerCase().includes(query))
    );
  }, [staff, staffSearchQuery]);

  const paginatedStaff = useMemo(() => {
    const start = staffPage * STAFF_PER_PAGE;
    return filteredStaff.slice(start, start + STAFF_PER_PAGE);
  }, [filteredStaff, staffPage, STAFF_PER_PAGE]);

  const staffTotalPages = Math.ceil(filteredStaff.length / STAFF_PER_PAGE);

  // Student filtering and pagination
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery) return allStudents;
    const query = studentSearchQuery.toLowerCase();
    return allStudents.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.id.includes(query)
    );
  }, [allStudents, studentSearchQuery]);

  const paginatedStudents = useMemo(() => {
    const start = studentPage * STUDENTS_PER_PAGE;
    return filteredStudents.slice(start, start + STUDENTS_PER_PAGE);
  }, [filteredStudents, studentPage, STUDENTS_PER_PAGE]);

  const studentTotalPages = Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE);

  // Load all students when students section is expanded
  React.useEffect(() => {
    if (expandedSection === 'students' && allStudents.length === 0) {
      loadAllStudents();
    }
  }, [expandedSection]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAllStudents = async () => {
    setStudentsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.STUDENTS));
      const students = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      students.sort((a, b) => a.name.localeCompare(b.name));
      setAllStudents(students);
    } catch (error) {
      console.error('Error loading students:', error);
      showMessage('error', 'Failed to load students');
    } finally {
      setStudentsLoading(false);
    }
  };

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  // Fetch pass data for export based on date range
  const fetchPassDataForExport = async () => {
    const startDate = new Date(exportStartDate + 'T00:00:00');
    const endDate = new Date(exportEndDate + 'T23:59:59.999');

    const q = query(
      collection(db, COLLECTIONS.PASS_HISTORY),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      firestoreOrderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs.map(doc => {
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
  };

  const handleExportCSV = async () => {
    setLoading(true);

    try {
      const data = await fetchPassDataForExport();

      if (!data) {
        showMessage('error', 'No passes found in selected date range');
        setLoading(false);
        return;
      }

      const filename = `passHistory_${exportStartDate}_to_${exportEndDate}.csv`;
      exportToCSV(data, filename);
      showMessage('success', `Exported ${data.length} passes to CSV`);

    } catch (error) {
      console.error('Error exporting to CSV:', error);
      showMessage('error', 'CSV export failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportGoogleSheets = async () => {
    setLoading(true);

    try {
      const data = await fetchPassDataForExport();

      if (!data) {
        showMessage('error', 'No passes found in selected date range');
        setLoading(false);
        return;
      }

      // Convert data to TSV format (tab-separated values) for Google Sheets
      const headers = ['Student ID', 'Student Name', 'Room From', 'Destination', 'Custom Destination', 'Check Out Time', 'Check In Time', 'Duration (min)', 'Status', 'Auto Checked In'];
      const rows = data.map(row => [
        row.studentId,
        row.studentName,
        row.roomFrom,
        row.destination,
        row.customDestination,
        row.checkOutTime,
        row.checkInTime,
        row.duration,
        row.status,
        row.autoCheckedIn
      ]);

      const tsvContent = [headers, ...rows].map(row => row.join('\t')).join('\n');

      // Copy to clipboard
      await navigator.clipboard.writeText(tsvContent);

      // Open Google Sheets in a new tab
      const sheetsUrl = 'https://docs.google.com/spreadsheets/create';
      window.open(sheetsUrl, '_blank');

      showMessage('success', `Copied ${data.length} passes to clipboard. Paste into the new Google Sheet (Ctrl+V or Cmd+V)`);

    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      showMessage('error', 'Google Sheets export failed: ' + error.message);
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

  const handleEditStaff = async (formData) => {
    setLoading(true);
    try {
      const staffRef = doc(db, COLLECTIONS.STAFF, editingStaff.id);
      const staffData = {
        email: formData.email.toLowerCase(),
        name: formData.name,
        room: formData.room || null,
        role: formData.role,
        active: editingStaff.active,
        dropdownText: formData.room ? `${formData.name} (${formData.room})` : formData.name,
      };

      await updateDoc(staffRef, staffData);

      showMessage('success', `Updated ${formData.name} successfully`);
      setEditingStaff(null);
      invalidateStaff();

    } catch (error) {
      console.error('Error updating staff:', error);
      showMessage('error', 'Failed to update staff: ' + error.message);
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
      loadAllStudents(); // Reload student list

    } catch (error) {
      console.error('Error adding student:', error);
      showMessage('error', 'Failed to add student: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStudent = async (formData) => {
    setLoading(true);
    try {
      const studentRef = doc(db, COLLECTIONS.STUDENTS, editingStudent.id);
      await updateDoc(studentRef, {
        name: formData.name,
      });

      showMessage('success', `Updated ${formData.name} successfully`);
      setEditingStudent(null);
      invalidateStudents();
      loadAllStudents(); // Reload student list

    } catch (error) {
      console.error('Error updating student:', error);
      showMessage('error', 'Failed to update student: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SETTINGS FUNCTIONS
  // ============================================

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'system');
      await setDoc(settingsRef, settings);

      showMessage('success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('error', 'Failed to save settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // CLEANUP FUNCTIONS
  // ============================================

  const handleDatabaseCleanup = async () => {
    setLoading(true);

    try {
      // Test student IDs
      const TEST_STUDENT_IDS = ['123456', '987654'];

      // ===== STEP 1: COUNT what will be deleted =====

      // Count test passes in passHistory for each student
      const history123456Query = query(
        collection(db, COLLECTIONS.PASS_HISTORY),
        where('studentId', '==', '123456')
      );
      const history987654Query = query(
        collection(db, COLLECTIONS.PASS_HISTORY),
        where('studentId', '==', '987654')
      );

      // Count test passes in activePasses for each student
      const active123456Query = query(
        collection(db, COLLECTIONS.ACTIVE_PASSES),
        where('studentId', '==', '123456')
      );
      const active987654Query = query(
        collection(db, COLLECTIONS.ACTIVE_PASSES),
        where('studentId', '==', '987654')
      );

      const [history123456, history987654, active123456, active987654] = await Promise.all([
        getDocs(history123456Query),
        getDocs(history987654Query),
        getDocs(active123456Query),
        getDocs(active987654Query),
      ]);

      const count123456 = history123456.size + active123456.size;
      const count987654 = history987654.size + active987654.size;

      // Count duplicates
      const allHistorySnapshot = await getDocs(collection(db, COLLECTIONS.PASS_HISTORY));
      const groupedPasses = new Map();

      allHistorySnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const key = `${data.studentId}-${data.checkOutTime?.toMillis()}-${data.checkInTime?.toMillis()}`;

        if (!groupedPasses.has(key)) {
          groupedPasses.set(key, []);
        }
        groupedPasses.get(key).push(docSnap.id);
      });

      let duplicateCount = 0;
      groupedPasses.forEach((ids) => {
        if (ids.length > 1) {
          duplicateCount += ids.length - 1; // Count all but the first (which we keep)
        }
      });

      const totalToDelete = count123456 + count987654 + duplicateCount;

      // ===== STEP 2: Show confirmation with counts =====
      setLoading(false);

      if (totalToDelete === 0) {
        showMessage('success', 'No passes to delete. Database is clean!');
        return;
      }

      const confirmMessage = `⚠️ DATABASE CLEANUP CONFIRMATION\n\nThis will permanently delete:\n\n` +
        `• Student ID 123456: ${count123456} passes\n` +
        `• Student ID 987654: ${count987654} passes\n` +
        `• Duplicate passes: ${duplicateCount} passes\n\n` +
        `TOTAL: ${totalToDelete} passes will be deleted\n\n` +
        `Continue with cleanup?`;

      if (!window.confirm(confirmMessage)) {
        return;
      }

      // ===== STEP 3: Perform the deletion =====
      setLoading(true);
      const logs = [];

      logs.push('🔍 Starting database cleanup...\n');

      // 1. Delete test passes from passHistory
      logs.push('1️⃣ Deleting test passes from passHistory...');
      const historyQuery = query(
        collection(db, COLLECTIONS.PASS_HISTORY),
        where('studentId', 'in', TEST_STUDENT_IDS)
      );
      const historySnapshot = await getDocs(historyQuery);

      if (historySnapshot.size > 0) {
        const historyBatch = writeBatch(db);
        historySnapshot.docs.forEach(docSnap => {
          historyBatch.delete(docSnap.ref);
        });
        await historyBatch.commit();
        logs.push(`   ✅ Deleted ${historySnapshot.size} test passes from passHistory\n`);
      } else {
        logs.push('   ✅ No test passes found in passHistory\n');
      }

      // 2. Delete test passes from activePasses
      logs.push('2️⃣ Deleting test passes from activePasses...');
      const activeQuery = query(
        collection(db, COLLECTIONS.ACTIVE_PASSES),
        where('studentId', 'in', TEST_STUDENT_IDS)
      );
      const activeSnapshot = await getDocs(activeQuery);

      if (activeSnapshot.size > 0) {
        const activeBatch = writeBatch(db);
        activeSnapshot.docs.forEach(docSnap => {
          activeBatch.delete(docSnap.ref);
        });
        await activeBatch.commit();
        logs.push(`   ✅ Deleted ${activeSnapshot.size} test passes from activePasses\n`);
      } else {
        logs.push('   ✅ No test passes found in activePasses\n');
      }

      // 3. Delete duplicates
      logs.push('3️⃣ Deleting duplicate passes from passHistory...');

      const duplicateIds = [];
      groupedPasses.forEach((ids) => {
        if (ids.length > 1) {
          // Keep first, delete rest
          duplicateIds.push(...ids.slice(1));
        }
      });

      if (duplicateIds.length > 0) {
        // Delete in batches of 500
        const batchSize = 500;
        for (let i = 0; i < duplicateIds.length; i += batchSize) {
          const batch = writeBatch(db);
          const batchIds = duplicateIds.slice(i, i + batchSize);

          batchIds.forEach(id => {
            batch.delete(doc(db, COLLECTIONS.PASS_HISTORY, id));
          });

          await batch.commit();
          logs.push(`   Deleted ${Math.min(i + batchSize, duplicateIds.length)}/${duplicateIds.length} duplicates...`);
        }
        logs.push(`   ✅ Deleted ${duplicateIds.length} duplicate passes\n`);
      } else {
        logs.push('   ✅ No duplicate passes found\n');
      }

      logs.push('✨ Cleanup complete!\n');
      logs.push(`\nSummary:`);
      logs.push(`• Student ID 123456: ${count123456} passes deleted`);
      logs.push(`• Student ID 987654: ${count987654} passes deleted`);
      logs.push(`• Duplicate passes: ${duplicateIds.length} passes deleted`);
      logs.push(`\nTOTAL: ${historySnapshot.size + activeSnapshot.size + duplicateIds.length} passes deleted`);

      setCleanupResults(logs.join('\n'));
      setShowCleanupDialog(true);
      showMessage('success', `Cleanup complete! Deleted ${historySnapshot.size + activeSnapshot.size + duplicateIds.length} passes.`);

    } catch (error) {
      console.error('Error during cleanup:', error);
      const logs = [`❌ Error: ${error.message}`];
      setCleanupResults(logs.join('\n'));
      setShowCleanupDialog(true);
      showMessage('error', 'Cleanup failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

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

      {/* Settings Section */}
      <Section
        id="settings"
        title="System Settings"
        icon={Settings}
        isExpanded={expandedSection === 'settings'}
        onToggle={() => setExpandedSection(expandedSection === 'settings' ? null : 'settings')}
      >
        {settingsLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={24} className="animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Checkout Enabled Toggle */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.checkoutEnabled}
                  onChange={(e) => setSettings({ ...settings, checkoutEnabled: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-medium text-gray-800">Enable Student Checkouts</div>
                  <div className="text-sm text-gray-500">Allow students to create new hall passes</div>
                </div>
              </label>
            </div>

            {/* Max Checkout Minutes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Checkout Time (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={settings.maxCheckoutMinutes}
                onChange={(e) => setSettings({ ...settings, maxCheckoutMinutes: parseInt(e.target.value) || 46 })}
                className="w-full md:w-64 px-4 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Time before a pass is automatically checked in (typically class period length)
              </p>
            </div>

            {/* Block Weekends Toggle */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.blockWeekends}
                  onChange={(e) => setSettings({ ...settings, blockWeekends: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-medium text-gray-800">Block Weekend Checkouts</div>
                  <div className="text-sm text-gray-500">Prevent students from creating passes on weekends</div>
                </div>
              </label>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t">
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* Export Section */}
      <Section
        id="export"
        title="Export Pass History"
        icon={Download}
        isExpanded={expandedSection === 'export'}
        onToggle={() => setExpandedSection(expandedSection === 'export' ? null : 'export')}
      >
        <div className="space-y-4">
          {/* Date Range Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                max={exportEndDate}
                className="w-full px-4 py-2 border rounded-lg bg-white"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                min={exportStartDate}
                max={getTodayString()}
                className="w-full px-4 py-2 border rounded-lg bg-white"
                disabled={loading}
              />
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setExportStartDate(getDateDaysAgo(7));
                setExportEndDate(getTodayString());
              }}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={loading}
            >
              Last 7 days
            </button>
            <button
              onClick={() => {
                setExportStartDate(getDateDaysAgo(30));
                setExportEndDate(getTodayString());
              }}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={loading}
            >
              Last 30 days
            </button>
            <button
              onClick={() => {
                setExportStartDate(getDateDaysAgo(90));
                setExportEndDate(getTodayString());
              }}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={loading}
            >
              Last 90 days
            </button>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportCSV}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

            <button
              onClick={handleExportGoogleSheets}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={18} />
                  Export to Google Sheets
                </>
              )}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Google Sheets:</strong> Data will be copied to clipboard and a new Google Sheet will open. Simply paste (Ctrl+V or Cmd+V) into the sheet.
            </p>
          </div>
        </div>
      </Section>

      {/* Staff Section */}
      <Section
        id="staff"
        title="Manage Staff"
        icon={Users}
        isExpanded={expandedSection === 'staff'}
        onToggle={() => setExpandedSection(expandedSection === 'staff' ? null : 'staff')}
      >
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                Current Staff ({staffLoading ? '...' : filteredStaff.length} {staffSearchQuery ? 'filtered' : 'total'})
              </h3>
            </div>

            {/* Search */}
            <div className="mb-3 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or room..."
                value={staffSearchQuery}
                onChange={(e) => {
                  setStaffSearchQuery(e.target.value);
                  setStaffPage(0); // Reset to first page on search
                }}
                className="w-full pl-10 pr-3 py-2 border rounded-lg"
              />
            </div>

            {staffLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={24} className="animate-spin text-indigo-600" />
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-gray-500">
                {staffSearchQuery ? 'No staff found matching your search' : 'No staff members found'}
              </div>
            ) : (
              <>
                <div className="border rounded-lg divide-y">
                  {paginatedStaff.map((s) => (
                    <div key={s.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{s.name}</p>
                        <p className="text-sm text-gray-500">
                          {s.email} • Room {s.room || 'N/A'} • {s.role}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingStaff(s)}
                          disabled={loading}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Edit staff member"
                        >
                          <Edit2 size={16} />
                        </button>
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
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {staffTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="text-gray-600">
                      Page {staffPage + 1} of {staffTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setStaffPage(p => p - 1)}
                        disabled={staffPage === 0}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <ChevronLeft size={16} />
                        Previous
                      </button>
                      <button
                        onClick={() => setStaffPage(p => p + 1)}
                        disabled={staffPage >= staffTotalPages - 1}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        Next
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Section>

      {/* Database Cleanup Section */}
      <Section
        id="cleanup"
        title="Database Cleanup"
        icon={AlertCircle}
        isExpanded={expandedSection === 'cleanup'}
        onToggle={() => setExpandedSection(expandedSection === 'cleanup' ? null : 'cleanup')}
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 mb-2">
              <strong>⚠️ Warning:</strong> This will permanently delete:
            </p>
            <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>All test passes for student IDs <code className="bg-yellow-100 px-1 rounded">123456</code> and <code className="bg-yellow-100 px-1 rounded">987654</code></li>
              <li>All duplicate pass records in the database</li>
            </ul>
          </div>

          <button
            onClick={handleDatabaseCleanup}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <AlertCircle size={18} />
                Run Database Cleanup
              </>
            )}
          </button>
        </div>
      </Section>

      {/* Students Section */}
      <Section
        id="students"
        title="Manage Students"
        icon={GraduationCap}
        isExpanded={expandedSection === 'students'}
        onToggle={() => setExpandedSection(expandedSection === 'students' ? null : 'students')}
      >
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

          {/* Student List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                Student List ({studentsLoading ? '...' : filteredStudents.length} {studentSearchQuery ? 'filtered' : 'total'})
              </h3>
            </div>

            {/* Search */}
            <div className="mb-3 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={studentSearchQuery}
                onChange={(e) => {
                  setStudentSearchQuery(e.target.value);
                  setStudentPage(0); // Reset to first page on search
                }}
                className="w-full pl-10 pr-3 py-2 border rounded-lg"
              />
            </div>

            {studentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={24} className="animate-spin text-indigo-600" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-gray-500">
                {studentSearchQuery ? 'No students found matching your search' : 'No students found'}
              </div>
            ) : (
              <>
                <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                  {paginatedStudents.map((student) => (
                    <div key={student.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{student.name}</p>
                        <p className="text-sm text-gray-500">ID: {student.id}</p>
                      </div>
                      <button
                        onClick={() => setEditingStudent(student)}
                        disabled={loading}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Edit student"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {studentTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="text-gray-600">
                      Page {studentPage + 1} of {studentTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setStudentPage(p => p - 1)}
                        disabled={studentPage === 0}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <ChevronLeft size={16} />
                        Previous
                      </button>
                      <button
                        onClick={() => setStudentPage(p => p + 1)}
                        disabled={studentPage >= studentTotalPages - 1}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        Next
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Student Count Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>{studentCountLoading ? '...' : studentCount.toLocaleString()}</strong> students in database
            </p>
          </div>
        </div>
      </Section>

      {/* Edit Dialogs */}
      {editingStaff && (
        <EditStaffDialog
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSave={handleEditStaff}
        />
      )}

      {editingStudent && (
        <EditStudentDialog
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSave={handleEditStudent}
        />
      )}

      {/* Cleanup Results Dialog */}
      {showCleanupDialog && cleanupResults && (
        <CleanupResultsDialog
          results={cleanupResults}
          onClose={() => setShowCleanupDialog(false)}
        />
      )}
    </div>
  );
};

export default AdminPanel;