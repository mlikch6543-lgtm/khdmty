import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sector, User, Student, UserRole, ServantDailyRecord, ClassGroup, StudentDailyRecord, AppNotification, LessonPreparation } from '../types';
import { ATTENDANCE_CHART_DATA } from '../constants';
import { AttendanceBarChart, SectorPieChart } from './Charts';
import { Users, User as UserIcon, TrendingUp, AlertTriangle, UserCheck, Save, X, Phone, Mail, Key, CheckCircle, XCircle, BookOpen, Calendar, ClipboardList, FileSpreadsheet, FileText, Folder, UserPlus, Bell, BellRing, Activity, Check, ArrowRight, ChevronDown, Layers, Info, MapPin, Clock, Edit2, Trash2, Plus, Eye, EyeOff, Church, Cake, UserMinus, Printer, Search, Gift, LogIn, StickyNote, ImageIcon, Download, ChevronLeft, ChevronRight as ChevronRightIcon, Star, Award, Target, UserPlus2, FolderOpen, MessageCircle, Send, Home } from 'lucide-react';
import { addData, deleteData, updateData } from '../services/firebase';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { downloadOrShareFile } from './downloadHelper';
import { Avatar } from './Avatar';

// --- Shared Components ---

const StatCard = ({ icon: Icon, title, value, subtext, color, trend }: { icon: any, title: string, value: string | number, subtext?: string, color: string, trend?: 'up' | 'down' }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between h-full transition-all hover:shadow-md group">
    <div className="flex justify-between items-start mb-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} text-white shadow-lg shadow-gray-200 dark:shadow-none group-hover:scale-110 transition-transform`}>
        <Icon size={24} />
      </div>
      {trend && (
         <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {trend === 'up' ? '▲ جيد' : '▼ انتبه'}
         </span>
      )}
    </div>
    <div>
      <h4 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">{value}</h4>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children, zIndex = "z-50" }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode, zIndex?: string }) => {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 bg-black/60 ${zIndex} flex items-center justify-center p-4 backdrop-blur-sm`} onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto transition-colors animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
          <button onClick={onClose} type="button" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-100 dark:bg-slate-700 rounded-full p-1 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 text-gray-800 dark:text-gray-200">{children}</div>
      </div>
    </div>
  );
};

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 transition-colors border border-gray-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-full">
             <AlertTriangle size={24} />
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
            className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-200 dark:shadow-none transition-colors"
          >
            تأكيد الحذف
          </button>
        </div>
      </div>
    </div>
  );
};

// --- View Components ---

// ... (DashboardHome and other unchanged components)

// --- Student Details Modal ---
const StudentDetailsModal = ({ student, isOpen, onClose, attendance, classes, sectors }: { student: Student | null, isOpen: boolean, onClose: () => void, attendance: Record<string, any>, classes: ClassGroup[], sectors: Sector[] }) => {
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  if (!student || !isOpen) return null;

  const studentClass = classes.find(c => c.id === student.classId);
  const studentSector = sectors.find(s => s.id === student.sectorId);
  
  // Get attendance history
  const history = Object.values(attendance)
    .filter((r: any) => r.studentId === student.id)
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const toggleDetails = (date: string) => {
      setExpandedRecordId(expandedRecordId === date ? null : date);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ملف المخدوم الشامل" zIndex="z-[60]">
      <div className="space-y-6">
        {/* Header Profile */}
        <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
            <div className="w-20 h-20 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-2xl font-bold text-indigo-700 dark:text-indigo-300 shadow-inner">
                {student.name.charAt(0)}
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{student.name}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-xs font-bold border border-gray-200 dark:border-slate-600 flex items-center gap-1">
                        <Users size={12} className="text-indigo-500" />
                        {studentSector?.name}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-xs font-bold border border-gray-200 dark:border-slate-600 flex items-center gap-1">
                        <BookOpen size={12} className="text-emerald-500" />
                        {studentClass?.name}
                    </span>
                </div>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white dark:bg-slate-700 rounded-xl border border-gray-100 dark:border-slate-600 shadow-sm text-center">
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-1">{student.attendanceRate}%</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">نسبة الحضور العامة</div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-700 rounded-xl border border-gray-100 dark:border-slate-600 shadow-sm text-center">
                <div className="text-lg font-bold text-gray-800 dark:text-white mb-1">
                    {student.lastAttendedDate ? new Date(student.lastAttendedDate).toLocaleDateString('ar-EG') : '-'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">آخر حضور مسجل</div>
            </div>
        </div>

        {/* Personal Info */}
        <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-5 space-y-3 border border-gray-100 dark:border-slate-700">
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
                <Info size={18} className="text-indigo-500" />
                البيانات الشخصية
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <div className="flex items-center gap-3">
                    <Phone size={16} className="text-gray-400" />
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase">رقم الهاتف</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{student.phone || 'غير مسجل'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <MapPin size={16} className="text-gray-400" />
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase">العنوان</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{student.address || 'غير مسجل'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Cake size={16} className="text-gray-400" />
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase">تاريخ الميلاد</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{student.birthDate || 'غير مسجل'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StickyNote size={16} className="text-gray-400" />
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase">ملاحظات</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{student.notes || 'لا توجد ملاحظات'}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Attendance History */}
        <div>
            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
                <Calendar size={18} className="text-indigo-500" />
                سجل الحضور والغياب
            </h3>
            <div className="max-h-60 overflow-y-auto border border-gray-100 dark:border-slate-700 rounded-xl custom-scrollbar">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0 z-10">
                        <tr>
                            <th className="p-3 text-gray-500 font-medium">التاريخ</th>
                            <th className="p-3 text-gray-500 font-medium">الحالة</th>
                            <th className="p-3 text-gray-500 font-medium">التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {history.length > 0 ? history.map((record: any, idx: number) => (
                            <React.Fragment key={idx}>
                                <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="p-3 font-mono text-gray-600 dark:text-gray-300">
                                        {new Date(record.date).toLocaleDateString('ar-EG')}
                                    </td>
                                    <td className="p-3">
                                        {record.present ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full text-xs font-bold">
                                                <CheckCircle size={12} /> حاضر
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full text-xs font-bold">
                                                <XCircle size={12} /> غائب
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <button 
                                            onClick={() => toggleDetails(record.date)}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${expandedRecordId === record.date ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'}`}
                                        >
                                            {expandedRecordId === record.date ? 'إخفاء' : 'عرض التفاصيل'}
                                            <ChevronDown size={12} className={`transition-transform ${expandedRecordId === record.date ? 'rotate-180' : ''}`} />
                                        </button>
                                    </td>
                                </tr>
                                {expandedRecordId === record.date && (
                                    <tr className="bg-indigo-50/50 dark:bg-indigo-900/10 animate-fade-in">
                                        <td colSpan={3} className="p-4">
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                <div className={`p-3 rounded-xl border ${record.attendedMass ? 'bg-white border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                                    <Church size={20} className="mx-auto mb-1" />
                                                    <span className="text-xs font-bold">حضور القداس</span>
                                                    <div className="mt-1">{record.attendedMass ? 'نعم' : 'لا'}</div>
                                                </div>
                                                <div className={`p-3 rounded-xl border ${record.communion ? 'bg-white border-purple-200 text-purple-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                                    <Gift size={20} className="mx-auto mb-1" />
                                                    <span className="text-xs font-bold">التناول</span>
                                                    <div className="mt-1">{record.communion ? 'نعم' : 'لا'}</div>
                                                </div>
                                                <div className={`p-3 rounded-xl border ${record.didVisitation ? 'bg-white border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                                    <Home size={20} className="mx-auto mb-1" />
                                                    <span className="text-xs font-bold">الافتقاد</span>
                                                    <div className="mt-1">{record.didVisitation ? 'تم' : 'لم يتم'}</div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        )) : (
                            <tr>
                                <td colSpan={3} className="p-6 text-center text-gray-400">لا يوجد سجل حضور</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </Modal>
  );
};

interface DashboardProps {
    role: UserRole;
    students: Student[];
    sectors: Sector[];
    notifications: AppNotification[];
    attendance: Record<string, any>;
    classes: ClassGroup[];
    users: User[];
    currentUser?: User | null;
}

export const DashboardHome: React.FC<DashboardProps> = ({ role, students, sectors, notifications, attendance, classes, users, currentUser }) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [expandedSectorId, setExpandedSectorId] = useState<string | null>(null);

  // Initialize selectedClassId for servants
  useEffect(() => {
    if (role === UserRole.SERVANT && classes.length > 0 && !selectedClassId) {
        setSelectedClassId(classes[0].id);
    }
  }, [role, classes, selectedClassId]);

  // --- WEEKLY ATTENDANCE STATS CALCULATION ---
  const weeklyStats = useMemo(() => {
    // 1. Find latest session date for each class
    const classLatestSession: Record<string, { date: string, present: number, total: number, percentage: number }> = {};

    classes.forEach(cls => {
        // Filter attendance for this class
        const classRecords = Object.values(attendance).filter((r: any) => {
             const s = students.find(st => st.id === r.studentId);
             return s && s.classId === cls.id;
        });

        if (classRecords.length === 0) {
            classLatestSession[cls.id] = { date: '', present: 0, total: students.filter(s => s.classId === cls.id).length, percentage: 0 };
            return;
        }

        // Find max date
        const latestDate = classRecords.reduce((max, r) => r.date > max ? r.date : max, '');
        
        // Calculate stats for this date
        const studentsInClass = students.filter(s => s.classId === cls.id);
        const total = studentsInClass.length;
        const present = classRecords.filter((r: any) => r.date === latestDate && r.present).length;

        classLatestSession[cls.id] = { 
            date: latestDate, 
            present, 
            total,
            percentage: total > 0 ? Math.round((present / total) * 100) : 0
        };
    });

    // 2. Aggregate by Sector
    const sectorStats: Record<string, { name: string, present: number, total: number, percentage: number, classes: any[] }> = {};
    let allSectorsPresent = 0;
    let allSectorsTotal = 0;

    sectors.forEach(sec => {
        const secClasses = classes.filter(c => c.sectorId === sec.id);
        let secPresent = 0;
        let secTotal = 0;
        const classBreakdown: any[] = [];

        secClasses.forEach(c => {
            const stats = classLatestSession[c.id];
            if (stats && stats.date) { 
                secPresent += stats.present;
                secTotal += stats.total;
                classBreakdown.push({ 
                    id: c.id, 
                    name: c.name, 
                    ...stats 
                });
            } else {
                 classBreakdown.push({
                     id: c.id,
                     name: c.name,
                     date: null,
                     present: 0,
                     total: students.filter(s => s.classId === c.id).length,
                     percentage: 0
                 });
            }
        });

        sectorStats[sec.id] = {
            name: sec.name,
            present: secPresent,
            total: secTotal,
            percentage: secTotal > 0 ? Math.round((secPresent / secTotal) * 100) : 0,
            classes: classBreakdown
        };

        allSectorsPresent += secPresent;
        allSectorsTotal += secTotal;
    });

    const overallPercentage = allSectorsTotal > 0 ? Math.round((allSectorsPresent / allSectorsTotal) * 100) : 0;

    return { classLatestSession, sectorStats, overallPercentage, allSectorsPresent, allSectorsTotal };
  }, [attendance, classes, students, sectors]);

  const actualAttendanceValue = useMemo(() => {
    if (role === UserRole.SERVANT) {
        if (selectedClassId) {
             return weeklyStats.classLatestSession[selectedClassId]?.present || 0;
        }
        return classes.reduce((sum, c) => sum + (weeklyStats.classLatestSession[c.id]?.present || 0), 0);
    }
    if (role === UserRole.SECTOR_SECRETARY && currentUser?.sectorId) {
        return weeklyStats.sectorStats[currentUser.sectorId]?.present || 0;
    }
    return weeklyStats.allSectorsPresent;
  }, [role, selectedClassId, currentUser, weeklyStats, classes]);

  const summaryPercentage = useMemo(() => {
      if (role === UserRole.SERVANT) {
          if (selectedClassId) {
              return weeklyStats.classLatestSession[selectedClassId]?.percentage || 0;
          }
          // Aggregate for all visible classes
          let totalPresent = 0;
          let totalStudentsCount = 0;
          classes.forEach(c => {
              const stats = weeklyStats.classLatestSession[c.id];
              if (stats) {
                  totalPresent += stats.present;
                  totalStudentsCount += stats.total;
              }
          });
          return totalStudentsCount > 0 ? Math.round((totalPresent / totalStudentsCount) * 100) : 0;
      }
      if (role === UserRole.SECTOR_SECRETARY && currentUser?.sectorId) {
          return weeklyStats.sectorStats[currentUser.sectorId]?.percentage || 0;
      }
      return weeklyStats.overallPercentage;
  }, [role, currentUser, weeklyStats, selectedClassId, classes]);

  const filteredStudents = useMemo(() => {
      if (role === UserRole.SERVANT && selectedClassId) {
          return students.filter(s => s.classId === selectedClassId);
      }
      return students;
  }, [students, role, selectedClassId]);

  // Real-time clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- REAL-TIME DATA CALCULATION ---
  const { realStats, realChartData } = useMemo(() => {
    // 1. Identify Sessions per Class & Student Presence
    const classSessions: Record<string, Set<string>> = {}; // classId -> Set<DateString>
    const studentPresence: Record<string, Set<string>> = {}; // studentId -> Set<DateString>
    
    // Iterate attendance to find actual sessions and presence
    Object.values(attendance).forEach((record: any) => {
        if (!record.studentId || !record.date) return;
        
        // Only consider students in the current scope (filtered by props)
        const student = filteredStudents.find(s => s.id === record.studentId);
        if (!student) return;

        // Register session for this class (if any record exists for this date, it was a session)
        if (!classSessions[student.classId]) classSessions[student.classId] = new Set();
        classSessions[student.classId].add(record.date);

        // Register presence
        if (record.present) {
            if (!studentPresence[student.id]) studentPresence[student.id] = new Set();
            studentPresence[student.id].add(record.date);
        }
    });

    // 2. Calculate Student Stats (Average Attendance Rate)
    const atRisk: Student[] = [];
    let totalPresentAll = 0;
    let totalSessionsAll = 0;

    const studentsWithRealRate = filteredStudents.map(student => {
        const sessions = classSessions[student.classId] ? Array.from(classSessions[student.classId]) : [];
        const presentCount = studentPresence[student.id] ? studentPresence[student.id].size : 0;
        
        totalPresentAll += presentCount;
        totalSessionsAll += sessions.length;

        // Calculate rate based on ACTUAL sessions for this student's class
        const rate = sessions.length > 0 ? Math.round((presentCount / sessions.length) * 100) : 0;
        
        // Check consecutive absence (last 2 sessions of THIS class)
        const sortedSessions = sessions.sort().reverse(); // Newest first
        if (sortedSessions.length >= 2) {
            const last1 = sortedSessions[0];
            const last2 = sortedSessions[1];
            const attendedLast1 = studentPresence[student.id]?.has(last1);
            const attendedLast2 = studentPresence[student.id]?.has(last2);
            
            // If student missed both last sessions
            if (!attendedLast1 && !attendedLast2) {
                atRisk.push({ ...student, attendanceRate: rate });
            }
        }

        return { ...student, attendanceRate: rate };
    });

    // Calculate Overall Average Rate (Total Present / Total Opportunities)
    const avgRate = totalSessionsAll > 0 ? Math.round((totalPresentAll / totalSessionsAll) * 100) : 0;

    // Sort atRisk by attendance rate (lowest first)
    atRisk.sort((a, b) => a.attendanceRate - b.attendanceRate);

    // 3. Prepare Chart Data (Last 5 Service Days)
    // We aggregate stats by Date across all visible classes
    const dailyStats: Record<string, { present: number, targetTotal: number }> = {};
    const allDates = new Set<string>();

    // Collect all unique dates from all classes
    Object.values(classSessions).forEach(dates => {
        dates.forEach(d => allDates.add(d));
    });

    const sortedDates = Array.from(allDates).sort(); // Ascending

    sortedDates.forEach(date => {
        let present = 0;
        let targetTotal = 0;

        // Find which classes had a session on this specific date
        const activeClasses = Object.keys(classSessions).filter(cId => classSessions[cId].has(date));
        
        // Calculate stats for this date
        activeClasses.forEach(cId => {
            const classStudents = filteredStudents.filter(s => s.classId === cId);
            targetTotal += classStudents.length;
            
            classStudents.forEach(s => {
                if (studentPresence[s.id]?.has(date)) {
                    present++;
                }
            });
        });

        dailyStats[date] = { present, targetTotal };
    });

    // Take last 5 dates
    const last5Dates = sortedDates.slice(-5);
    
    const chartData = last5Dates.map(date => ({
        name: new Date(date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
        present: dailyStats[date].present,
        absent: dailyStats[date].targetTotal - dailyStats[date].present
    }));

    if (chartData.length === 0) {
        chartData.push({ name: 'لا توجد بيانات', present: 0, absent: 0 });
    }

    return { 
        realStats: { avgRate, atRisk, studentsWithRealRate }, 
        realChartData: chartData 
    };

  }, [attendance, filteredStudents]);

  const totalStudents = filteredStudents.length;
  const totalServants = users.filter(u => u.role !== UserRole.ADMIN).length;
  const totalSectors = sectors.length;
  const totalClasses = classes.length;
  
  const atRiskStudents = realStats.atRisk;
  
  // Group At-Risk by Sector or Class
  const atRiskGroups = useMemo(() => {
      const grouped: Record<string, Student[]> = {};
      atRiskStudents.forEach(s => {
          const key = role === UserRole.SERVANT ? s.classId : s.sectorId;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(s);
      });
      return grouped;
  }, [atRiskStudents, role]);

  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const sectorData = useMemo(() => {
    return sectors.map(sector => {
      const count = filteredStudents.filter(s => s.sectorId === sector.id).length;
      return { name: sector.name, value: count };
    }).filter(d => d.value > 0);
  }, [sectors, filteredStudents]);

  const birthdayStudents = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    return filteredStudents.filter(s => {
      if (!s.birthDate) return false;
      const bMonth = parseInt(s.birthDate.split('-')[1]);
      return bMonth === currentMonth;
    }).slice(0, 10);
  }, [filteredStudents]);

  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    // Use studentsWithRealRate to show accurate rate in search
    return realStats.studentsWithRealRate.filter(s => s.name.includes(globalSearch.trim())).slice(0, 5);
  }, [realStats.studentsWithRealRate, globalSearch]);

  const formatTime = (isoString: string) => {
      const date = new Date(isoString);
      return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
  };

  const recentActivities = notifications
    .slice(0, 20);

  const getNotifIcon = (type: string) => {
    switch(type) {
      case 'user_signup': return <UserPlus size={16} className="text-green-500" />;
      case 'user_login': return <LogIn size={16} className="text-blue-500" />;
      case 'attendance_saved': return <CheckCircle size={16} className="text-emerald-500" />;
      default: return <BellRing size={16} className="text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
             <Activity className="text-indigo-600" />
             {role === UserRole.ADMIN ? 'مركز المتابعة' : 'لوحة المعلومات'}
          </h2>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-1 font-medium">
             <Calendar size={14} className="text-indigo-400" />
             <span>{currentDateTime.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
             <span className="mx-1">•</span>
             <Clock size={14} className="text-indigo-400" />
             <span className="font-mono">{currentDateTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>

        {role === UserRole.ADMIN && (
            <div className="flex items-center gap-3 self-end md:self-auto">
                <div className="relative">
                    <button 
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        className="p-3 bg-gray-50 dark:bg-slate-700 rounded-full text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-all relative"
                    >
                        <Bell size={22} />
                        {notifications.length > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
                        )}
                    </button>

                    {isNotifOpen && (
                        <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)}></div>
                        <div className="absolute left-0 mt-3 w-80 md:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden animate-slide-down">
                            <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <BellRing size={16} className="text-indigo-500" />
                                    أحدث النشاطات
                                </h3>
                            </div>
                            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-700">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                                        لا توجد نشاطات مسجلة
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div key={notif.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors group">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                  {getNotifIcon(notif.type)}
                                                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">{notif.title}</h4>
                                                </div>
                                                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{formatTime(notif.timestamp)}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pr-6">{notif.message}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        </>
                    )}
                </div>
            </div>
        )}
      </div>
      
      {/* Search Section */}
      <div className="space-y-4">
        <div className="w-full bg-indigo-600 p-8 rounded-3xl shadow-xl shadow-indigo-100 dark:shadow-none flex flex-col md:flex-row items-center gap-6">
            <div className="shrink-0 text-white">
                <h3 className="text-xl font-bold mb-1">البحث السريع</h3>
                <p className="text-indigo-100 text-xs">ابحث عن أي مخدوم بالاسم في ثوانٍ</p>
            </div>
            <div className="flex-1 w-full">
                <div className="relative group">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={24} />
                    <input 
                        type="text"
                        placeholder="اكتب اسم المخدوم هنا..."
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        className="w-full pr-14 pl-6 py-4 bg-white dark:bg-slate-900 border-none rounded-2xl shadow-inner focus:ring-4 focus:ring-yellow-400 outline-none transition-all text-lg font-bold"
                    />
                </div>
            </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden animate-fade-in transition-all">
                <div className="p-4 border-b border-gray-50 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-6">نتائج البحث في قاعدة البيانات</div>
                <div className="divide-y divide-gray-50 dark:divide-slate-700">
                    {searchResults.map(s => (
                        <div key={s.id} onClick={() => setSelectedStudent(s)} className="p-5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer group">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-gray-100 text-lg group-hover:text-indigo-600 transition-colors">{s.name}</p>
                                    <div className="flex gap-3 mt-1.5">
                                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full font-medium">{sectors.find(sec => sec.id === s.sectorId)?.name}</span>
                                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full font-medium">{classes.find(c => c.id === s.classId)?.name}</span>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{s.attendanceRate}%</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase">نسبة الحضور</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-700/30 text-center">
                    <button 
                        onClick={() => setGlobalSearch('')}
                        className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                        <X size={14} /> إغلاق النتائج
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Class Switcher for Servants */}
      {role === UserRole.SERVANT && classes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
            {classes.map(cls => (
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
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            icon={Users} 
            title="إجمالي المخدومين" 
            value={totalStudents} 
            color="bg-blue-500" 
            subtext={role === UserRole.ADMIN ? "في جميع القطاعات" : role === UserRole.SECTOR_SECRETARY ? "في هذا القطاع" : "في فصولي"}
        />
        {role !== UserRole.SERVANT && (
            <StatCard 
                icon={UserCheck} 
                title="إجمالي الخدام" 
                value={totalServants} 
                color="bg-green-500" 
                subtext={role === UserRole.SERVANT ? "زملاء الخدمة" : "خادم وأمين قطاع"}
            />
        )}
        <StatCard 
            icon={AlertTriangle} 
            title="يحتاجون افتقاد" 
            value={atRiskStudents.length} 
            color="bg-red-500" 
            subtext="غياب جمعتين متتاليتين"
            trend={atRiskStudents.length > 5 ? 'down' : 'up'}
        />
        <StatCard 
            icon={TrendingUp} 
            title="الحضور الفعلي (آخر اجتماع)" 
            value={`${actualAttendanceValue} (%${summaryPercentage})`} 
            color="bg-orange-500" 
            subtext="بناءً على السجلات الفعلية"
        />
      </div>

      {/* Weekly Attendance Stats Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-8 animate-fade-in">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6">
            <TrendingUp className="text-emerald-500" />
            متوسط الحضور الأسبوعي (آخر اجتماع)
        </h3>

        {/* Admin & Sector Secretary View */}
        {role !== UserRole.SERVANT && (
            <div className="space-y-4">
                {/* Overall Summary */}
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                    <div>
                        <h4 className="text-emerald-800 dark:text-emerald-200 font-bold text-lg">نسبة الحضور العامة</h4>
                        <p className="text-emerald-600 dark:text-emerald-400 text-xs">لكل القطاعات والفصول الظاهرة</p>
                    </div>
                    <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{summaryPercentage}%</div>
                </div>

                {/* Sectors List */}
                <div className="grid gap-3">
                    {sectors
                    .filter(sector => {
                        if (role === UserRole.SECTOR_SECRETARY) return sector.id === currentUser?.sectorId;
                        return true;
                    })
                    .map(sector => {
                        const stats = weeklyStats.sectorStats[sector.id];
                        if (!stats) return null;
                        const isExpanded = expandedSectorId === sector.id;
                        
                        return (
                            <div key={sector.id} className="border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden transition-all">
                                <div 
                                    onClick={() => setExpandedSectorId(isExpanded ? null : sector.id)}
                                    className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-gray-50 dark:bg-slate-700/30 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isExpanded ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-600 text-gray-500 dark:text-gray-300'}`}>
                                            <Layers size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800 dark:text-white">{sector.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{stats.classes.length} فصول</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={`text-xl font-black ${stats.percentage >= 75 ? 'text-green-600' : stats.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                            {stats.percentage}%
                                        </div>
                                        <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <div className="p-4 bg-white dark:bg-slate-800 space-y-2 animate-fade-in border-t border-gray-100 dark:border-slate-700">
                                        {stats.classes.length > 0 ? stats.classes.map((cls: any) => (
                                            <div key={cls.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-slate-700/30 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <BookOpen size={16} className="text-gray-400" />
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-700 dark:text-gray-200">{cls.name}</div>
                                                        <div className="text-[10px] text-gray-400">
                                                            {cls.date ? `آخر رصد: ${new Date(cls.date).toLocaleDateString('ar-EG')}` : 'لا يوجد رصد'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                        {cls.present} / {cls.total}
                                                    </div>
                                                    <div className={`text-lg font-bold ${cls.percentage >= 75 ? 'text-green-600' : cls.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                        {cls.percentage}%
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-center text-gray-400 text-sm py-2">لا توجد فصول مسجلة في هذا القطاع</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* Servant View */}
        {role === UserRole.SERVANT && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map(cls => {
                    const stats = weeklyStats.classLatestSession[cls.id];
                    if (!stats) return null;

                    return (
                        <div key={cls.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <BookOpen size={18} className="text-indigo-500" />
                                    <h4 className="font-bold text-gray-800 dark:text-white">{cls.name}</h4>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {stats.date ? `آخر رصد: ${new Date(stats.date).toLocaleDateString('ar-EG')}` : 'لا يوجد رصد'}
                                </p>
                            </div>
                            <div className="text-center">
                                <div className={`text-2xl font-black ${stats.percentage >= 75 ? 'text-green-600' : stats.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {stats.percentage}%
                                </div>
                                <div className="text-[10px] text-gray-400 font-bold">نسبة الحضور</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            {/* Birthdays */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6">
                    <Cake size={22} className="text-pink-500 animate-bounce" />
                    أعياد ميلاد هذا الشهر
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {birthdayStudents.length > 0 ? (
                    birthdayStudents.map(s => (
                      <div key={s.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/30 rounded-2xl border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full flex items-center justify-center font-bold">
                          {s.birthDate?.split('-')[2]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{s.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{sectors.find(sec => sec.id === s.sectorId)?.name}</p>
                        </div>
                        <Gift size={20} className="mr-auto text-pink-300 opacity-50" />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center text-gray-400 italic">لا توجد أعياد ميلاد مسجلة هذا الشهر</div>
                  )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Activity size={20} className="text-indigo-500" />
                        مؤشر الحضور الأسبوعي (آخر 5 أسابيع)
                    </h3>
                </div>
                <div className="w-full">
                    <AttendanceBarChart data={realChartData} />
                </div>
            </div>

            {role !== UserRole.SERVANT && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                    <Clock size={20} className="text-indigo-500" />
                    آخر عمليات تسجيل الحضور
                </h3>
                <div className="space-y-4">
                    {recentActivities.length > 0 ? (
                        recentActivities.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700">
                                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600 dark:text-green-400 mt-1">
                                    <CheckCircle size={18} />
                                </div>
                                <div>
                                    <p className="text-gray-800 dark:text-gray-200 font-bold text-sm">{activity.title}</p>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{activity.message}</p>
                                    <p className="text-indigo-400 text-[10px] mt-2 font-mono">{formatTime(activity.timestamp)}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-400">لا توجد نشاطات حديثة</div>
                    )}
                </div>
            </div>
            )}
        </div>

        <div className="space-y-6">
            {role !== UserRole.SERVANT && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">توزيع الطلاب</h3>
                {sectorData.length > 0 ? (
                    <SectorPieChart data={sectorData} />
                ) : (
                    <div className="h-48 flex items-center justify-center text-gray-400 text-sm">لا توجد بيانات كافية</div>
                )}
            </div>
            )}

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle size={20} />
                        تنبيهات الافتقاد
                    </h3>
                    <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-2 py-1 rounded-full font-bold">
                        {atRiskStudents.length} حالة
                    </span>
                </div>
                <div className="max-h-[400px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                    {atRiskStudents.length > 0 ? (
                        Object.entries(atRiskGroups).map(([groupId, students]) => {
                            const groupName = role === UserRole.SERVANT 
                                ? (classes.find(c => c.id === groupId)?.name || 'فصل غير معروف')
                                : (sectors.find(s => s.id === groupId)?.name || 'قطاع غير معروف');
                            
                            const isExpanded = expandedGroupId === groupId;
                            
                            return (
                                <div key={groupId} className="border border-red-100 dark:border-red-900/30 rounded-xl overflow-hidden">
                                    <button 
                                        onClick={() => setExpandedGroupId(isExpanded ? null : groupId)}
                                        className={`w-full flex items-center justify-between p-3 transition-colors ${isExpanded ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="bg-red-100 dark:bg-red-900/40 p-1.5 rounded-lg text-red-600 dark:text-red-400">
                                                <AlertTriangle size={16} />
                                            </div>
                                            <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{groupName}</span>
                                            <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded-full font-bold">
                                                {students.length}
                                            </span>
                                        </div>
                                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {isExpanded && (
                                        <div className="divide-y divide-gray-100 dark:divide-slate-700 bg-gray-50/50 dark:bg-slate-900/20">
                                            {students.map(student => {
                                                const studentClass = classes.find(c => c.id === student.classId);
                                                return (
                                                    <div key={student.id} onClick={() => setSelectedStudent(student)} className="p-3 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors cursor-pointer group">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm group-hover:text-indigo-600 transition-colors">{student.name}</p>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{studentClass?.name || 'فصل غير محدد'}</p>
                                                                {student.phone && (
                                                                    <a href={`tel:${student.phone}`} onClick={e => e.stopPropagation()} className="text-[10px] text-blue-500 flex items-center gap-1 mt-1 hover:underline w-fit">
                                                                        <Phone size={10} /> {student.phone}
                                                                    </a>
                                                                )}
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-xl font-bold text-red-500">{student.attendanceRate}%</div>
                                                                <div className="text-[9px] text-gray-400">نسبة الحضور</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8">
                            <CheckCircle size={40} className="text-green-500 mx-auto mb-2 opacity-50" />
                            <p className="text-gray-500 text-sm">ممتاز! لا يوجد طلاب متغيبين لأسبوعين متتاليين.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      <StudentDetailsModal 
        student={selectedStudent} 
        isOpen={!!selectedStudent} 
        onClose={() => setSelectedStudent(null)} 
        attendance={attendance}
        classes={classes}
        sectors={sectors}
      />
    </div>
  );
};

// ... (UserManagement, SectorManagement, ClassManagement unchanged)
interface UserManagementProps {
  users: User[];
  sectors: Sector[]; 
  onAddUser: (user: Omit<User, 'id' | 'avatarUrl'>) => void;
  onEditUser: (id: string, user: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, sectors, onAddUser, onEditUser, onDeleteUser }) => {
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(u => 
      u.name.toLowerCase().includes(query) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.phone && u.phone.includes(query)) ||
      (u.role === UserRole.ADMIN && 'أمين عام'.includes(query)) ||
      (u.role === UserRole.SECTOR_SECRETARY && 'أمين قطاع'.includes(query)) ||
      (u.role === UserRole.SERVANT && 'خادم'.includes(query))
    );
  }, [users, searchQuery]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: UserRole.SERVANT
  });

  const togglePassword = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', phone: '', password: '', role: UserRole.SERVANT });
    setShowModalPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email || '',
      phone: user.phone || '',
      password: user.password || '',
      role: user.role
    });
    setShowModalPassword(false);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteUserId(id);
  };

  const handleSubmit = () => {
    const userPayload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role: formData.role
    };

    if (editingUser) {
      onEditUser(editingUser.id, userPayload);
    } else {
      onAddUser(userPayload);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">إدارة المستخدمين</h2>
        <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="بحث عن مستخدم..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-4 pr-10 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            </div>
            <button type="button" onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow shrink-0">
            <Plus size={16} />
            إضافة مستخدم
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold">الاسم</th>
                <th className="px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold">بيانات الاتصال</th>
                <th className="px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold">كلمة المرور</th>
                <th className="px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold">الدور</th>
                <th className="px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.avatarUrl} name={user.name} className="w-8 h-8 rounded-full bg-gray-200" />
                      <span className="font-bold text-gray-800 dark:text-gray-200">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                    {user.email && <div className="flex items-center gap-1"><Mail size={12}/> {user.email}</div>}
                    {user.phone && <div className="flex items-center gap-1"><Phone size={12}/> {user.phone}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-gray-100 dark:bg-slate-700 dark:text-gray-300 px-2 py-1 rounded text-xs w-24 block truncate text-center">
                        {visiblePasswords[user.id] ? user.password : '••••••••'}
                      </span>
                      <button type="button" onClick={(e) => togglePassword(user.id, e)} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        {visiblePasswords[user.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                      user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' :
                      user.role === UserRole.SECTOR_SECRETARY ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                      'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                    }`}>
                      {user.role === UserRole.ADMIN ? 'أمين عام' : user.role === UserRole.SECTOR_SECRETARY ? 'أمين قطاع' : 'خادم'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button type="button" onClick={(e) => handleOpenEdit(user, e)} className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded transition-all"><Edit2 size={16} /></button>
                    <button type="button" onClick={(e) => handleDeleteClick(user.id, e)} className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded transition-all"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={!!deleteUserId}
        onClose={() => setDeleteUserId(null)}
        onConfirm={() => deleteUserId && onDeleteUser(deleteUserId)}
        title="حذف مستخدم"
        message="هل أنت متأكد تماماً من حذف هذا المستخدم؟ سيتم فقدان حساب الدخول وجميع الصلاحيات المرتبطة به. لا يمكن التراجع عن هذا الإجراء."
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingUser ? "تعديل مستخدم" : "إضافة مستخدم جديد"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم بالكامل</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="الاسم الثلاثي"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="user@example.com"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم الهاتف</label>
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="01xxxxxxxxx"
                />
             </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">كلمة المرور</label>
            <div className="relative">
               <Key className="absolute right-3 top-2.5 text-gray-400" size={16} />
               <input 
                 type={showModalPassword ? "text" : "password"} 
                 value={formData.password}
                 onChange={e => setFormData({...formData, password: e.target.value})}
                 className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 pr-10 pl-10 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                 placeholder="كلمة مرور قوية"
               />
               <button
                  type="button"
                  onClick={() => setShowModalPassword(!showModalPassword)}
                  className="absolute left-3 top-2.5 text-gray-400 hover:text-indigo-600 focus:outline-none transition-colors"
               >
                  {showModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
               </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الدور</label>
            <select 
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
              className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            >
              <option value={UserRole.SERVANT}>خادم</option>
              <option value={UserRole.SECTOR_SECRETARY}>أمين قطاع</option>
              <option value={UserRole.ADMIN}>أمين عام (مسؤول)</option>
            </select>
          </div>
          <button 
            type="button"
            onClick={handleSubmit} 
            disabled={!formData.name || !formData.password}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 mt-4 shadow-lg transition-all"
          >
            حفظ البيانات
          </button>
        </div>
      </Modal>
    </div>
  );
};

interface SectorManagementProps {
  sectors: Sector[];
  users: User[];
  attendance: Record<string, any>;
  onAddSector: (name: string, secretaryIds: string[]) => void;
  onEditSector: (id: string, name: string, secretaryIds: string[]) => void;
  onDeleteSector: (id: string) => void;
  onAssignServantToSector: (servantId: string, sectorId: string, action: 'add' | 'remove') => void;
}

export const SectorManagement: React.FC<SectorManagementProps> = ({ 
  sectors, users, attendance, onAddSector, onEditSector, onDeleteSector, onAssignServantToSector
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [deleteSectorId, setDeleteSectorId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', secretaryIds: [] as string[] });

  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [servantToAdd, setServantToAdd] = useState('');
  const [servantToRemove, setServantToRemove] = useState<User | null>(null);

  // New state for viewing notes
  const [viewingNoteData, setViewingNoteData] = useState<{name: string, note: string} | null>(null);

  const availableSecretaries = useMemo(() => {
    return users.filter(u => u.role === UserRole.SECTOR_SECRETARY);
  }, [users]);

  const handleOpenAdd = () => {
    setEditingSector(null);
    setFormData({ name: '', secretaryIds: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sector: Sector, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSector(sector);
    const existingIds = sector.secretaryIds || (sector.secretaryId ? [sector.secretaryId] : []);
    setFormData({ name: sector.name, secretaryIds: existingIds });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (editingSector) {
      onEditSector(editingSector.id, formData.name, formData.secretaryIds);
    } else {
      onAddSector(formData.name, formData.secretaryIds);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteSectorId(id);
  };

  const renderAttendanceIcon = (status: boolean) => {
    return status ? <CheckCircle className="text-green-600 inline" size={18} /> : <span className="text-gray-300 dark:text-gray-600 font-bold">-</span>;
  };

  const sectorServants = useMemo(() => {
    if (!selectedSectorId) return [];
    return users.filter(u => u.role === UserRole.SERVANT && (u.sectorIds?.includes(selectedSectorId) || u.sectorId === selectedSectorId));
  }, [selectedSectorId, users]);

  const availableServants = useMemo(() => {
     if (!selectedSectorId) return [];
     return users.filter(u => u.role === UserRole.SERVANT && !u.sectorIds?.includes(selectedSectorId) && u.sectorId !== selectedSectorId);
  }, [selectedSectorId, users]);

  const handleAddServantToSector = () => {
    if (!selectedSectorId || !servantToAdd) return;
    onAssignServantToSector(servantToAdd, selectedSectorId, 'add');
    setServantToAdd('');
  };

  const handleRemoveServantFromSector = () => {
    if (servantToRemove && selectedSectorId) {
      onAssignServantToSector(servantToRemove.id, selectedSectorId, 'remove');
      setServantToRemove(null);
    }
  };

    const handleExportExcel = async () => {
    const data = sectorServants.map(servant => {
        const recordId = `${viewDate}_${servant.id}_${selectedSectorId}`;
        const record = attendance[recordId] || {};
        return {
            "اسم الخادم": servant.name,
            "حضور": record.present ? "نعم" : "-",
            "غياب": record.absent ? "نعم" : "-",
            "قداس": record.attendedMass ? "نعم" : "-",
            "تحضير": record.preparedLesson ? "نعم" : "-",
            "افتقاد": record.didVisitation ? "نعم" : "-"
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    await downloadOrShareFile(blob, `سجل_الخدام_${viewDate}.xlsx`);
  };

  const handleExportPDF = async () => {
     const element = document.getElementById('servant-attendance-printable');
     if(!element) return;

     try {
        // Use imported jsPDF
        const canvas = await html2canvas(element, { 
            scale: 2,
            useCORS: true, 
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 1200 
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = imgHeight;
        let position = 0; // Position in the source image
        
        // First Page
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
        position += pdfHeight;

        // Subsequent Pages
        while (heightLeft > 0) {
          pdf.addPage();
          const topMargin = 20; // 20mm margin for better spacing
          // Shift image up by 'position', down by 'topMargin'
          pdf.addImage(imgData, 'PNG', 0, -position + topMargin, pdfWidth, imgHeight);
          
          // Mask the top margin area to prevent repetition of content from previous page
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pdfWidth, topMargin, 'F');
          
          const contentOnPage = pdfHeight - topMargin;
          heightLeft -= contentOnPage;
          position += contentOnPage;
        }
        
        const pdfBlob = pdf.output('blob');
        await downloadOrShareFile(pdfBlob, `سجل_حضور_الخدام_${viewDate}.pdf`);
     } catch (err) {
         console.error("PDF Export Error:", err);
         alert("حدث خطأ أثناء تصدير الملف. يرجى المحاولة مرة أخرى.");
     }
  };

  const renderPrintIcon = (status: boolean, isAbsent = false) => status ? (
    <div className="flex items-center justify-center h-full w-full">
        <div className="flex items-center justify-center font-black text-2xl text-black">{isAbsent ? 'X' : '✓'}</div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">إدارة القطاعات</h2>
        <button type="button" onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow transition-all">
          <Plus size={16} />
          إضافة قطاع
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden overflow-x-auto">
        <table className="w-full text-right min-w-[600px]">
          <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold">اسم القطاع</th>
              <th className="px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold">أمناء القطاع</th>
              <th className="px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold">التفاصيل</th>
              <th className="px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {sectors.map((sector) => {
              const assignedIds = sector.secretaryIds || (sector.secretaryId ? [sector.secretaryId] : []);
              const secretaryNames = users
                .filter(u => assignedIds.includes(u.id))
                .map(u => u.name)
                .join('، ');

              return (
                <tr key={sector.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">{sector.name}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                    {secretaryNames || <span className="text-gray-300 italic">غير معين</span>}
                  </td>
                  <td className="px-6 py-4">
                     <button 
                        onClick={() => setSelectedSectorId(sector.id)}
                        className="text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
                     >
                        <ClipboardList size={16} />
                        سجل الحضور
                     </button>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button type="button" onClick={(e) => handleOpenEdit(sector, e)} className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded transition-all"><Edit2 size={16} /></button>
                    <button type="button" onClick={(e) => handleDeleteClick(sector.id, e)} className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded transition-all"><Trash2 size={16} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog 
        isOpen={!!deleteSectorId}
        onClose={() => setDeleteSectorId(null)}
        onConfirm={() => deleteSectorId && onDeleteSector(deleteSectorId)}
        title="حذف قطاع"
        message="هل أنت متأكد من حذف هذا القطاع؟ سيتم حذف جميع الفصول المرتبطة به تلقائياً."
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingSector ? "تعديل القطاع" : "إضافة قطاع جديد"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم القطاع</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تعيين أمناء القطاع</label>
            <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700 shadow-inner">
                {availableSecretaries.length > 0 ? availableSecretaries.map(user => (
                    <label key={user.id} className="flex items-center gap-3 cursor-pointer group p-1 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors">
                        <input 
                            type="checkbox"
                            checked={formData.secretaryIds.includes(user.id)}
                            onChange={(e) => {
                                const ids = e.target.checked 
                                    ? [...formData.secretaryIds, user.id]
                                    : formData.secretaryIds.filter(id => id !== user.id);
                                setFormData({...formData, secretaryIds: ids});
                            }}
                            className="w-4 h-4 accent-indigo-600 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 transition-colors font-medium">{user.name}</span>
                    </label>
                )) : <div className="text-gray-400 text-sm text-center py-2">لا يوجد أمناء قطاع متاحين</div>}
            </div>
          </div>
          <button 
            type="button"
            onClick={handleSubmit} 
            disabled={!formData.name}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg disabled:opacity-50 mt-4 shadow-lg transition-all"
          >
            حفظ
          </button>
        </div>
      </Modal>

      {selectedSectorId && (
         <Modal 
            isOpen={!!selectedSectorId}
            onClose={() => setSelectedSectorId(null)}
            title="سجل حضور ومتابعة الخدام"
         >
             <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-slate-700/30 p-4 rounded-lg border border-gray-200 dark:border-slate-600">
                   <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
                     <UserPlus size={16} />
                     إضافة خادم إلى هذا القطاع
                   </h4>
                   <div className="flex gap-2">
                      <select 
                         value={servantToAdd}
                         onChange={(e) => setServantToAdd(e.target.value)}
                         className="flex-1 bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                      >
                         <option value="">اختر خادم للإضافة...</option>
                         {availableServants.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.email || s.phone})</option>
                         ))}
                      </select>
                      <button 
                        onClick={handleAddServantToSector}
                        disabled={!servantToAdd}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-all shadow"
                      >
                        إضافة
                      </button>
                   </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
                        <Calendar size={20} />
                        <span className="font-bold">تاريخ السجل:</span>
                        <input 
                            type="date" 
                            value={viewDate}
                            onChange={(e) => setViewDate(e.target.value)}
                            className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-indigo-200 dark:border-slate-600 rounded-lg px-3 py-1 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                    
                    <div className="flex gap-2">
                         <button onClick={handleExportExcel} className="bg-green-600 text-white hover:bg-green-700 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 shadow transition-all"><FileSpreadsheet size={16} /> Excel تصدير</button>
                         <button onClick={handleExportPDF} className="bg-red-600 text-white hover:bg-red-700 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 shadow transition-all"><Printer size={16} /> PDF تصدير</button>
                    </div>
                </div>

                 <div className="overflow-x-auto border border-gray-200 dark:border-slate-600 rounded-lg" id="attendance-table-export">
                    <table className="w-full text-right text-sm bg-white dark:bg-slate-800 min-w-[800px]">
                        <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-700 dark:text-gray-300 font-bold border-b dark:border-slate-600">
                            <tr>
                                <th className="px-4 py-3">اسم الخادم</th>
                                <th className="px-2 py-3 text-center">حضور</th>
                                <th className="px-2 py-3 text-center">غياب</th>
                                <th className="px-2 py-3 text-center">قداس</th>
                                <th className="px-2 py-3 text-center">تحضير</th>
                                <th className="px-2 py-3 text-center">افتقاد</th>
                                <th className="px-2 py-3 text-center">إجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {sectorServants.map(servant => {
                                const recordId = `${viewDate}_${servant.id}_${selectedSectorId}`;
                                const record = attendance[recordId] || {}; 
                                return (
                                    <tr key={servant.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{servant.name}</td>
                                        <td className="px-2 py-3 text-center">{renderAttendanceIcon(record.present)}</td>
                                        <td className="px-2 py-3 text-center">{record.absent ? <XCircle className="text-red-500 inline" size={18} /> : <span className="text-gray-200 dark:text-gray-600 font-bold">-</span>}</td>
                                        <td className="px-2 py-3 text-center">{renderAttendanceIcon(record.attendedMass)}</td>
                                        <td className="px-2 py-3 text-center">{renderAttendanceIcon(record.preparedLesson)}</td>
                                        <td className="px-2 py-3 text-center">{renderAttendanceIcon(record.didVisitation)}</td>
                                        <td className="px-2 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button 
                                                    onClick={() => setViewingNoteData({ name: servant.name, note: record.notes || '' })}
                                                    className={`p-1.5 rounded-lg transition-colors ${record.notes ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' : 'text-gray-300 hover:text-gray-500 dark:hover:text-gray-400'}`}
                                                    title={record.notes ? "عرض الملاحظة" : "لا توجد ملاحظات"}
                                                >
                                                    <StickyNote size={18} />
                                                </button>
                                                <button onClick={() => setServantToRemove(servant)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="إزالة الخادم من القطاع"><UserMinus size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div id="servant-attendance-printable" className="fixed left-[-10000px] top-0 bg-white text-black w-[210mm] min-h-[297mm] p-10">
                    <div className="mb-8 text-center border-b-2 border-black pb-4">
                        <h1 className="text-3xl font-bold text-black mb-4">سجل حضور ومتابعة الخدام</h1>
                        <div className="flex justify-between text-xl font-bold text-black px-4">
                            <div>القطاع: {sectors.find(s => s.id === selectedSectorId)?.name}</div>
                            <div>التاريخ: {viewDate}</div>
                        </div>
                    </div>
                    <div className="w-full">
                        <table className="w-full text-right text-sm border-collapse border border-black">
                            <thead className="bg-gray-100 text-black font-bold">
                                <tr>
                                    <th className="border border-black px-2 py-2 w-[5%] text-center">م</th>
                                    <th className="border border-black px-2 py-2 w-[30%]">اسم الخادم</th>
                                    <th className="border border-black px-1 py-2 text-center">حضور</th>
                                    <th className="border border-black px-1 py-2 text-center">غياب</th>
                                    <th className="border border-black px-1 py-2 text-center">تحضير</th>
                                    <th className="border border-black px-1 py-2 text-center">قداس</th>
                                    <th className="border border-black px-1 py-2 text-center">افتقاد</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sectorServants.map((servant, index) => {
                                    const recordId = `${viewDate}_${servant.id}_${selectedSectorId}`;
                                    const record = attendance[recordId] || {};
                                    return (
                                        <tr key={servant.id} className="border border-black">
                                            <td className="border border-black px-2 py-2 text-center font-bold">{index + 1}</td>
                                            <td className="border border-black px-2 py-2 font-bold">{servant.name}</td>
                                            <td className="border border-black px-1 py-2 text-center">{renderPrintIcon(record.present)}</td>
                                            <td className="border border-black px-1 py-2 text-center">{renderPrintIcon(record.absent, true)}</td>
                                            <td className="border border-black px-1 py-2 text-center">{renderPrintIcon(record.attendedMass)}</td>
                                            <td className="border border-black px-1 py-2 text-center">{renderPrintIcon(record.preparedLesson)}</td>
                                            <td className="border border-black px-1 py-2 text-center">{renderPrintIcon(record.didVisitation)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end pt-2"><button onClick={() => setSelectedSectorId(null)} className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-bold transition-all">إغلاق</button></div>
             </div>
         </Modal>
      )}

      {viewingNoteData && (
        <Modal
            isOpen={!!viewingNoteData}
            onClose={() => setViewingNoteData(null)}
            title={`ملاحظات: ${viewingNoteData.name}`}
            zIndex="z-[80]"
        >
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-bold border-b border-gray-100 dark:border-slate-700 pb-2">
                    <Calendar size={16} />
                    <span>عن يوم: {viewDate}</span>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30 min-h-[100px] whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                    {viewingNoteData.note || <span className="text-gray-400 italic font-normal">لا توجد ملاحظات مسجلة لهذا الخادم في هذا التاريخ.</span>}
                </div>
                <div className="flex justify-end pt-2">
                    <button onClick={() => setViewingNoteData(null)} className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 px-6 py-2 rounded-lg font-bold transition-all">
                        إغلاق
                    </button>
                </div>
            </div>
        </Modal>
      )}

      <ConfirmDialog 
        isOpen={!!servantToRemove}
        onClose={() => setServantToRemove(null)}
        onConfirm={handleRemoveServantFromSector}
        title="إزالة خادم من القطاع"
        message={`هل أنت متأكد من إزالة الخادم "${servantToRemove?.name}"؟ سيتم حذف الخادم من القائمة في هذا القطاع.`}
      />
    </div>
  );
};

// ... (ClassManagement, PreparationsAdminView, ServantsDirectory unchanged)
interface ClassManagementProps {
  classes: ClassGroup[];
  sectors: Sector[];
  users: User[];
  students: Student[];
  attendance: Record<string, any>;
  onAddClass: (name: string, sectorId: string, servantIds: string[]) => void;
  onEditClass: (id: string, name: string, sectorId: string, servantIds: string[]) => void;
  onDeleteClass: (id: string) => void;
  onAddStudent: (student: Omit<Student, 'id' | 'attendanceRate'>) => void;
  onEditStudent: (id: string, student: Partial<Student>) => void;
  onDeleteStudent: (id: string) => void;
  isSimplifiedView?: boolean;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({
  classes, sectors, users, students, attendance,
  onAddClass, onEditClass, onDeleteClass,
  onAddStudent, onEditStudent, onDeleteStudent, isSimplifiedView
}) => {
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
    const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
    const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});
    const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [classForm, setClassForm] = useState({ name: '', sectorId: '', servantIds: [] as string[] });
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [studentForm, setStudentForm] = useState({ name: '', phone: '', birthDate: '', address: '', notes: '' });

    const classesBySector = useMemo(() => {
        const grouped: Record<string, ClassGroup[]> = {};
        classes.forEach(cls => {
            if (!grouped[cls.sectorId]) grouped[cls.sectorId] = [];
            grouped[cls.sectorId].push(cls);
        });
        return grouped;
    }, [classes]);

    const toggleSector = (sectorId: string) => setExpandedSectors(prev => ({ ...prev, [sectorId]: !prev[sectorId] }));

    const handleOpenAddClass = () => {
        setEditingClass(null);
        setClassForm({ name: '', sectorId: sectors[0]?.id || '', servantIds: [] });
        setIsClassModalOpen(true);
    };

    const handleOpenEditClass = (cls: ClassGroup, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingClass(cls);
        setClassForm({ name: cls.name, sectorId: cls.sectorId, servantIds: cls.servantIds || [] });
        setIsClassModalOpen(true);
    };

    const handleSubmitClass = () => {
        if (editingClass) {
            onEditClass(editingClass.id, classForm.name, classForm.sectorId, classForm.servantIds);
        } else {
            onAddClass(classForm.name, classForm.sectorId, classForm.servantIds);
        }
        setIsClassModalOpen(false);
    };

    const handleOpenAddStudent = () => {
        setEditingStudent(null);
        setStudentForm({ name: '', phone: '', birthDate: '', address: '', notes: '' });
        setIsStudentModalOpen(true);
    };

    const handleOpenEditStudent = (s: Student, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingStudent(s);
        setStudentForm({ 
            name: s.name, 
            phone: s.phone || '', 
            birthDate: s.birthDate || '', 
            address: s.address || '', 
            notes: s.notes || '' 
        });
        setIsStudentModalOpen(true);
    };

    const calculateMonthlyAttendance = (studentId: string) => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      let attended = 0, total = 0;
      Object.entries(attendance).forEach(([key, record]: [string, any]) => {
        if (key.includes(`_${studentId}`)) {
          const recordDate = new Date(record.date);
          if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
            total++; if (record.present) attended++;
          }
        }
      });
      return total > 0 ? Math.round((attended / total) * 100) : 0;
    };

    const handleSubmitStudent = () => {
        if (!selectedClassId) return;
        const currentClass = classes.find(c => c.id === selectedClassId);
        if (!currentClass) return;
        if (editingStudent) onEditStudent(editingStudent.id, studentForm);
        else onAddStudent({ ...studentForm, classId: selectedClassId, sectorId: currentClass.sectorId, age: 0 } as any);
        setIsStudentModalOpen(false);
    };

    const handleExportExcel = async () => {
        if (!selectedClassId) return;
        const currentClass = classes.find(c => c.id === selectedClassId);
        const classStudents = students.filter(s => s.classId === selectedClassId);
        const data = classStudents.map(s => {
            const rec = attendance[`${viewDate}_${s.id}`] || {};
            return { "اسم المخدوم": s.name, "حضور": rec.present ? "✓" : "-", "غياب": rec.absent ? "✓" : "-", "قداس": rec.attendedMass ? "✓" : "-", "تناول": rec.communion ? "✓" : "-", "صلاة": rec.prayer ? "✓" : "-", "افتقاد": rec.didVisitation ? "✓" : "-", "رقم الهاتف": s.phone || "-" };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "سجل الحضور");
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        await downloadOrShareFile(blob, `كشف_حضور_${currentClass?.name}_${viewDate}.xlsx`);
    };

    const handleExportPDF = async () => {
        const element = document.getElementById('student-attendance-table-printable');
        if (!element) return;
        
        try {
            // Use imported jsPDF
            const currentClass = classes.find(c => c.id === selectedClassId);
            const canvas = await html2canvas(element, { 
                scale: 2, 
                useCORS: true, 
                logging: false, 
                backgroundColor: '#ffffff', 
                windowWidth: 1200 
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = imgHeight;
            let position = 0; // Position in the source image
            
            // First Page
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
            position += pdfHeight;

            // Subsequent Pages
            while (heightLeft > 0) {
              pdf.addPage();
              const topMargin = 20; // 20mm margin for better spacing
              // Shift image up by 'position', down by 'topMargin'
              pdf.addImage(imgData, 'PNG', 0, -position + topMargin, pdfWidth, imgHeight);
              
              // Mask the top margin area to prevent repetition of content from previous page
              pdf.setFillColor(255, 255, 255);
              pdf.rect(0, 0, pdfWidth, topMargin, 'F');
              
              const contentOnPage = pdfHeight - topMargin;
              heightLeft -= contentOnPage;
              position += contentOnPage;
            }
            
            const pdfBlob = pdf.output('blob');
            await downloadOrShareFile(pdfBlob, `كشف_حضور_${currentClass?.name}_${viewDate}.pdf`);
        } catch (err) {
            console.error("PDF Export Error:", err);
            alert("حدث خطأ أثناء تصدير الملف. يرجى المحاولة مرة أخرى.");
        }
    };

    const toggleAttendance = (studentId: string, field: keyof StudentDailyRecord) => {
        const recordId = `${viewDate}_${studentId}`;
        const currentRecord = attendance[recordId] || { studentId, present: false, absent: false, attendedMass: false, communion: false, prayer: false, didVisitation: false };
        const updated = { ...currentRecord, [field]: !currentRecord[field] };
        if (field === 'present' && updated.present) updated.absent = false;
        if (field === 'absent' && updated.absent) updated.present = false;
        addData(`attendance/${recordId}`, { ...updated, date: viewDate });
    };

    const availableServants = users.filter(u => u.role === UserRole.SERVANT);
    const selectedClassStudents = students.filter(s => s.classId === selectedClassId);

    const renderInteractiveIcon = (studentId: string, field: keyof StudentDailyRecord, status: boolean, isAbsentField = false) => (
        <button onClick={() => toggleAttendance(studentId, field)} className="w-10 h-10 flex items-center justify-center mx-auto rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-slate-700 group/icon">
            {status ? (isAbsentField ? <XCircle className="text-red-500" size={22} /> : <CheckCircle className="text-green-500" size={22} />) : <span className="text-gray-300 dark:text-gray-600 font-bold group-hover/icon:text-gray-400">-</span>}
        </button>
    );

    const renderPrintIcon = (status: boolean, isAbsent = false) => status ? (
        <div className="flex items-center justify-center h-full w-full">
            <div className="flex items-center justify-center font-black text-2xl text-black">{isAbsent ? 'X' : '✓'}</div>
        </div>
    ) : null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><Layers size={24} /></div>
                    <div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">إدارة الفصول</h2><p className="text-xs text-gray-500 dark:text-gray-400">منظمة حسب القطاعات الكنسية</p></div>
                </div>
                {/* تم تمكين إضافة الفصول لأمين القطاع كما في شاشة الأدمن */}
                <button onClick={handleOpenAddClass} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg transition-all">
                    <Plus size={18} /> إضافة فصل جديد
                </button>
            </div>

            <div className="space-y-4">
                {sectors.map(sector => {
                    const sectorClasses = classesBySector[sector.id] || [];
                    const isExpanded = expandedSectors[sector.id];
                    const secretary = users.find(u => u.id === sector.secretaryId);
                    const sectorStudentCount = students.filter(s => s.sectorId === sector.id).length;

                    return (
                        <div key={sector.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-all duration-300">
                            <button onClick={() => toggleSector(sector.id)} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'}`}><Church size={20} /></div>
                                    <div className="text-right">
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{sector.name}</h3>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <UserIcon size={12} className="text-indigo-500" />
                                                الأمين: <span className="font-bold text-gray-700 dark:text-gray-200">{secretary?.name || 'غير معين'}</span>
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Layers size={12} className="text-indigo-500" />
                                                عدد الفصول: <span className="font-bold text-gray-700 dark:text-gray-200">{sectorClasses.length}</span>
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Users size={12} className="text-indigo-500" />
                                                إجمالي المخدومين: <span className="font-bold text-gray-700 dark:text-gray-200">{sectorStudentCount}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><ChevronDown /></div>
                            </button>
                            {isExpanded && (
                                <div className="p-5 pt-2 bg-gray-50/50 dark:bg-slate-900/10 border-t border-gray-100 dark:border-slate-700 animate-slide-down">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {sectorClasses.map(cls => {
                                            const classServants = users.filter(u => cls.servantIds?.includes(u.id));
                                            const classStudents = students.filter(s => s.classId === cls.id);
                                            const classStudentCount = classStudents.length;

                                            // حساب حضور وغياب اليوم للفصل
                                            const todayAttendance = classStudents.reduce((acc, s) => {
                                                const rec = attendance[`${viewDate}_${s.id}`];
                                                if (rec?.present) acc.present++;
                                                else if (rec?.absent) acc.absent++;
                                                return acc;
                                            }, { present: 0, absent: 0 });

                                            return (
                                                <div key={cls.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 flex flex-col hover:shadow-md transition-all group border-b-4 border-b-transparent hover:border-b-indigo-500">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h4 className="font-bold text-gray-800 dark:text-white group-hover:text-indigo-600 transition-colors">{cls.name}</h4>
                                                        <div className="flex gap-1">
                                                            {/* تم تمكين التعديل والحذف لأمين القطاع أيضاً ليكون له تحكم كامل */}
                                                            <button onClick={(e) => handleOpenEditClass(cls, e)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); setDeleteClassId(cls.id); }} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Class Details Inside Card - Simplified for cards, full detailed on modal */}
                                                    <div className="space-y-2 mb-4">
                                                        {isSimplifiedView ? (
                                                            <>
                                                                <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                                                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">عدد الفصل:</span>
                                                                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-400">{classStudentCount}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                                    <span className="text-xs font-bold text-green-700 dark:text-green-400">عدد الحضور:</span>
                                                                    <span className="text-sm font-black text-green-700 dark:text-green-400">{todayAttendance.present}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                                                    <span className="text-xs font-bold text-red-700 dark:text-red-400">عدد الغياب:</span>
                                                                    <span className="text-sm font-black text-red-700 dark:text-red-400">{todayAttendance.absent}</span>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-start gap-2">
                                                                    <UserIcon size={14} className="text-gray-400 mt-0.5 shrink-0" />
                                                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                                                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">الخدام: </span>
                                                                        {classServants.length > 0 
                                                                            ? classServants.map(sv => sv.name).join('، ') 
                                                                            : 'لم يتم تعيين خدام'}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Users size={14} className="text-gray-400 shrink-0" />
                                                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">عدد المخدومين: </span>
                                                                        {classStudentCount} مخدوم
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    <button onClick={() => setSelectedClassId(cls.id)} className="mt-auto text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 text-xs font-bold flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors justify-center">عرض الأسماء والكشف <ArrowRight size={14} className="rotate-180" /></button>
                                                </div>
                                            );
                                        })}
                                        {sectorClasses.length === 0 && (
                                            <div className="col-span-full py-8 text-center text-gray-400 italic">لا توجد فصول مضافة لهذا القطاع بعد.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal for adding/editing a Class */}
            <Modal 
                isOpen={isClassModalOpen} 
                onClose={() => setIsClassModalOpen(false)} 
                title={editingClass ? "تعديل بيانات الفصل" : "إضافة فصل جديد"}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">اسم الفصل *</label>
                        <input 
                            type="text" 
                            value={classForm.name}
                            onChange={e => setClassForm({...classForm, name: e.target.value})}
                            className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="مثال: فصل القديس أبانوب"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">القطاع التابع له</label>
                        <select 
                            value={classForm.sectorId}
                            onChange={e => setClassForm({...classForm, sectorId: e.target.value})}
                            className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                            <option value="">اختر القطاع</option>
                            {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">الخدام المسؤولين</label>
                        <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700 shadow-inner">
                            {availableServants.map(servant => (
                                <label key={servant.id} className="flex items-center gap-3 cursor-pointer group p-1 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors">
                                    <input 
                                        type="checkbox"
                                        checked={classForm.servantIds.includes(servant.id)}
                                        onChange={(e) => {
                                            const ids = e.target.checked 
                                                ? [...classForm.servantIds, servant.id]
                                                : classForm.servantIds.filter(id => id !== servant.id);
                                            setClassForm({...classForm, servantIds: ids});
                                        }}
                                        className="w-4 h-4 accent-indigo-600 rounded"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 transition-colors font-medium">{servant.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <button 
                        onClick={handleSubmitClass}
                        disabled={!classForm.name || !classForm.sectorId}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg mt-2 transition-all disabled:opacity-50"
                    >
                        {editingClass ? "تحديث الفصل" : "إضافة الفصل"}
                    </button>
                </div>
            </Modal>

            {selectedClassId && (
                <Modal isOpen={!!selectedClassId} onClose={() => setSelectedClassId(null)} title={`كشف حضور: ${classes.find(c => c.id === selectedClassId)?.name}`}>
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-indigo-50 dark:bg-slate-700/50 p-4 rounded-xl border border-indigo-100 dark:border-slate-700 shadow-inner">
                             <div className="flex items-center gap-2">
                                <Calendar size={18} className="text-indigo-600" /><span className="text-sm font-bold text-gray-700 dark:text-gray-300">يوم:</span>
                                <input type="date" value={viewDate} onChange={(e) => setViewDate(e.target.value)} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-indigo-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm outline-none transition-all focus:ring-1 focus:ring-indigo-400" />
                             </div>
                             <div className="flex gap-2">
                                <button onClick={handleOpenAddStudent} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shadow transition-all"><Plus size={14} /> إضافة مخدوم</button>
                                <button onClick={handleExportPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow transition-all"><Printer size={16} /> PDF تصدير</button>
                             </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm border-collapse dark:border-slate-600">
                                <thead className="bg-gray-100 dark:bg-slate-700 text-black dark:text-white font-bold">
                                    <tr>
                                        <th className="px-4 py-3 min-w-[140px] rounded-r-xl">اسم المخدوم</th>
                                        <th className="px-2 py-3 text-center">حضور</th>
                                        <th className="px-2 py-3 text-center">غياب</th>
                                        {/* IMPORTANT: Removed !isSimplifiedView so all columns always show in the modal view as requested */}
                                        <th className="px-2 py-3 text-center">قداس</th>
                                        <th className="px-2 py-3 text-center">تناول</th>
                                        <th className="px-2 py-3 text-center">صلاة</th>
                                        
                                        <th className="px-2 py-3 text-center">افتقاد</th>
                                        <th className="px-4 py-3 text-center rounded-l-xl">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-700">
                                    {selectedClassStudents.map(s => {
                                        const rec = attendance[`${viewDate}_${s.id}`] || { present: false, absent: false, attendedMass: false, communion: false, prayer: false, didVisitation: false };
                                        return (
                                            <tr key={s.id} className="text-black dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-4 py-3 font-bold">{s.name}</td>
                                                <td className="px-2 py-3 text-center">{renderInteractiveIcon(s.id, 'present', rec.present)}</td>
                                                <td className="px-2 py-3 text-center">{renderInteractiveIcon(s.id, 'absent', rec.absent, true)}</td>
                                                
                                                {/* Always show extra columns */}
                                                <td className="px-2 py-3 text-center">{renderInteractiveIcon(s.id, 'attendedMass', rec.attendedMass)}</td>
                                                <td className="px-2 py-3 text-center">{renderInteractiveIcon(s.id, 'communion', rec.communion)}</td>
                                                <td className="px-2 py-3 text-center">{renderInteractiveIcon(s.id, 'prayer', rec.prayer)}</td>
                                                
                                                <td className="px-2 py-3 text-center">{renderInteractiveIcon(s.id, 'didVisitation', rec.didVisitation)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setViewingStudent(s); }} 
                                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 rounded-lg transition-colors"
                                                            title="عرض التفاصيل"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => handleOpenEditStudent(s, e)} 
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 rounded-lg transition-colors"
                                                            title="تعديل"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setDeleteStudentId(s.id); }} 
                                                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-400 rounded-lg transition-colors"
                                                            title="حذف"
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

                        {/* Professional Print Grid Container (Only for Export) */}
                        <div id="student-attendance-table-printable" className="fixed left-[-10000px] top-0 bg-white text-black w-[210mm] min-h-[297mm] p-10">
                            <div className="mb-8 text-center border-b-2 border-black pb-4">
                                <h1 className="text-3xl font-bold text-black mb-4">كشف حضور مخدومين</h1>
                                <div className="flex justify-between text-xl font-bold text-black px-4">
                                    <div>القطاع: {sectors.find(s => s.id === classes.find(c => c.id === selectedClassId)?.sectorId)?.name}</div>
                                    <div>الفصل: {classes.find(c => c.id === selectedClassId)?.name}</div>
                                    <div>التاريخ: {viewDate}</div>
                                </div>
                            </div>
                            <div className="w-full">
                                <table className="w-full text-right text-sm border-collapse border border-black">
                                    <thead className="bg-gray-100 text-black font-bold">
                                        <tr>
                                            <th className="border border-black px-2 py-2 w-[5%] text-center">م</th>
                                            <th className="border border-black px-2 py-2 w-[30%]">اسم المخدوم</th>
                                            <th className="border border-black px-1 py-2 text-center">حضور</th>
                                            <th className="border border-black px-1 py-2 text-center">غياب</th>
                                            <th className="border border-black px-1 py-2 text-center">قداس</th>
                                            <th className="border border-black px-1 py-2 text-center">تناول</th>
                                            <th className="border border-black px-1 py-2 text-center">صلاة</th>
                                            <th className="border border-black px-1 py-2 text-center">افتقاد</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedClassStudents.map((s, index) => {
                                            const rec = attendance[`${viewDate}_${s.id}`] || { present: false, absent: false, attendedMass: false, communion: false, prayer: false, didVisitation: false };
                                            return (
                                                <tr key={s.id} className="border border-black">
                                                    <td className="border border-black px-2 py-2 text-center font-bold">{index + 1}</td>
                                                    <td className="border border-black px-2 py-2 font-bold">{s.name}</td>
                                                    <td className="border border-black px-1 py-2 text-center">{renderPrintIcon(rec.present)}</td>
                                                    <td className="border border-black px-1 py-2 text-center">{renderPrintIcon(rec.absent, true)}</td>
                                                    <td className="border border-black px-1 py-2 text-center">{renderPrintIcon(rec.attendedMass)}</td>
                                                    <td className="border border-black px-1 py-2 text-center">{renderPrintIcon(rec.communion)}</td>
                                                    <td className="border border-black px-1 py-2 text-center">{renderPrintIcon(rec.prayer)}</td>
                                                    <td className="border border-black px-1 py-2 text-center">{renderPrintIcon(rec.didVisitation)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {viewingStudent && (
                <Modal isOpen={!!viewingStudent} onClose={() => setViewingStudent(null)} title={`بيانات المخدوم: ${viewingStudent.name}`} zIndex="z-[70]">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 bg-gradient-to-l from-indigo-50 to-white dark:from-slate-700 dark:to-slate-800 p-6 rounded-2xl border border-indigo-100 dark:border-slate-700">
                            <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center text-indigo-600 shadow-md"><UserIcon size={40} /></div>
                            <div><h4 className="text-2xl font-bold text-gray-800 dark:text-white leading-tight">{viewingStudent.name}</h4><p className="text-indigo-600 dark:text-indigo-400 font-bold mt-2">{classes.find(c => c.id === viewingStudent.classId)?.name || 'فصل غير محدد'}</p></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 bg-white dark:bg-slate-700 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm"><p className="text-xs text-gray-400 font-bold mb-1 uppercase">رقم الهاتف</p><p className="font-bold text-lg">{viewingStudent.phone || 'غير مسجل'}</p></div>
                            <div className="p-4 bg-white dark:bg-slate-700 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm"><p className="text-xs text-gray-400 font-bold mb-1 uppercase">تاريخ الميلاد</p><p className="font-bold text-lg">{viewingStudent.birthDate || 'غير مسجل'}</p></div>
                        </div>

                        {/* Display Student Notes for Admin - Updated to reflect daily notes */}
                        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                                    <StickyNote size={20} />
                                    <span>ملاحظات اليوم ({viewDate})</span>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl text-gray-600 dark:text-gray-300 min-h-[100px] whitespace-pre-wrap border border-gray-100 dark:border-slate-600 italic">
                                {attendance[`${viewDate}_${viewingStudent.id}`]?.notes || 'لا توجد ملاحظات مسجلة لهذا اليوم.'}
                            </div>
                        </div>

                        <div className="p-6 bg-indigo-600 rounded-2xl text-white shadow-xl">
                            <p className="text-indigo-100 text-sm font-bold mb-1">نسبة الالتزام لهذا الشهر</p>
                            <h4 className="text-5xl font-black">{calculateMonthlyAttendance(viewingStudent.id)}%</h4>
                        </div>
                        <div className="flex justify-end pt-2"><button onClick={() => setViewingStudent(null)} className="px-8 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 transition-colors">إغلاق</button></div>
                    </div>
                </Modal>
            )}

            <Modal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} title={editingStudent ? "تعديل بيانات المخدوم" : "إضافة مخدوم جديد"} zIndex="z-[60]">
                <div className="space-y-4">
                    <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">الاسم بالكامل *</label><input type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">الهاتف</label><input type="tel" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: e.target.value})} className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2 outline-none transition-all" /></div>
                        <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">الميلاد</label><input type="date" value={studentForm.birthDate} onChange={e => setStudentForm({...studentForm, birthDate: e.target.value})} className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2 outline-none transition-all" /></div>
                    </div>
                    <button onClick={handleSubmitStudent} disabled={!studentForm.name} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg mt-2 transition-all">حفظ</button>
                </div>
            </Modal>

            <ConfirmDialog isOpen={!!deleteClassId} onClose={() => setDeleteClassId(null)} onConfirm={() => deleteClassId && onDeleteClass(deleteClassId)} title="حذف فصل" message="هل أنت متأكد من حذف هذا الفصل؟ سيتم حذف جميع المخدومين بداخله." />
            <ConfirmDialog isOpen={!!deleteStudentId} onClose={() => setDeleteStudentId(null)} onConfirm={() => deleteStudentId && onDeleteStudent(deleteStudentId)} title="حذف مخدوم" message="سيتم حذف المخدوم نهائياً من النظام." />
        </div>
    );
};

interface SectorServantsViewProps {
    users: User[];
    attendance: Record<string, any>;
    onSaveAttendance: (date: string, records: Record<string, ServantDailyRecord>) => void;
    sectorId?: string;
    classes?: ClassGroup[];
    students?: Student[];
    currentUserName?: string;
}

export const SectorServantsView: React.FC<SectorServantsViewProps> = ({ users, attendance, onSaveAttendance, sectorId }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState<Record<string, ServantDailyRecord>>({});
    const [showToast, setShowToast] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);
    
    // Save Flow State
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState(0);
    const [summary, setSummary] = useState({ present: 0, absent: 0 });
    const [isManualEdit, setIsManualEdit] = useState(false);

    // Notes Modal State
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [editingServantForNotes, setEditingServantForNotes] = useState<User | null>(null);
    const [tempNotes, setTempNotes] = useState('');

    const servants = useMemo(() => users.filter(u => u.role === UserRole.SERVANT), [users]);
    
    // Check if the selected date is today
    const isToday = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return date === today;
    }, [date]);

    // مزامنة السجل المحلي مع قاعدة البيانات عند تغيير التاريخ أو البيانات العالمية
    useEffect(() => {
        if (hasSaved) return; // منع إعادة التحميل الفوري بعد الحفظ مباشرة لمسح العلامات

        const dailyRecords: Record<string, ServantDailyRecord> = {};
        servants.forEach(s => {
            // Use composite key including sectorId if available, otherwise fallback to legacy key
            // Ideally, we should migrate all data to include sectorId, but for now we support both
            // The key format in Firebase should be: `${date}_${s.id}_${sectorId}`
            // But the current implementation uses `${date}_${s.id}` which causes the conflict.
            
            // We need to look for a record specific to this sector
            // Since `attendance` prop is a flat object of all records, we need to find the one matching this sector
            
            // Construct the specific key for this sector
            const sectorKey = `${date}_${s.id}_${sectorId}`;
            const legacyKey = `${date}_${s.id}`;
            
            // Check if we have a record for this specific sector
            if (attendance[sectorKey]) {
                dailyRecords[s.id] = attendance[sectorKey];
            } 
            // Fallback: If no sector-specific record, check legacy key BUT only if it doesn't belong to another sector
            // This is tricky. If we use legacy key, it applies to all. 
            // To fix the issue "one sector affects another", we must prioritize sector-specific keys.
            // If no record exists for this sector, we start fresh for this sector.
            else {
                dailyRecords[s.id] = { 
                    servantId: s.id, 
                    present: false, 
                    absent: false, 
                    attendedMass: false, 
                    preparedLesson: false, 
                    didVisitation: false, 
                    notes: '',
                    sectorId: sectorId // Initialize with current sectorId
                };
            }
        });
        setRecords(dailyRecords);
    }, [date, servants, attendance, hasSaved, sectorId]);

    // إعادة تفعيل التحميل التلقائي عند تغيير التاريخ
    useEffect(() => {
        setHasSaved(false);
        setIsManualEdit(false);
    }, [date]);

    const handleCheck = (sid: string, field: keyof ServantDailyRecord) => {
        if (!isToday && !isManualEdit) return; // Read-only logic

        setRecords(prev => {
            const cur = prev[sid] || { 
                servantId: sid, 
                present: false, 
                absent: false, 
                attendedMass: false, 
                preparedLesson: false, 
                didVisitation: false, 
                notes: '',
                sectorId: sectorId
            };
            const up = { ...cur, [field]: !cur[field], sectorId: sectorId } as any; // Ensure sectorId is set
            if (field === 'present' && up.present) up.absent = false;
            if (field === 'absent' && up.absent) up.present = false;
            return { ...prev, [sid]: up };
        });
    };
    
    const handleSaveNote = () => {
        if (editingServantForNotes) {
            setRecords(prev => {
                const cur = prev[editingServantForNotes.id] || { 
                    servantId: editingServantForNotes.id, 
                    present: false, 
                    absent: false, 
                    attendedMass: false, 
                    preparedLesson: false, 
                    didVisitation: false, 
                    notes: '',
                    sectorId: sectorId
                };
                return { ...prev, [editingServantForNotes.id]: { ...cur, notes: tempNotes, sectorId: sectorId } };
            });
            setIsNotesModalOpen(false);
            setEditingServantForNotes(null);
        }
    };
    
    const openNotesModal = (servant: User) => {
        const currentRecord = records[servant.id];
        setTempNotes(currentRecord?.notes || '');
        setEditingServantForNotes(servant);
        setIsNotesModalOpen(true);
    };

    const handleSaveClick = () => {
        setIsSaveConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsSaveConfirmOpen(false);
        setIsSaving(true);
        setSaveProgress(0);

        const totalRecords = Object.keys(records).length;
        
        // Count up to the real number of records
        if (totalRecords > 0) {
            const stepTime = Math.max(20, Math.min(100, 2000 / totalRecords)); // Dynamic speed
            for (let i = 1; i <= totalRecords; i++) {
                setSaveProgress(i);
                await new Promise(resolve => setTimeout(resolve, stepTime));
            }
        } else {
            // Fallback just in case
            setSaveProgress(100);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Calculate summary counts before clearing
        const presentCount = Object.values(records).filter((r: any) => r.present).length;
        const absentCount = Object.values(records).filter((r: any) => r.absent).length;
        setSummary({ present: presentCount, absent: absentCount });

        // Call the central save handler
        onSaveAttendance(date, records);
        
        setRecords({});
        setHasSaved(true);
        setIsManualEdit(false); // Ensure we stay in summary mode
        setIsSaving(false);

        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const renderCell = (sid: string, field: keyof ServantDailyRecord, value: boolean, isAbsent: boolean = false) => {
        if (isToday || isManualEdit) {
            return <input 
                type="checkbox" 
                checked={value} 
                onChange={() => handleCheck(sid, field)} 
                className={`w-5 h-5 ${isAbsent ? 'accent-red-600' : 'accent-indigo-600'}`} 
            />;
        } else {
             // Read Only View
             if (value) {
                 return isAbsent ? <XCircle className="text-red-500 mx-auto" size={20} /> : <CheckCircle className="text-green-500 mx-auto" size={20} />;
             }
             return <span className="text-gray-300 dark:text-gray-600 font-bold">-</span>;
        }
    };

    if (hasSaved && !isManualEdit) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-in">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">تم حفظ حضور الخدام بنجاح</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">ملخص الحضور ليوم {new Date(date).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-900/30">
                            <p className="text-green-600 dark:text-green-400 font-bold mb-1">حضور</p>
                            <p className="text-3xl font-black text-green-700 dark:text-green-300">{summary.present}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                            <p className="text-red-600 dark:text-red-400 font-bold mb-1">غياب</p>
                            <p className="text-3xl font-black text-red-700 dark:text-red-300">{summary.absent}</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => setIsManualEdit(true)} 
                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
                    >
                        <Edit2 size={18} />
                        تعديل السجل
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in relative">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <ClipboardList size={24} />
                    </div>
                    <h2 className="text-2xl font-bold dark:text-white">حضور ومتابعة الخدام</h2>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm">
                <table className="w-full text-right"><thead className="bg-gray-50 dark:bg-slate-700 font-bold text-gray-700 dark:text-gray-200"><tr><th className="px-6 py-4">الخادم</th><th className="text-center">حضور</th><th className="text-center">غياب</th><th className="text-center">قداس</th><th className="text-center">تحضير</th><th className="text-center">افتقاد</th><th className="text-center">ملاحظات</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">{servants.map(s => {
                    const rec = records[s.id] || { present: false, absent: false, attendedMass: false, preparedLesson: false, didVisitation: false, notes: '' };
                    return (<tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 font-bold dark:text-gray-200">{s.name}</td>
                        <td className="text-center">{renderCell(s.id, 'present', rec.present)}</td>
                        <td className="text-center">{renderCell(s.id, 'absent', rec.absent, true)}</td>
                        <td className="text-center">{renderCell(s.id, 'attendedMass', rec.attendedMass)}</td>
                        <td className="text-center">{renderCell(s.id, 'preparedLesson', rec.preparedLesson)}</td>
                        <td className="text-center">{renderCell(s.id, 'didVisitation', rec.didVisitation)}</td>
                        <td className="text-center">
                            <button 
                                onClick={() => openNotesModal(s)}
                                className={`p-2 rounded-lg transition-all ${rec.notes ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                                title={rec.notes ? "تعديل الملاحظات" : "إضافة ملاحظات"}
                            >
                                <StickyNote size={20} />
                            </button>
                        </td>
                    </tr>)
                })}</tbody></table>
            </div>
            
            {(isToday || isManualEdit) && (
                <div className="flex justify-end"><button onClick={handleSaveClick} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all hover:bg-indigo-700"><Save size={20} /> حفظ حضور الخدام</button></div>
            )}
            {!isToday && !isManualEdit && (
                <div className="flex justify-center p-2 text-gray-500 italic">هذا السجل للقراءة فقط</div>
            )}

            {/* Notes Modal */}
            {isNotesModalOpen && editingServantForNotes && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsNotesModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/20">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                               <FileText size={18} className="text-indigo-600" />
                               ملاحظات عن الخادم: {editingServantForNotes.name}
                            </h3>
                            <button onClick={() => setIsNotesModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <textarea 
                                value={tempNotes}
                                onChange={(e) => setTempNotes(e.target.value)}
                                placeholder="اكتب ملاحظاتك عن الخادم لهذا اليوم..."
                                disabled={!isToday && !isManualEdit}
                                rows={6}
                                className="w-full bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none font-medium"
                            />
                            {(isToday || isManualEdit) && (
                                <button 
                                    onClick={handleSaveNote}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    حفظ الملاحظات
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showToast && (
                <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-8 py-3 rounded-xl shadow-2xl flex items-center gap-2 z-50 animate-bounce">
                    <CheckCircle size={20} />
                    <span className="font-bold">تم حفظ سجل الخدام بنجاح</span>
                </div>
            )}

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
                                    strokeDashoffset={251.2 - (251.2 * saveProgress) / (Object.keys(records).length || 1)}
                                    transform="rotate(-90 50 50)"
                                ></circle>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                {saveProgress}
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">جاري حفظ البيانات...</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">يتم الآن حفظ {saveProgress} من {Object.keys(records).length} سجل</p>
                    </div>
                </div>
            )}

            <ConfirmDialog 
                isOpen={isSaveConfirmOpen} 
                onClose={() => setIsSaveConfirmOpen(false)} 
                onConfirm={handleConfirmSave} 
                title="تأكيد حفظ الحضور" 
                message={`هل أنت متأكد من حفظ سجل حضور الخدام ليوم ${new Date(date).toLocaleDateString('ar-EG')}؟`} 
            />
        </div>
    );
};

// ... (PreparationsAdminView, ServantsDirectory unchanged)
export const PreparationsAdminView: React.FC<{ 
    users: User[], 
    preparations: LessonPreparation[], 
    onDeletePreparation?: (id: string) => void,
    onAddComment?: (prepId: string, text: string) => Promise<void>
}> = ({ users, preparations, onDeletePreparation, onAddComment }) => {
  const [selectedServantId, setSelectedServantId] = useState<string | null>(null);
  const [viewingImages, setViewingImages] = useState<string[] | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [servantSearch, setServantSearch] = useState('');
  const [prepToDeleteId, setPrepToDeleteId] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Comment Modal State
  const [viewingCommentsPrep, setViewingCommentsPrep] = useState<LessonPreparation | null>(null);
  const [viewingTextPrep, setViewingTextPrep] = useState<LessonPreparation | null>(null);
  const [newComment, setNewComment] = useState('');

  const touchStartX = useRef<number | null>(null);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const getServantStats = (servantId: string) => {
    const monthlyPreps = preparations.filter(p => {
        const pDate = new Date(p.date);
        return p.servantId === servantId && pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
    });

    const count = monthlyPreps.length;
    let label = "";
    let colorClass = "";
    let icon = Star;

    if (count >= 4) { label = "ممتاز"; colorClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"; icon = Award; }
    else if (count === 3) { label = "جيد جداً"; colorClass = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"; }
    else if (count === 2) { label = "جيد"; colorClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"; }
    else if (count === 1) { label = "ضعيف"; colorClass = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"; }
    else { label = "لم يحضر"; colorClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"; icon = AlertTriangle; }

    return { count, label, colorClass, icon };
  };

  const filteredServants = useMemo(() => {
    const servants = users.filter(u => u.role === UserRole.SERVANT);
    if (!servantSearch.trim()) return servants;
    return servants.filter(s => s.name.includes(servantSearch.trim()));
  }, [users, servantSearch]);
  
  const selectedServant = useMemo(() => {
    return users.find(u => u.id === selectedServantId);
  }, [selectedServantId, users]);

  const groupedPreps = useMemo(() => {
    if (!selectedServantId) return { currentMonthPreps: [], archivedPreps: {} };
    
    const servantPreps = preparations.filter(p => p.servantId === selectedServantId);
    const currentMonthPreps: LessonPreparation[] = [];
    const archivedPreps: Record<string, LessonPreparation[]> = {};

    servantPreps.forEach(prep => {
        const prepDate = new Date(prep.date);
        const pMonth = prepDate.getMonth();
        const pYear = prepDate.getFullYear();

        if (pMonth === currentMonth && pYear === currentYear) {
            currentMonthPreps.push(prep);
        } else {
            const monthLabel = prepDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
            if (!archivedPreps[monthLabel]) archivedPreps[monthLabel] = [];
            archivedPreps[monthLabel].push(prep);
        }
    });

    currentMonthPreps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    Object.keys(archivedPreps).forEach(month => {
        archivedPreps[month].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return { currentMonthPreps, archivedPreps };
  }, [selectedServantId, preparations, currentMonth, currentYear]);

  const handleDownloadAll = (prep: LessonPreparation) => {
    prep.imageUrls.forEach((url, idx) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `تحضير_${prep.servantName}_${prep.date}_صورة_${idx+1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
  };

  const handleAddCommentSubmit = async () => {
    if (!viewingCommentsPrep || !newComment.trim() || !onAddComment) return;
    await onAddComment(viewingCommentsPrep.id, newComment);
    setNewComment('');
  };

  const nextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (viewingImages) {
        setCurrentImageIndex((prev) => (prev + 1) % viewingImages.length);
    }
  };

  const prevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (viewingImages) {
        setCurrentImageIndex((prev) => (prev - 1 + viewingImages.length) % viewingImages.length);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextImage();
      else prevImage();
    }
    touchStartX.current = null;
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
  };

  const renderPrepTable = (preps: LessonPreparation[]) => (
    <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-right text-sm min-w-[500px]">
            <thead className="bg-gray-50 dark:bg-slate-700 font-bold text-gray-700 dark:text-gray-200 border-b dark:border-slate-600">
                <tr>
                    <th className="px-6 py-4">تاريخ التحضير</th>
                    <th className="px-6 py-4 text-center">الفصل</th>
                    <th className="px-6 py-4 text-center">المحتوى</th>
                    <th className="px-6 py-4 text-center">وقت الإرسال</th>
                    <th className="px-6 py-4 text-center">تعليقات</th>
                    <th className="px-6 py-4 text-center">الإجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {preps.map(prep => (
                    <tr key={prep.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-indigo-500" />
                                {prep.date}
                            </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-600 dark:text-gray-300">
                            {prep.className || '-'}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-indigo-600 dark:text-indigo-400">
                            {prep.imageUrls && prep.imageUrls.length > 0 ? (
                                <span className="flex items-center justify-center gap-1 text-xs bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg text-emerald-600 dark:text-emerald-400">
                                    <ImageIcon size={12} />
                                    صور ({prep.imageUrls.length})
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">
                                    <FileText size={12} />
                                    نص مكتوب
                                </span>
                            )}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-500 dark:text-gray-400 text-xs">
                            {new Date(prep.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-center">
                            <button 
                                onClick={() => setViewingCommentsPrep(prep)}
                                className={`flex items-center justify-center gap-1 mx-auto px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    (prep.comments && prep.comments.length > 0)
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                                    : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400'
                                }`}
                            >
                                <MessageCircle size={14} />
                                {prep.comments?.length || 0}
                            </button>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                                <button 
                                    onClick={() => { 
                                        if (prep.imageUrls && prep.imageUrls.length > 0) {
                                            setViewingImages(prep.imageUrls); 
                                            setCurrentImageIndex(0); 
                                        } else {
                                            setViewingTextPrep(prep);
                                        }
                                    }}
                                    className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition-colors"
                                    title="عرض المحتوى"
                                >
                                    <Eye size={18} />
                                </button>
                                {!prep.content && (
                                    <button 
                                        onClick={() => handleDownloadAll(prep)}
                                        className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 transition-colors"
                                        title="تحميل الصور"
                                    >
                                        <Download size={18} />
                                    </button>
                                )}
                                {onDeletePreparation && (
                                    <button 
                                        onClick={() => setPrepToDeleteId(prep.id)}
                                        className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                                        title="حذف التحضير"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-4">
          {selectedServantId && (
            <button 
              onClick={() => setSelectedServantId(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 transition-colors"
            >
              <ChevronLeft size={24} className="rotate-180" />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FileText className="text-indigo-600" />
              متابعة تحضير الدروس
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedServantId ? `سجل تحضيرات الخادم: ${selectedServant?.name}` : 'اختر الخادم لعرض سجل تحضيراته والتقييم الشهري'}
            </p>
          </div>
        </div>
      </div>

      {!selectedServantId ? (
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                    <span className="font-bold text-gray-700 dark:text-gray-200">قائمة الخدام والتقييم الشهري</span>
                    <div className="relative w-full md:w-80">
                        <Search size={16} className="absolute right-3 top-2.5 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="ابحث باسم الخادم..."
                            value={servantSearch}
                            onChange={(e) => setServantSearch(e.target.value)}
                            className="w-full pr-10 pl-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {filteredServants.map(s => {
                        const stats = getServantStats(s.id);
                        const Icon = stats.icon;
                        return (
                            <button 
                                key={s.id}
                                onClick={() => setSelectedServantId(s.id)}
                                className="flex flex-col p-4 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all text-right group relative overflow-hidden"
                            >
                                <div className="flex items-center gap-4 w-full">
                                    <Avatar src={s.avatarUrl} name={s.name} className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" />
                                    <div className="flex-1 text-right">
                                        <p className="font-bold text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{s.name}</p>
                                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-end">
                                            عرض السجل بالكامل
                                            <Clock size={12} />
                                        </p>
                                    </div>
                                    <ChevronLeft size={16} className="text-gray-300 group-hover:translate-x-[-4px] transition-transform" />
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-gray-50 dark:border-slate-700 pt-3 w-full">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${stats.colorClass}`}>
                                            <Icon size={10} />
                                            {stats.label}
                                        </span>
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400">
                                        تحضيرات الشهر: <span className="text-indigo-600 dark:text-indigo-400 font-black">{stats.count}/4</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                    {filteredServants.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-400 italic">لا توجد نتائج بحث مطابقة</div>
                    )}
                </div>
            </div>
        </div>
      ) : (
        <div className="space-y-6">
            {/* Performance Detail Panel */}
            {(() => {
                const stats = getServantStats(selectedServantId);
                const percentage = Math.min((stats.count / 4) * 100, 100);
                return (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col md:flex-row items-center gap-8 animate-fade-in-up">
                        <div className="relative w-32 h-32 flex-shrink-0">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                <circle className="text-gray-100 dark:text-slate-700" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                                <circle 
                                    className={`${stats.count >= 3 ? 'text-green-500' : stats.count === 2 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000`} 
                                    strokeWidth="8" 
                                    strokeDasharray={251.2} 
                                    strokeDashoffset={251.2 - (percentage / 100) * 251.2} 
                                    strokeLinecap="round" 
                                    stroke="currentColor" 
                                    fill="transparent" 
                                    r="40" 
                                    cx="50" 
                                    cy="50" 
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-gray-800 dark:text-white">{stats.count}/4</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">التحضيرات</span>
                            </div>
                        </div>
                        <div className="flex-1 text-center md:text-right space-y-2">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center justify-center md:justify-start gap-2">
                                <Award className="text-yellow-500" />
                                تحليل الأداء الشهري للخدمة
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                                المستهدف الشهري هو <span className="text-indigo-600 dark:text-indigo-400 font-bold">4 تحضيرات</span>. التقييم الحالي للخادم هو <span className={`px-2 py-0.5 rounded-lg font-bold ${stats.colorClass}`}>{stats.label}</span> بناءً على عدد المرات المرفوعة هذا الشهر.
                            </p>
                            <div className="pt-2 flex flex-wrap gap-2 justify-center md:justify-start">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${i <= stats.count ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-slate-700 text-gray-300'}`}>
                                        <Check size={16} className={i <= stats.count ? 'block' : 'hidden'} />
                                        <span className={i <= stats.count ? 'hidden' : 'block'}>{i}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Current Month Preps Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/20 border-b dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                        <Calendar size={18} />
                        تحضيرات الشهر الحالي
                    </h3>
                </div>
                {groupedPreps.currentMonthPreps.length > 0 ? (
                    renderPrepTable(groupedPreps.currentMonthPreps)
                ) : (
                    <div className="py-12 text-center text-gray-400 italic">لم يتم رفع أي تحضير لهذا الشهر حتى الآن</div>
                )}
            </div>

            {/* Archived Months Folders */}
            {Object.keys(groupedPreps.archivedPreps).length > 0 && (
                <div className="space-y-4">
                    <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mr-2 flex items-center gap-2">
                        <FolderOpen size={20} className="text-indigo-600" />
                        سجلات الأشهر السابقة
                    </h4>
                    {Object.keys(groupedPreps.archivedPreps).sort((a,b) => {
                        // Very basic sorting by looking at years if present in localized string (might need more robust month logic)
                        return b.localeCompare(a); 
                    }).map(month => (
                        <div key={month} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-all duration-300">
                            <button 
                                onClick={() => toggleMonth(month)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${expandedMonths[month] ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-400'}`}>
                                        <Folder size={20} />
                                    </div>
                                    <span className="font-bold text-gray-800 dark:text-gray-200">{month}</span>
                                    <span className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full text-gray-500 dark:text-gray-400">
                                        {groupedPreps.archivedPreps[month].length} تحضير
                                    </span>
                                </div>
                                <ChevronDown size={20} className={`transition-transform duration-300 ${expandedMonths[month] ? 'rotate-180' : ''} text-gray-400`} />
                            </button>
                            {expandedMonths[month] && (
                                <div className="border-t border-gray-100 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/10 animate-slide-down">
                                    {renderPrepTable(groupedPreps.archivedPreps[month])}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}

      {/* Text Viewing Modal - Custom Full Screen Overlay for Better Readability */}
      {viewingTextPrep && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={() => setViewingTextPrep(null)}>
            <div 
                className="bg-white dark:bg-[#1e293b] w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700 animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex justify-between items-start md:items-center backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-start md:items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm flex-shrink-0 mt-1 md:mt-0">
                            <FileText size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg md:text-2xl break-words leading-tight">{viewingTextPrep.title || 'بدون عنوان'}</h3>
                            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
                                <span className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-md whitespace-nowrap">
                                    <Calendar size={12} className="md:w-3.5 md:h-3.5" />
                                    {viewingTextPrep.date}
                                </span>
                                <span className="text-xs md:text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md whitespace-nowrap">
                                    <UserIcon size={12} className="md:w-3.5 md:h-3.5" />
                                    {viewingTextPrep.servantName}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setViewingTextPrep(null)}
                        className="w-8 h-8 md:w-10 md:h-10 flex flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        <X size={20} className="md:w-6 md:h-6" />
                    </button>
                </div>

                {/* Content Area - Paper-like feel */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-12">
                    <div className="max-w-3xl mx-auto bg-white dark:bg-[#1e293b] shadow-sm border border-gray-100 dark:border-slate-700 min-h-full rounded-xl p-4 md:p-12">
                        <div className="prose dark:prose-invert max-w-none space-y-8">
                            
                            {/* Always show title as requested */}
                            <div>
                                <h4 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2 border-b border-indigo-100 dark:border-indigo-900/30 pb-1 inline-block">اسم الدرس / الموضوع</h4>
                                <p className="whitespace-pre-wrap break-words leading-loose text-gray-800 dark:text-gray-200 font-medium text-base md:text-xl font-serif mt-2">
                                    {viewingTextPrep.title || 'بدون عنوان'}
                                </p>
                            </div>

                            {viewingTextPrep.content && (
                                <div>
                                    <h4 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2 border-b border-indigo-100 dark:border-indigo-900/30 pb-1 inline-block">المحتوى / تفاصيل الدرس</h4>
                                    <p className="whitespace-pre-wrap break-words leading-loose text-gray-800 dark:text-gray-200 font-medium text-base md:text-xl font-serif mt-2">
                                        {viewingTextPrep.content}
                                    </p>
                                </div>
                            )}

                            {viewingTextPrep.lessonVerse && (
                                <div>
                                    <h4 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2 border-b border-indigo-100 dark:border-indigo-900/30 pb-1 inline-block">آية الدرس</h4>
                                    <p className="whitespace-pre-wrap break-words leading-loose text-gray-800 dark:text-gray-200 font-medium text-base md:text-xl font-serif mt-2">
                                        {viewingTextPrep.lessonVerse}
                                    </p>
                                </div>
                            )}

                            {viewingTextPrep.lessonElements && (
                                <div>
                                    <h4 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2 border-b border-indigo-100 dark:border-indigo-900/30 pb-1 inline-block">عناصر الدرس</h4>
                                    <p className="whitespace-pre-wrap break-words leading-loose text-gray-800 dark:text-gray-200 font-medium text-base md:text-xl font-serif mt-2">
                                        {viewingTextPrep.lessonElements}
                                    </p>
                                </div>
                            )}

                            {viewingTextPrep.lessonObjectives && (
                                <div>
                                    <h4 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2 border-b border-indigo-100 dark:border-indigo-900/30 pb-1 inline-block">أهداف الدرس</h4>
                                    <p className="whitespace-pre-wrap break-words leading-loose text-gray-800 dark:text-gray-200 font-medium text-base md:text-xl font-serif mt-2">
                                        {viewingTextPrep.lessonObjectives}
                                    </p>
                                </div>
                            )}

                            {viewingTextPrep.illustrationMethod && (
                                <div>
                                    <h4 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2 border-b border-indigo-100 dark:border-indigo-900/30 pb-1 inline-block">وسيلة الإيضاح</h4>
                                    <p className="whitespace-pre-wrap break-words leading-loose text-gray-800 dark:text-gray-200 font-medium text-base md:text-xl font-serif mt-2">
                                        {viewingTextPrep.illustrationMethod}
                                    </p>
                                </div>
                            )}

                            {viewingTextPrep.training && (
                                <div>
                                    <h4 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2 border-b border-indigo-100 dark:border-indigo-900/30 pb-1 inline-block">التدريب / التطبيق</h4>
                                    <p className="whitespace-pre-wrap break-words leading-loose text-gray-800 dark:text-gray-200 font-medium text-base md:text-xl font-serif mt-2">
                                        {viewingTextPrep.training}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col-reverse sm:flex-row justify-between items-center gap-3">
                    <button 
                        onClick={() => setViewingTextPrep(null)}
                        className="w-full sm:w-auto px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        إغلاق
                    </button>
                    <button 
                        onClick={() => {
                            setViewingCommentsPrep(viewingTextPrep);
                            setViewingTextPrep(null);
                        }}
                        className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                        <MessageCircle size={20} />
                        عرض التعليقات والمناقشة
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Confirmation Dialog for Deletion */}
      <ConfirmDialog 
        isOpen={!!prepToDeleteId}
        onClose={() => setPrepToDeleteId(null)}
        onConfirm={() => {
          if (prepToDeleteId && onDeletePreparation) {
            onDeletePreparation(prepToDeleteId);
            setPrepToDeleteId(null);
          }
        }}
        title="حذف التحضير"
        message="هل أنت متأكد من حذف سجل هذا التحضير بجميع صوره؟ لا يمكن التراجع عن هذا الإجراء."
      />

      {/* Image Gallery Preview Modal with Swipe support */}
      {viewingImages && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setViewingImages(null)}>
          <button className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all z-50">
            <X size={32} />
          </button>
          
          <div 
            className="relative w-full h-full flex items-center justify-center" 
            onClick={e => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {viewingImages.length > 1 && (
                <>
                    <button 
                        onClick={prevImage}
                        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full transition-all z-10"
                    >
                        <ChevronLeft size={32} />
                    </button>
                    <button 
                        onClick={nextImage}
                        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full transition-all z-10"
                    >
                        <ChevronRightIcon size={32} />
                    </button>
                </>
            )}

            <div className="max-w-full max-h-full flex flex-col items-center select-none">
                <img 
                    src={viewingImages[currentImageIndex]} 
                    alt={`Preview ${currentImageIndex + 1}`} 
                    className="max-w-full max-h-[80vh] md:max-h-[85vh] object-contain shadow-2xl animate-fade-in transition-all" 
                    draggable="false"
                />
                <div className="mt-4 flex flex-col items-center gap-2">
                    {viewingImages.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto p-2 max-w-full no-scrollbar">
                            {viewingImages.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => setCurrentImageIndex(idx)}
                                    className={`w-3 h-3 rounded-full cursor-pointer transition-all ${idx === currentImageIndex ? 'bg-indigo-500 scale-125' : 'bg-white/30'}`}
                                />
                            ))}
                        </div>
                    )}
                    <div className="text-white font-bold bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm text-sm">
                        صورة {currentImageIndex + 1} من {viewingImages.length}
                    </div>
                    <p className="md:hidden text-white/50 text-[10px] font-bold mt-1">اسحب لليمين أو اليسار للتنقل بين الصور</p>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {viewingCommentsPrep && (
        <Modal 
            isOpen={!!viewingCommentsPrep} 
            onClose={() => setViewingCommentsPrep(null)} 
            title={`تعليقات التحضير - يوم ${viewingCommentsPrep.date}`}
            zIndex="z-[150]"
        >
            <div className="flex flex-col h-[60vh]">
                <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar mb-4">
                    {viewingCommentsPrep.comments && viewingCommentsPrep.comments.length > 0 ? (
                        viewingCommentsPrep.comments.map((comment) => (
                            <div key={comment.id} className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-700">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <UserIcon size={14} className="text-indigo-500" />
                                        {comment.authorName}
                                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                                            {comment.authorRole === UserRole.ADMIN ? 'أمين عام' : comment.authorRole === UserRole.SECTOR_SECRETARY ? 'أمين قطاع' : 'خادم'}
                                        </span>
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                        {new Date(comment.timestamp).toLocaleString('ar-EG')}
                                    </span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-200 text-sm whitespace-pre-wrap">{comment.text}</p>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <MessageCircle size={48} className="mb-2 opacity-20" />
                            <p>لا توجد تعليقات حتى الآن</p>
                        </div>
                    )}
                </div>
                {onAddComment && (
                    <div className="flex gap-2 items-end pt-2 border-t border-gray-100 dark:border-slate-700">
                        <textarea 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="اكتب تعليقك هنا..."
                            className="flex-1 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm"
                            rows={2}
                        />
                        <button 
                            onClick={handleAddCommentSubmit}
                            disabled={!newComment.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-all disabled:opacity-50 shadow-md"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                )}
            </div>
        </Modal>
      )}
    </div>
  );
};

export const ServantsDirectory: React.FC<{ users: User[]; sectors: Sector[]; classes: ClassGroup[] }> = ({ users, sectors, classes }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const servants = users.filter(u => u.role === UserRole.SERVANT);
  
  const filteredServants = servants.filter(s => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      
      const sectorName = sectors.find(sec => sec.id === s.sectorId)?.name || '';
      return (
          s.name.toLowerCase().includes(term) ||
          (s.phone && s.phone.includes(term)) ||
          sectorName.toLowerCase().includes(term)
      );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
             <Users className="text-indigo-600" /> 
             <h2 className="text-2xl font-bold text-gray-800 dark:text-white">دليل الخدام</h2>
          </div>
          <div className="relative w-full md:w-80">
             <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
             <input 
                type="text" 
                placeholder="بحث بالاسم أو الرقم أو القطاع..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
             />
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServants.map(s => (
            <div key={s.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all">
              <div className="flex items-center gap-4 mb-4"><Avatar src={s.avatarUrl} name={s.name} className="w-16 h-16 rounded-full border-2 border-indigo-100 dark:border-indigo-900" /><div><h3 className="font-bold dark:text-white">{s.name}</h3><p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">{sectors.find(sec => sec.id === s.sectorId)?.name || 'قطاع غير محدد'}</p></div></div>
              <div className="space-y-2 text-sm">
                {s.phone && <a href={`tel:${s.phone}`} className="text-gray-600 dark:text-gray-400 flex items-center gap-2 hover:text-indigo-600 transition-colors"><Phone size={14} /> {s.phone}</a>}
                <div className="pt-4 border-t border-gray-50 dark:border-slate-700"><p className="text-[10px] font-bold text-gray-400 uppercase mb-2">الفصول المسئول عنها:</p><div className="flex flex-wrap gap-2">{classes.filter(c => c.servantIds?.includes(s.id)).map(c => <span key={c.id} className="bg-gray-100 dark:bg-slate-700 dark:text-gray-200 px-2 py-1 rounded text-[10px] font-bold border border-gray-200 dark:border-slate-600">{c.name}</span>)}</div></div>
              </div>
            </div>
        ))}
        {filteredServants.length === 0 && (
            <div className="col-span-full py-10 text-center text-gray-400 italic bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                لا توجد نتائج مطابقة للبحث
            </div>
        )}
      </div>
    </div>
  );
};