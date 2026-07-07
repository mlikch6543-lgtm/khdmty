
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, ClassGroup, StudentDailyRecord, AppNotification, Occasion, OccasionPayment, LessonPreparation, User, UserRole, PreparationComment } from '../types';
import { 
  Save, 
  Plus, 
  X, 
  CheckCircle, 
  BellRing, 
  Phone, 
  Cake, 
  User as UserIcon, 
  Search, 
  Gift, 
  ChevronLeft, 
  Trash2, 
  AlertCircle, 
  AlertTriangle, 
  Edit2, 
  UserCheck, 
  FileText, 
  StickyNote, 
  Upload, 
  Image as ImageIcon, 
  Send,
  XCircle,
  RefreshCw,
  Lock,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Eye,
  History,
  ExternalLink,
  MessageCircle,
  ChevronDown
} from 'lucide-react';
import { addData, deleteData, updateData } from '../services/firebase';

// --- Shared Internal Components ---

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = "تأكيد الحذف", isDanger = true }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string, confirmText?: string, isDanger?: boolean }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 transition-colors border border-gray-100 dark:border-slate-700 animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className={`flex items-center gap-3 ${isDanger ? 'text-red-600' : 'text-indigo-600'} mb-4`}>
          <div className={`${isDanger ? 'bg-red-50 dark:bg-red-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'} p-3 rounded-full`}>
             {isDanger ? <AlertTriangle size={24} /> : <AlertCircle size={24} />}
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed font-medium">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose} 
            className="px-4 py-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 font-bold transition-colors"
          >
            إلغاء
          </button>
          <button 
            type="button"
            onClick={() => { onConfirm(); onClose(); }} 
            className={`px-6 py-2 rounded-xl text-white font-bold shadow-lg transition-all ${isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'} dark:shadow-none`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

interface AttendanceViewProps {
  availableClasses: ClassGroup[];
  students: Student[];
  attendance: Record<string, any>;
  onSaveAttendance: (date: string, records: Record<string, StudentDailyRecord>) => void;
  onAddStudent: (student: Omit<Student, 'id' | 'attendanceRate'>) => void;
  onEditStudent?: (id: string, data: Partial<Student>) => void;
  onDeleteStudent?: (id: string) => void;
  currentUserName?: string;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ 
    availableClasses, 
    students, 
    attendance, 
    onSaveAttendance, 
    onAddStudent,
    onEditStudent,
    onDeleteStudent,
    currentUserName
}) => {
  const [selectedClassId, setSelectedClassId] = useState(availableClasses[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record<string, StudentDailyRecord>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [editingStudentForNotes, setEditingStudentForNotes] = useState<Student | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  
  const [studentForm, setStudentForm] = useState({
      name: '',
      phone: '',
      birthDate: ''
  });
  
  const [hasSaved, setHasSaved] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false); // Track if user explicitly requested to edit
  const [summary, setSummary] = useState({ present: 0, absent: 0 });

  // New state for Save Confirmation & Progress
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  // New state for Edit/Delete/View
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  const currentClass = useMemo(() => availableClasses.find(c => c.id === selectedClassId) || availableClasses[0], [availableClasses, selectedClassId]);
  const currentClassStudents = useMemo(() => students.filter(s => s.classId === currentClass.id), [students, currentClass]);

  // Determine if the selected date is today to enable/disable editing
  const isToday = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      return date === today;
  }, [date]);

  // Handle default selection if props change
  useEffect(() => {
    if (availableClasses.length > 0 && !availableClasses.find(c => c.id === selectedClassId)) {
        setSelectedClassId(availableClasses[0].id);
    }
  }, [availableClasses]);

  // Reset state when date or class changes
  useEffect(() => {
    setIsManualEdit(false);
    setHasSaved(false);
  }, [date, selectedClassId]);

  // Check if attendance exists for this date and show summary automatically
  useEffect(() => {
    if (isManualEdit) return;

    // Check if any student in this class has a record for the selected date
    const hasData = currentClassStudents.some(student => attendance[`${date}_${student.id}`]);

    if (hasData) {
        const currentRecords = currentClassStudents.map(s => attendance[`${date}_${s.id}`]).filter(Boolean);
        // Explicit typing or check to prevent build errors
        const present = currentRecords.filter((r: any) => r.present).length;
        const absent = currentRecords.filter((r: any) => r.absent).length;
        setSummary({ present, absent });
        setHasSaved(true);
    }
  }, [date, currentClassStudents, attendance, isManualEdit]);

  useEffect(() => {
    // If it's not today, we always want to load the records to display them read-only
    // If it IS today, and we haven't saved or are in manual edit mode, load them too
    if ((hasSaved && !isManualEdit && isToday)) return;

    const dailyRecords: Record<string, StudentDailyRecord> = {};
    currentClassStudents.forEach(student => {
        const key = `${date}_${student.id}`;
        if (attendance[key]) {
            dailyRecords[student.id] = attendance[key];
        }
    });
    setRecords(dailyRecords);
  }, [date, currentClassStudents, attendance, hasSaved, isManualEdit, isToday]);

  const handleCheck = (studentId: string, field: keyof StudentDailyRecord) => {
    if (!isToday) return; // Prevent editing past dates

    setRecords(prev => {
      const current = prev[studentId] || {
        studentId,
        present: false,
        absent: false,
        attendedMass: false,
        communion: false,
        prayer: false,
        didVisitation: false,
        notes: ''
      };
      
      const updated = { ...current, [field]: !current[field] } as any;

      if (field === 'present' && updated.present) updated.absent = false;
      if (field === 'absent' && updated.absent) updated.present = false;

      return { ...prev, [studentId]: updated };
    });
  };

  const handleSaveClick = () => {
    if (!isToday) return;
    setIsSaveConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsSaveConfirmOpen(false);
    setIsSaving(true);
    setSaveProgress(0);

    // Simulate progress counter
    const totalSteps = 100;
    const intervalTime = 20; // 2 seconds total roughly
    
    for (let i = 0; i <= totalSteps; i++) {
        setSaveProgress(i);
        await new Promise(resolve => setTimeout(resolve, intervalTime));
    }

    // Calculate summary counts before clearing
    const presentCount = Object.values(records).filter((r: any) => r.present).length;
    const absentCount = Object.values(records).filter((r: any) => r.absent).length;
    setSummary({ present: presentCount, absent: absentCount });

    // Call the central save handler
    await onSaveAttendance(date, records);
    
    setRecords({});
    setHasSaved(true);
    setIsManualEdit(false); // Ensure we stay in summary mode
    setIsSaving(false);

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleEditAgain = () => {
    if (!isToday) return;
    setIsManualEdit(true);
    setHasSaved(false);
  };

  const handleAddStudentSubmit = () => {
    if (!studentForm.name) return;
    
    if (editingStudentId && onEditStudent) {
        onEditStudent(editingStudentId, {
            name: studentForm.name,
            phone: studentForm.phone,
            birthDate: studentForm.birthDate
        });
    } else {
        onAddStudent({
          name: studentForm.name,
          phone: studentForm.phone,
          birthDate: studentForm.birthDate,
          classId: currentClass.id,
          sectorId: currentClass.sectorId,
          age: 0,
          address: '',
          attendanceRate: 0
        } as any);
    }
    setStudentForm({ name: '', phone: '', birthDate: '' });
    setEditingStudentId(null);
    setIsModalOpen(false);
  };

  const openAddModal = () => {
      setEditingStudentId(null);
      setStudentForm({ name: '', phone: '', birthDate: '' });
      setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
      setEditingStudentId(student.id);
      setStudentForm({
          name: student.name,
          phone: student.phone || '',
          birthDate: student.birthDate || ''
      });
      setIsModalOpen(true);
  };

  const confirmDeleteStudent = () => {
      if (studentToDelete && onDeleteStudent) {
          onDeleteStudent(studentToDelete.id);
          setStudentToDelete(null);
      }
  };

  const openNotesModal = (student: Student) => {
    setEditingStudentForNotes(student);
    setTempNotes(records[student.id]?.notes || '');
    setIsNotesModalOpen(true);
  };

  const handleSaveNotes = () => {
    if (editingStudentForNotes && isToday) {
      setRecords(prev => {
        const current = prev[editingStudentForNotes.id] || {
          studentId: editingStudentForNotes.id,
          present: false,
          absent: false,
          attendedMass: false,
          communion: false,
          prayer: false,
          didVisitation: false,
          notes: ''
        };
        return {
          ...prev,
          [editingStudentForNotes.id]: { ...current, notes: tempNotes }
        };
      });
      setIsNotesModalOpen(false);
      setEditingStudentForNotes(null);
    }
  };

  // Helper to render read-only icons or active checkboxes
  const renderCell = (studentId: string, field: keyof StudentDailyRecord, value: boolean, isAbsent: boolean = false) => {
      if (isToday) {
          return (
             <input 
                type="checkbox" 
                checked={value} 
                onChange={() => handleCheck(studentId, field)}
                className={`w-5 h-5 rounded cursor-pointer bg-white border-gray-300 ${isAbsent ? 'accent-red-600' : 'accent-green-600'}`}
             />
          );
      } else {
          // Read-only View
          if (value) {
              return isAbsent ? <XCircle className="text-red-500 mx-auto" size={20} /> : <CheckCircle className="text-green-500 mx-auto" size={20} />;
          }
          return <span className="text-gray-300 dark:text-gray-600 font-bold">-</span>;
      }
  };

  // Class Selection Tabs if multiple classes exist
  const ClassSelector = () => {
      if (availableClasses.length <= 1) return null;
      return (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
              {availableClasses.map(cls => (
                  <button
                      key={cls.id}
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                          selectedClassId === cls.id 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                  >
                      <BookOpen size={16} />
                      {cls.name}
                  </button>
              ))}
          </div>
      );
  };

  if (hasSaved && !isManualEdit && isToday) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <ClassSelector />
        
        {/* Date Switcher in Summary View */}
        <div className="flex items-center justify-center mb-4">
             <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-2">
                <Calendar size={18} className="text-gray-500" />
                <input 
                  type="date" 
                  value={date} 
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent text-gray-700 dark:text-gray-300 font-bold outline-none"
                />
             </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 text-center space-y-8">
            <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center ${isToday ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                {isToday ? <CheckCircle size={56} /> : <History size={56} />}
            </div>
            <div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                    {isToday ? 'تم تسليم الحضور بنجاح' : 'سجل الحضور السابق'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-bold">{currentClass.name} - يوم {date}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-2xl border border-green-100 dark:border-green-900/30">
                <p className="text-sm font-bold text-green-600 dark:text-green-400 mb-1">عدد الحضور</p>
                <h4 className="text-4xl font-black text-green-700 dark:text-green-300">{summary.present}</h4>
                </div>
                <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/30">
                <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">عدد الغياب</p>
                <h4 className="text-4xl font-black text-red-700 dark:text-red-300">{summary.absent}</h4>
                </div>
            </div>

            {isToday && (
                <div className="pt-4">
                    <button 
                    onClick={handleEditAgain}
                    className="flex items-center justify-center gap-2 mx-auto text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                    <ArrowRight size={18} className="rotate-180" />
                    تعديل الكشف مرة أخرى
                    </button>
                </div>
            )}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative animate-fade-in">
      <ClassSelector />
      
      {!isToday && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border-r-4 border-orange-500 p-4 rounded-lg flex items-center gap-3">
              <History size={24} className="text-orange-500" />
              <div>
                  <h3 className="font-bold text-orange-700 dark:text-orange-300">أنت تشاهد سجلاً قديماً</h3>
                  <p className="text-xs text-orange-600 dark:text-orange-400">لا يمكن تعديل الحضور في التواريخ السابقة، العرض للقراءة فقط.</p>
              </div>
          </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{currentClass.name}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">تسجيل الحضور والمتابعة الروحية والافتقاد</p>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={openAddModal}
                disabled={!isToday}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                <Plus size={16} />
                إضافة مخدوم
            </button>
            <div className="relative group">
                <input 
                  type="date" 
                  value={date} 
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-right min-w-[1000px]">
          <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4 text-gray-700 dark:text-gray-300 font-bold w-1/4">اسم المخدوم</th>
              <th className="px-2 py-4 text-center text-gray-700 dark:text-gray-300 font-semibold">حضور</th>
              <th className="px-2 py-4 text-center text-gray-700 dark:text-gray-300 font-semibold">غياب</th>
              <th className="px-2 py-4 text-center text-gray-700 dark:text-gray-300 font-semibold">قداس</th>
              <th className="px-2 py-4 text-center text-gray-700 dark:text-gray-300 font-semibold">تناول</th>
              <th className="px-2 py-4 text-center text-gray-700 dark:text-gray-300 font-semibold">صلاة</th>
              <th className="px-2 py-4 text-center text-gray-700 dark:text-gray-300 font-semibold">افتقاد</th>
              <th className="px-2 py-4 text-center text-gray-700 dark:text-gray-300 font-semibold">الملاحظات</th>
              <th className="px-2 py-4 text-center text-gray-700 dark:text-gray-300 font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {currentClassStudents.map(student => {
              const rec = records[student.id] || { present: false, absent: false, attendedMass: false, communion: false, prayer: false, didVisitation: false, notes: '' };
              return (
                <tr key={student.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${rec.absent ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800 dark:text-gray-200">{student.name}</div>
                  </td>
                  <td className="px-2 py-4 text-center">{renderCell(student.id, 'present', rec.present)}</td>
                  <td className="px-2 py-4 text-center">{renderCell(student.id, 'absent', rec.absent, true)}</td>
                  <td className="px-2 py-4 text-center">{renderCell(student.id, 'attendedMass', rec.attendedMass)}</td>
                  <td className="px-2 py-4 text-center">{renderCell(student.id, 'communion', rec.communion)}</td>
                  <td className="px-2 py-4 text-center">{renderCell(student.id, 'prayer', rec.prayer)}</td>
                  <td className="px-2 py-4 text-center">{renderCell(student.id, 'didVisitation', rec.didVisitation)}</td>
                  <td className="px-2 py-4 text-center">
                    <button 
                        onClick={() => openNotesModal(student)}
                        className={`p-2 rounded-lg transition-all ${rec.notes ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                        title={isToday ? "إضافة/تعديل ملاحظات اليوم" : "عرض الملاحظات"}
                    >
                        <StickyNote size={20} />
                    </button>
                  </td>
                  <td className="px-2 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                        <button 
                            onClick={() => setViewingStudent(student)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-slate-700 dark:hover:text-indigo-400 rounded-lg transition-all"
                            title="عرض التفاصيل"
                        >
                            <Eye size={18} />
                        </button>
                        <button 
                            onClick={() => openEditModal(student)}
                            className="p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 rounded-lg transition-all"
                            title="تعديل البيانات"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button 
                            onClick={() => setStudentToDelete(student)}
                            className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-lg transition-all"
                            title="حذف المخدوم"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        {isToday && (
            <button 
            onClick={handleSaveClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2"
            >
            <Save size={20} />
            <span>حفظ البيانات</span>
            </button>
        )}
      </div>

      {/* Save Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        title="تأكيد حفظ الحضور"
        message="هل أنت متأكد من حفظ بيانات الحضور لهذا اليوم؟ لا يمكن التراجع عن هذه العملية بسهولة."
        confirmText="نعم، حفظ البيانات"
        isDanger={false}
      />

      {/* Saving Progress Modal */}
      {isSaving && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-bounce-in">
                <div className="w-20 h-20 mx-auto mb-6 relative">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle 
                            className="text-gray-200 dark:text-slate-700 stroke-current" 
                            strokeWidth="8" 
                            cx="50" 
                            cy="50" 
                            r="40" 
                            fill="transparent" 
                        ></circle>
                        <circle 
                            className="text-indigo-600 dark:text-indigo-400 progress-ring__circle stroke-current transition-all duration-100 ease-linear" 
                            strokeWidth="8" 
                            strokeLinecap="round" 
                            cx="50" 
                            cy="50" 
                            r="40" 
                            fill="transparent" 
                            strokeDasharray="251.2" 
                            strokeDashoffset={251.2 - (251.2 * saveProgress) / 100}
                            transform="rotate(-90 50 50)"
                        ></circle>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-indigo-600 dark:text-indigo-400">
                        {saveProgress}%
                    </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">جاري حفظ البيانات...</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">يرجى الانتظار حتى اكتمال العملية</p>
            </div>
        </div>
      )}

      {/* View Student Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewingStudent(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-700/50">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                       <UserIcon size={18} className="text-indigo-500" />
                       بيانات المخدوم
                    </h3>
                    <button onClick={() => setViewingStudent(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-white dark:bg-slate-800 p-1 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                            <UserIcon size={40} />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white">{viewingStudent.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{currentClass.name}</p>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/30 rounded-xl">
                            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2"><Phone size={16} /> رقم الهاتف</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{viewingStudent.phone || 'غير مسجل'}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/30 rounded-xl">
                            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2"><Cake size={16} /> تاريخ الميلاد</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{viewingStudent.birthDate || 'غير مسجل'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Notes Modal */}
      {isNotesModalOpen && editingStudentForNotes && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsNotesModalOpen(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-md overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/20">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                       <FileText size={18} className="text-indigo-600" />
                       ملاحظات يوم {date}: {editingStudentForNotes.name}
                    </h3>
                    <button onClick={() => setIsNotesModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <textarea 
                        value={tempNotes}
                        onChange={(e) => setTempNotes(e.target.value)}
                        disabled={!isToday}
                        placeholder={isToday ? "اكتب هنا ملاحظاتك اليومية عن المخدوم (السلوك في اليوم، المشاركة، طلبات صلاة...)" : "لا توجد ملاحظات مسجلة"}
                        rows={6}
                        className="w-full bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none font-medium disabled:opacity-70 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    {isToday && (
                        <button 
                            onClick={handleSaveNotes}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            تأكيد ملاحظة اليوم
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-10 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-bounce">
            <CheckCircle size={24} className="text-white" />
            <span className="font-bold text-xl">تم الحفظ بنجاح</span>
        </div>
      )}

      {/* Add/Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-sm overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-700/50">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                       {editingStudentId ? <Edit2 size={18} className="text-blue-500" /> : <Plus size={18} className="text-green-500" />}
                       {editingStudentId ? 'تعديل بيانات المخدوم' : 'مخدوم جديد'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-white dark:bg-slate-800 p-1 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 mr-1 flex items-center gap-1">
                           <UserIcon size={14} />
                           الاسم بالكامل <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={studentForm.name}
                            onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                            placeholder="اسم المخدوم الثلاثي"
                            className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 mr-1 flex items-center gap-1">
                               <Phone size={14} />
                               رقم الهاتف
                            </label>
                            <input 
                                type="tel" 
                                value={studentForm.phone}
                                onChange={(e) => setStudentForm({...studentForm, phone: e.target.value})}
                                placeholder="01xxxxxxxxx"
                                className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 mr-1 flex items-center gap-1">
                               <Cake size={14} />
                               تاريخ الميلاد
                            </label>
                            <input 
                                type="date" 
                                value={studentForm.birthDate}
                                onChange={(e) => setStudentForm({...studentForm, birthDate: e.target.value})}
                                className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button 
                            onClick={handleAddStudentSubmit}
                            disabled={!studentForm.name}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            {editingStudentId ? 'حفظ التعديلات' : 'إضافة المخدوم للفصل'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={confirmDeleteStudent}
        title="حذف مخدوم"
        message={`هل أنت متأكد من حذف المخدوم "${studentToDelete?.name}"؟ سيتم حذف جميع بيانات الحضور الخاصة به نهائياً.`}
      />
    </div>
  );
};

interface PreparationViewProps {
    user: User;
    availableClasses: ClassGroup[];
    onSendPreparation: (prep: Omit<LessonPreparation, 'id' | 'timestamp'>) => Promise<void>;
    myPreparations: LessonPreparation[];
}

export const PreparationView: React.FC<PreparationViewProps> = ({ user, availableClasses, onSendPreparation, myPreparations }) => {
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState(availableClasses[0]?.id || '');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [viewingPrep, setViewingPrep] = useState<LessonPreparation | null>(null);
  
  // New State for Text Preparation
  const [prepMode, setPrepMode] = useState<'image' | 'text' | null>(null);
  const [textTitle, setTextTitle] = useState('');
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().split('T')[0]);
  const [lessonVerse, setLessonVerse] = useState('');
  const [lessonElements, setLessonElements] = useState('');
  const [lessonObjectives, setLessonObjectives] = useState('');
  const [illustrationMethod, setIllustrationMethod] = useState('');
  const [training, setTraining] = useState('');
  const [textContent, setTextContent] = useState(''); // Kept for backward compatibility or extra notes if needed, but maybe user wants specific fields now.

  useEffect(() => {
    if (availableClasses.length > 0 && !availableClasses.find(c => c.id === selectedClassId)) {
        setSelectedClassId(availableClasses[0].id);
    }
  }, [availableClasses]);

  const currentClass = useMemo(() => availableClasses.find(c => c.id === selectedClassId), [availableClasses, selectedClassId]);

  const filteredPreparations = useMemo(() => {
    return myPreparations.filter(p => p.classId === selectedClassId);
  }, [myPreparations, selectedClassId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const MAX_DIMENSION = 1200;
          if (width > height) {
            if (width > MAX_DIMENSION) {
              height *= MAX_DIMENSION / width;
              width = MAX_DIMENSION;
            }
          } else {
            if (height > MAX_DIMENSION) {
              width *= MAX_DIMENSION / height;
              height = MAX_DIMENSION;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setImages(prev => [...prev, dataUrl]);
          }
        };
        if (readerEvent.target?.result) {
            img.src = readerEvent.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // --- Enhanced Submission Logic ---
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingSubmissionType, setPendingSubmissionType] = useState<'image' | 'text' | null>(null);

  const handleStartSubmit = (type: 'image' | 'text') => {
    if (type === 'image' && images.length === 0) return;
    if (type === 'text' && !textTitle.trim()) return;
    
    setPendingSubmissionType(type);
    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsConfirmOpen(false);
    setIsSubmitting(true);
    setUploadProgress(0);
    setShowSuccess(false);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 15;
      });
    }, 300);

    const selectedClass = availableClasses.find(c => c.id === selectedClassId);
    const className = selectedClass?.name;

    try {
      if (pendingSubmissionType === 'image') {
        await onSendPreparation({
            servantId: user.id,
            servantName: user.name,
            date: lessonDate,
            imageUrls: images,
            classId: selectedClassId,
            className: className,
            sectorId: selectedClass?.sectorId
        } as any);
        setImages([]);
      } else {
        await onSendPreparation({
            servantId: user.id,
            servantName: user.name,
            date: lessonDate,
            imageUrls: [],
            title: textTitle,
            content: textContent,
            lessonVerse,
            lessonElements,
            lessonObjectives,
            illustrationMethod,
            training,
            classId: selectedClassId,
            className: className,
            sectorId: selectedClass?.sectorId
        } as any);
        
        setTextTitle('');
        setTextContent('');
        setLessonVerse('');
        setLessonElements('');
        setLessonObjectives('');
        setIllustrationMethod('');
        setTraining('');
        setPrepMode(null);
      }
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Short delay to show 100%
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      clearInterval(progressInterval);
    } finally {
      setIsSubmitting(false);
      setPendingSubmissionType(null);
    }
  };

  const ClassSelector = () => {
      if (availableClasses.length <= 1) return null;
      return (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
              {availableClasses.map(cls => (
                  <button
                      key={cls.id}
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                          selectedClassId === cls.id 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                  >
                      <BookOpen size={16} />
                      {cls.name}
                  </button>
              ))}
          </div>
      );
  };

  return (
    <div className="space-y-6">
      <ClassSelector />

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FileText className="text-indigo-600" />
          تحضير الدروس
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {currentClass 
             ? `قم برفع صور التحضير أو كتابة الدرس للفصل: ${currentClass.name}`
             : 'قم برفع صور تحضير الدروس لمتابعة أدائك الخدمي'}
        </p>
      </div>

      {/* Mode Selection Buttons */}
      {!prepMode && (
        <div className="grid grid-cols-2 gap-4">
            <button
                onClick={() => setPrepMode('image')}
                className="p-6 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex flex-col items-center justify-center gap-3 group"
            >
                <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
                    <ImageIcon size={32} />
                </div>
                <span className="font-bold text-lg">رفع صور</span>
            </button>
            <button
                onClick={() => setPrepMode('text')}
                className="p-6 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex flex-col items-center justify-center gap-3 group"
            >
                <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
                    <FileText size={32} />
                </div>
                <span className="font-bold text-lg">كتابة التحضير</span>
            </button>
        </div>
      )}

      {prepMode === 'image' && (
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-6 animate-fade-in relative">
        <button onClick={() => setPrepMode(null)} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={24} />
        </button>
        
        {showSuccess && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-4 rounded-xl flex items-center gap-3 animate-fade-in-up">
            <CheckCircle className="text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-200 font-bold">تم إرسال التحضير بنجاح!</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
              تاريخ شرح الدرس
            </label>
            <div className="relative group">
               <input 
                type="date" 
                value={lessonDate} 
                onChange={(e) => setLessonDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-800 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">رفع الصور</label>
            <label className="w-full flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-all group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="text-gray-400 group-hover:text-indigo-500 mb-2" size={24} />
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">اضغط لاختيار صور التحضير</p>
              </div>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm group">
                <img src={img} alt="prep" className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeImage(idx)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button 
          onClick={() => handleStartSubmit('image')}
          disabled={images.length === 0 || isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
        >
          {isSubmitting ? <RefreshCw className="animate-spin" /> : <Send size={20} />}
          {isSubmitting ? 'جاري الرفع...' : 'إرسال التحضير للمراجعة'}
        </button>
      </div>
      )}
      
      {/* Text Preparation Form (Inline) */}
      {prepMode === 'text' && (
        <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 animate-fade-in relative">
            <button onClick={() => setPrepMode(null)} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-50 dark:bg-slate-700 p-2 rounded-full transition-colors">
                <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <FileText className="text-indigo-600" />
                نموذج تحضير الدرس
            </h3>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم الدرس / الموضوع</label>
                        <input 
                            type="text" 
                            value={textTitle}
                            onChange={(e) => setTextTitle(e.target.value)}
                            placeholder="اكتب عنوان الدرس..."
                            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">تاريخ شرح الدرس</label>
                        <input 
                            type="date" 
                            value={lessonDate} 
                            onChange={(e) => setLessonDate(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">آية الدرس</label>
                    <textarea 
                        value={lessonVerse}
                        onChange={(e) => setLessonVerse(e.target.value)}
                        placeholder="اكتب آية الدرس هنا..."
                        rows={4}
                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">عناصر الدرس</label>
                    <textarea 
                        value={lessonElements}
                        onChange={(e) => setLessonElements(e.target.value)}
                        placeholder="اكتب النقاط الرئيسية للدرس..."
                        rows={4}
                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">أهداف الدرس</label>
                    <textarea 
                        value={lessonObjectives}
                        onChange={(e) => setLessonObjectives(e.target.value)}
                        placeholder="ماذا تريد أن يتعلم المخدوم من هذا الدرس؟"
                        rows={3}
                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">وسيلة الإيضاح</label>
                        <textarea 
                            value={illustrationMethod}
                            onChange={(e) => setIllustrationMethod(e.target.value)}
                            placeholder="مثال: فيديو، قصة، مجسم..."
                            rows={3}
                            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">التدريب / التطبيق</label>
                        <textarea 
                            value={training}
                            onChange={(e) => setTraining(e.target.value)}
                            placeholder="تدريب عملي للأسبوع..."
                            rows={3}
                            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                        />
                    </div>
                </div>
                
                <button 
                    onClick={() => handleStartSubmit('text')}
                    disabled={isSubmitting || !textTitle}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
                >
                    {isSubmitting ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                    إرسال التحضير للمراجعة
                </button>
            </div>
        </div>
      )}

      {/* Past Preparations List with Comments */}
      <div className="space-y-4">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <History size={20} />
              سجل تحضيرات: {currentClass?.name || 'الكل'}
          </h3>
          {filteredPreparations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 border-dashed">
                  لا توجد تحضيرات سابقة لهذا الفصل
              </div>
          ) : (
              <div className="grid gap-4">
                  {filteredPreparations.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(prep => (
                      <div key={prep.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-3">
                              <div>
                                  <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-white">
                                      <Calendar size={16} className="text-indigo-500" />
                                      {prep.date}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-bold">
                                      {prep.title ? prep.title : (prep.className || 'فصل غير محدد')} 
                                      <span className="mx-1">•</span>
                                      {prep.content ? 'نص مكتوب' : `${prep.imageUrls?.length || 0} صور`}
                                  </div>
                              </div>
                              <button 
                                  onClick={() => setViewingPrep(prep)}
                                  className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                              >
                                  <MessageCircle size={14} />
                                  التعليقات ({prep.comments?.length || 0})
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* View Comments Modal (Updated to show content/images) */}
      {viewingPrep && (
        <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewingPrep(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md h-[80vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-700/50">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FileText size={18} className="text-indigo-500" />
                        تفاصيل التحضير
                    </h3>
                    <button onClick={() => setViewingPrep(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {/* Preparation Content */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-gray-800 dark:text-white text-lg border-b border-gray-100 dark:border-slate-700 pb-2">
                            {viewingPrep.title || 'تحضير درس'}
                        </h4>
                        
                        {/* Content removed as requested - showing only comments */}
                    </div>

                    {/* Comments Section */}
                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                        <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <MessageCircle size={18} />
                            التعليقات
                        </h4>
                        {viewingPrep.comments && viewingPrep.comments.length > 0 ? (
                            viewingPrep.comments.map((comment) => (
                                <div key={comment.id} className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-indigo-200 dark:bg-indigo-800 rounded-full flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                                                {comment.authorName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-800 dark:text-white">{comment.authorName}</p>
                                                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                                    {comment.authorRole === UserRole.ADMIN ? 'أمين عام' : comment.authorRole === UserRole.SECTOR_SECRETARY ? 'أمين قطاع' : 'خادم'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(comment.timestamp).toLocaleDateString('ar-EG')}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed px-1">
                                        {comment.text}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-400 text-sm italic py-4">
                                لا توجد تعليقات حتى الآن
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={handleConfirmSubmit} 
        title="تأكيد إرسال التحضير" 
        message="هل أنت متأكد من رغبتك في إرسال هذا التحضير للمراجعة؟ لا يمكن تعديله بعد الإرسال." 
        confirmText="نعم، إرسال"
        isDanger={false}
      />

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-6 animate-bounce-in">
                <div className="relative w-24 h-24 mx-auto">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100 dark:text-slate-700" />
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * uploadProgress) / 100} className="text-indigo-600 transition-all duration-300 ease-out" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{Math.round(uploadProgress)}%</span>
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">جاري إرسال التحضير...</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">يرجى الانتظار قليلاً حتى يتم رفع الملفات وحفظ البيانات.</p>
                </div>
            </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-6 animate-bounce-in">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-100 dark:shadow-none">
                    <CheckCircle size={40} className="animate-bounce-short" />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">تم الإرسال بنجاح!</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">تم استلام تحضيرك بنجاح وسيتم مراجعته من قبل أمين الخدمة.</p>
                </div>
                <button 
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
                >
                    حسناً، شكراً
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

interface OccasionsViewProps {
  availableClasses: ClassGroup[];
  students: Student[];
  occasions: Occasion[];
  payments: Record<string, Record<string, OccasionPayment>>;
  onAddOccasion: (name: string, classId: string) => void;
  onEditOccasion: (id: string, name: string) => void;
  onDeleteOccasion: (id: string) => void;
  currentUserName?: string;
}

export const OccasionsView: React.FC<OccasionsViewProps> = ({ 
    availableClasses, 
    students, 
    occasions, 
    payments, 
    onAddOccasion,
    onEditOccasion,
    onDeleteOccasion,
    currentUserName
}) => {
    const [selectedClassId, setSelectedClassId] = useState(availableClasses[0]?.id || '');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingOccasion, setViewingOccasion] = useState<Occasion | null>(null);
    const [editingOccasion, setEditingOccasion] = useState<Occasion | null>(null);
    const [occasionName, setOccasionName] = useState('');
    const [occasionToDelete, setOccasionToDelete] = useState<Occasion | null>(null);
    const [paymentAction, setPaymentAction] = useState<{ isOpen: boolean; type: 'pay' | 'cancel'; occasionId: string; studentId: string; studentName: string; } | null>(null);

    useEffect(() => {
        if (availableClasses.length > 0 && !availableClasses.find(c => c.id === selectedClassId)) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses]);

    const currentClass = useMemo(() => availableClasses.find(c => c.id === selectedClassId) || availableClasses[0], [availableClasses, selectedClassId]);
    const classStudents = useMemo(() => students.filter(s => s.classId === selectedClassId), [students, selectedClassId]);
    const classOccasions = useMemo(() => occasions.filter(o => o.classId === selectedClassId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [occasions, selectedClassId]);

    const handleOpenAdd = () => { setEditingOccasion(null); setOccasionName(''); setIsModalOpen(true); };
    const handleOpenEdit = (occ: Occasion) => { setEditingOccasion(occ); setOccasionName(occ.name); setIsModalOpen(true); };
    const handleSubmit = () => {
        if (!occasionName.trim()) return;
        if (editingOccasion) onEditOccasion(editingOccasion.id, occasionName.trim());
        else onAddOccasion(occasionName.trim(), selectedClassId);
        setIsModalOpen(false); setOccasionName(''); setEditingOccasion(null);
    };
    const confirmDelete = async () => { if (occasionToDelete) { await onDeleteOccasion(occasionToDelete.id); setOccasionToDelete(null); } };
    const handleTogglePayment = (occasionId: string, studentId: string, studentName: string) => {
        const currentPayment = payments[occasionId]?.[studentId];
        const isPaid = currentPayment?.paid || false;
        setPaymentAction({ isOpen: true, type: isPaid ? 'cancel' : 'pay', occasionId, studentId, studentName });
    };
    const confirmPaymentAction = () => {
        if (paymentAction) {
            const isPaying = paymentAction.type === 'pay';
            const path = `occasion_payments/${paymentAction.occasionId}/${paymentAction.studentId}`;
            addData(path, { paid: isPaying, paymentDate: isPaying ? new Date().toISOString() : null, collectedBy: isPaying ? currentUserName : null });
            setPaymentAction(null);
        }
    };
    const getPaymentStats = (occasionId: string) => {
        let paidCount = 0;
        classStudents.forEach(s => { if (payments[occasionId]?.[s.id]?.paid) paidCount++; });
        return paidCount;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {availableClasses.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
                    {availableClasses.map(cls => (
                        <button key={cls.id} onClick={() => setSelectedClassId(cls.id)} className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${selectedClassId === cls.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                            <BookOpen size={16} /> {cls.name}
                        </button>
                    ))}
                </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div><h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><Gift className="text-pink-500" /> المناسبات والاشتراكات</h2><p className="text-gray-500 dark:text-gray-400 text-sm mt-1">إدارة المناسبات، الرحلات، والاشتراكات</p></div>
                <button onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-sm transition-all"><Plus size={16} /> مناسبة جديدة</button>
            </div>
            {classOccasions.length === 0 ? <div className="p-12 text-center text-gray-400 dark:text-gray-500 italic bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">لا توجد مناسبات مسجلة لهذا الفصل بعد.</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classOccasions.map(occ => {
                        const paidCount = getPaymentStats(occ.id);
                        const progress = classStudents.length > 0 ? (paidCount / classStudents.length) * 100 : 0;
                        return (
                            <div key={occ.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col group overflow-hidden">
                                <div onClick={() => setViewingOccasion(occ)} className="p-6 cursor-pointer flex-1 relative group/card">
                                    <div className="flex justify-between items-start mb-4"><div className="w-12 h-12 bg-pink-50 dark:bg-pink-900/20 text-pink-500 dark:text-pink-400 rounded-xl flex items-center justify-center"><Gift size={24} /></div><span className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full font-bold">{new Date(occ.createdAt).toLocaleDateString('ar-EG')}</span></div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 line-clamp-2 leading-tight">{occ.name}</h3>
                                    <div className="mt-4"><div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1"><span>تم الدفع</span><span>{paidCount} / {classStudents.length}</span></div><div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-pink-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} /></div></div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-slate-900/30 border-t border-gray-100 dark:border-slate-700 flex gap-2 justify-end z-20">
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(occ); }} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"><Edit2 size={16} /> تعديل</button>
                                    <button onClick={(e) => { e.stopPropagation(); setOccasionToDelete(occ); }} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"><Trash2 size={16} /> حذف</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {viewingOccasion && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewingOccasion(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center sticky top-0 z-20"><div><h3 className="text-xl font-black text-gray-800 dark:text-white line-clamp-1">{viewingOccasion.name}</h3><p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-bold">قائمة اشتراكات المخدومين</p></div><button onClick={() => setViewingOccasion(null)} className="bg-gray-100 dark:bg-slate-700 p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"><X size={20} /></button></div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {classStudents.map(student => {
                                const paymentData = payments[viewingOccasion.id]?.[student.id];
                                const isPaid = paymentData?.paid;
                                return (
                                    <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/30 rounded-2xl border border-gray-100 dark:border-slate-700 hover:border-indigo-200 transition-all">
                                        <div className="flex-1"><p className="font-bold text-gray-800 dark:text-white text-lg">{student.name}</p>{isPaid && paymentData && (<div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 mt-1"><CheckCircle size={10} className="text-green-500" /><span>استلم: <span className="text-indigo-600 font-bold">{paymentData.collectedBy}</span></span><span className="opacity-30 mx-1">|</span><span>{new Date(paymentData.paymentDate).toLocaleDateString('ar-EG')}</span></div>)}</div>
                                        <div className="shrink-0 mr-4"><button onClick={() => handleTogglePayment(viewingOccasion.id, student.id, student.name)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm ${isPaid ? 'bg-green-500 text-white shadow-green-200 dark:shadow-none hover:bg-green-600' : 'bg-white dark:bg-slate-600 text-gray-300 dark:text-gray-400 border-2 border-gray-200 dark:border-slate-500 hover:border-indigo-400 hover:text-indigo-400'}`}>{isPaid ? <CheckCircle size={28} className="animate-bounce-short" /> : <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-slate-500" />}</button></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-700/50"><h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">{editingOccasion ? <Edit2 size={18} className="text-blue-500" /> : <Plus size={18} className="text-indigo-500" />}{editingOccasion ? 'تعديل اسم المناسبة' : 'إضافة مناسبة جديدة'}</h3><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button></div>
                        <div className="p-6 space-y-4"><div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">اسم المناسبة</label><input type="text" value={occasionName} onChange={(e) => setOccasionName(e.target.value)} placeholder="مثال: رحلة دير مارمينا..." className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm" autoFocus /></div><button onClick={handleSubmit} disabled={!occasionName.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"><Save size={18} />{editingOccasion ? 'حفظ التعديلات' : 'حفظ المناسبة'}</button></div>
                    </div>
                </div>
            )}
            <ConfirmDialog isOpen={!!occasionToDelete} onClose={() => setOccasionToDelete(null)} onConfirm={confirmDelete} title="حذف مناسبة" message={`هل أنت متأكد من حذف المناسبة "${occasionToDelete?.name}"؟ سيتم حذف جميع سجلات الدفع المرتبطة بها نهائياً.`} />
            <ConfirmDialog isOpen={!!paymentAction} onClose={() => setPaymentAction(null)} onConfirm={confirmPaymentAction} title={paymentAction?.type === 'cancel' ? "إلغاء الدفع" : "تأكيد الدفع"} message={paymentAction?.type === 'cancel' ? `هل أنت متأكد من إلغاء تسجيل الدفع للمخدوم "${paymentAction?.studentName}"؟ سيتم إزالة تاريخ ووقت الاستلام.` : `هل استلمت مبلغ الاشتراك من المخدوم "${paymentAction?.studentName}"؟`} confirmText={paymentAction?.type === 'cancel' ? "نعم، إلغاء الدفع" : "نعم، تم الاستلام"} isDanger={paymentAction?.type === 'cancel'} />
        </div>
    );
};
