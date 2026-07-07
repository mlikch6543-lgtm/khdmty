import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Student, User, UserRole } from '../types';
import { 
  Scan, 
  QrCode, 
  Camera, 
  CameraOff, 
  Search, 
  Check, 
  X, 
  Save, 
  Send, 
  Users, 
  UserCheck, 
  UserX, 
  AlertCircle, 
  Clock,
  CheckCircle,
  HelpCircle,
  Info
} from 'lucide-react';

interface ScannerViewProps {
  currentUser: User;
  students: Student[];
  classes: any[];
  sectors: any[];
  users: User[];
  onSaveAttendance: (date: string, records: Record<string, any>) => void;
}

interface EvaluationState {
  present: boolean | null;
  absent: boolean | null;
  attendedMass: boolean | null;
  communion: boolean | null;
  prayer: boolean | null;
  didVisitation: boolean | null;
  preparedLesson: boolean | null;
  notes: string;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  currentUser,
  students,
  classes,
  sectors,
  users,
  onSaveAttendance
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'list'>('scan');
  const [listFilter, setListFilter] = useState<'scanned' | 'unscanned'>('unscanned');
  
  // Search state for manual fallback
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active person state
  const [scannedPerson, setScannedPerson] = useState<{
    id: string;
    name: string;
    type: 'student' | 'servant';
    className: string;
    sectorName: string;
    phone?: string;
  } | null>(null);

  // Evaluated fields
  const [evaluations, setEvaluations] = useState<EvaluationState>({
    present: null,
    absent: null,
    attendedMass: null,
    communion: null,
    prayer: null,
    didVisitation: null,
    preparedLesson: null,
    notes: ''
  });

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [localRecords, setLocalRecords] = useState<Record<string, any>>({});
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-element";

  const isServant = currentUser.role === UserRole.SERVANT;
  
  // Get servant classes (associated classes)
  const myClasses = React.useMemo(() => {
    return classes.filter(c => c.servantIds?.includes(currentUser.id) || currentUser.classId === c.id);
  }, [classes, currentUser]);

  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Auto-select first class
  useEffect(() => {
    if (isServant && myClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(myClasses[0].id);
    }
  }, [myClasses, isServant]);

  const targetPeople = React.useMemo(() => {
    if (isServant) {
      // Find students in the selected class
      const activeClassId = selectedClassId || (myClasses.length > 0 ? myClasses[0].id : '');
      return students
        .filter(s => s.classId === activeClassId)
        .map(s => {
          const cls = classes.find(c => c.id === s.classId);
          const sec = sectors.find(sc => sc.id === s.sectorId);
          return {
            id: s.id,
            name: s.name,
            type: 'student' as const,
            className: cls?.name || 'فصل غير معروف',
            sectorName: sec?.name || 'قطاع غير معروف',
            phone: s.phone
          };
        });
    } else {
      // Sector Secretary: Find all servants in this sector
      return users
        .filter(u => 
          (u.role === UserRole.SERVANT || u.role === UserRole.SECTOR_SECRETARY) && 
          (u.sectorId === currentUser.sectorId || u.sectorIds?.includes(currentUser.sectorId || ''))
        )
        .map(u => {
          const srvClass = classes.find(c => c.servantIds?.includes(u.id) || u.classId === c.id);
          const sec = sectors.find(sc => sc.id === (u.sectorId || currentUser.sectorId));
          return {
            id: u.id,
            name: u.name,
            type: 'servant' as const,
            className: u.role === UserRole.SECTOR_SECRETARY ? 'أمين القطاع' : (srvClass?.name || 'خادم بالقطاع'),
            sectorName: sec?.name || 'قطاع غير معروف',
            phone: u.phone
          };
        });
    }
  }, [currentUser, students, classes, sectors, users, isServant, selectedClassId, myClasses]);

  // Synthesis sound for scanner
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 880; // High-pitch beep (A5 note)
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime); // Soft volume
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15); // Beep duration 150ms
    } catch (err) {
      console.error("Failed to play beep sound:", err);
    }
  };

  // Stop camera helper
  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Error stopping camera:", err);
      }
    }
    setIsCameraActive(false);
  };

  // Start camera helper
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              // Exact Square Scanner Box
              const size = Math.min(width, height) * 0.70;
              return { width: size, height: size };
            }
          },
          (decodedText) => {
            // Success sound and scan handling
            playBeep();
            handlePersonScanned(decodedText);
            stopCamera();
          },
          () => {
            // Silent error callback during active search
          }
        );
      } catch (err: any) {
        console.error("Camera start error:", err);
        setCameraError("عذراً، تعذر تشغيل الكاميرا. قد تكون الصلاحية مرفوضة أو الكاميرا مستخدمة من تطبيق آخر.");
        setIsCameraActive(false);
      }
    }, 100);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error(err));
      }
    };
  }, []);

  // Handle a barcode/QR scan result
  const handlePersonScanned = (id: string) => {
    const person = targetPeople.find(p => p.id === id);
    if (person) {
      setScannedPerson(person);
      
      // Load pre-existing evaluation if any
      const existing = localRecords[person.id];
      if (existing) {
        setEvaluations({
          present: existing.present !== undefined ? existing.present : null,
          absent: existing.absent !== undefined ? existing.absent : null,
          attendedMass: existing.attendedMass !== undefined ? existing.attendedMass : null,
          communion: existing.communion !== undefined ? existing.communion : null,
          prayer: existing.prayer !== undefined ? existing.prayer : null,
          didVisitation: existing.didVisitation !== undefined ? existing.didVisitation : null,
          preparedLesson: existing.preparedLesson !== undefined ? existing.preparedLesson : null,
          notes: existing.notes || ''
        });
      } else {
        setEvaluations({
          present: null,
          absent: null,
          attendedMass: null,
          communion: null,
          prayer: null,
          didVisitation: null,
          preparedLesson: null,
          notes: ''
        });
      }
    } else {
      setCameraError("عذراً، هذا الباركود لا ينتمي لأي شخص مسجل في قطاعك أو في هذا الفصل.");
      setTimeout(() => setCameraError(null), 4000);
    }
  };

  // Enforce mutual exclusivity for present vs absent
  const handleSetEvaluation = (fieldId: keyof Omit<EvaluationState, 'notes'>, val: boolean) => {
    setEvaluations(prev => {
      const next = { ...prev };
      
      if (fieldId === 'present') {
        if (val === true) {
          next.present = true;
          next.absent = false;
        } else {
          next.present = false;
          next.absent = true;
        }
      } else if (fieldId === 'absent') {
        if (val === true) {
          next.absent = true;
          next.present = false;
        } else {
          next.absent = false;
          next.present = true;
        }
      } else {
        next[fieldId] = val;
      }
      
      return next;
    });
  };

  // Save evaluations locally
  const handleSaveLocal = () => {
    if (!scannedPerson) return;

    const record: any = {
      id: scannedPerson.id,
      name: scannedPerson.name,
      type: scannedPerson.type,
      present: evaluations.present === true,
      absent: evaluations.absent === true,
      attendedMass: evaluations.attendedMass === true,
      didVisitation: evaluations.didVisitation === true,
      notes: evaluations.notes,
    };

    if (scannedPerson.type === 'student') {
      record.studentId = scannedPerson.id;
      record.communion = evaluations.communion === true;
      record.prayer = evaluations.prayer === true;
    } else {
      record.servantId = scannedPerson.id;
      record.sectorId = currentUser.sectorId;
      record.preparedLesson = evaluations.preparedLesson === true;
    }

    setLocalRecords(prev => ({
      ...prev,
      [scannedPerson.id]: record
    }));

    setSuccessMessage(`تم حفظ حضور وتقييم ${scannedPerson.name} بنجاح!`);
    setScannedPerson(null);
    setEvaluations({
      present: null,
      absent: null,
      attendedMass: null,
      communion: null,
      prayer: null,
      didVisitation: null,
      preparedLesson: null,
      notes: ''
    });

    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Submit all records to Firebase
  const handleSubmitAll = () => {
    const recordsToSubmit = { ...localRecords };
    const count = Object.keys(recordsToSubmit).length;
    if (count === 0) return;

    onSaveAttendance(date, recordsToSubmit);

    setSuccessMessage(`تم تسليم حضور وتقييم ${count} من الأفراد بنجاح إلى النظام! 🎉`);
    setLocalRecords({});
    
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const scannedPeople = targetPeople.filter(p => localRecords[p.id]);
  const unscannedPeople = targetPeople.filter(p => !localRecords[p.id]);

  // Search filter
  const filteredUnscanned = unscannedPeople.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.className.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Determine fields to render dynamically based on role
  const fieldsToRender = isServant ? [
    { id: 'present' as const, label: 'حضور مدارس الأحد' },
    { id: 'absent' as const, label: 'غياب مدارس الأحد' },
    { id: 'attendedMass' as const, label: 'حضور القداس' },
    { id: 'communion' as const, label: 'تناول' },
    { id: 'prayer' as const, label: 'صلاة' },
    { id: 'didVisitation' as const, label: 'افتقاد' }
  ] : [
    { id: 'present' as const, label: 'حضور مدارس الأحد' },
    { id: 'absent' as const, label: 'غياب' },
    { id: 'attendedMass' as const, label: 'حضور القداس' },
    { id: 'preparedLesson' as const, label: 'تحضير' },
    { id: 'didVisitation' as const, label: 'افتقاد' }
  ];

  return (
    <div className="space-y-6 animate-fade-in" style={{ direction: 'rtl' }}>
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-[-30px] bottom-[-30px] w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-[-20px] top-[-20px] w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10 relative">
          <div className="space-y-2 text-right">
            <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3">
              <Scan className="animate-pulse text-indigo-300" size={32} />
              الماسح الضوئي الذكي
            </h2>
            <p className="text-indigo-100 font-medium text-sm md:text-base leading-relaxed">
              {isServant 
                ? 'قم بمسح الباركود الخاص ببطاقات المخدومين لتسجيل حضورهم ومتابعة الأنشطة.'
                : 'خاص بأمين القطاع: قم بمسح باركود الخدام لتسجيل حضورهم ومتابعة الأنشطة للقطاع.'}
            </p>
          </div>
          
          {/* Active Date Input */}
          <div className="bg-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-md border border-white/20 flex items-center gap-3 w-full md:w-auto text-right">
            <Clock size={18} className="text-indigo-200" />
            <div className="flex-1">
              <div className="text-[10px] text-indigo-200 font-bold mb-0.5">تاريخ الحضور والتقييم</div>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-white font-extrabold outline-none text-sm cursor-pointer w-full text-right text-indigo-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Class Selection for Servants */}
      {isServant && myClasses.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right">
          <div className="space-y-1">
            <h3 className="font-black text-base text-gray-800 dark:text-white">اختر الفصل النشط</h3>
            <p className="text-xs text-gray-500">قم بتحديد الفصل لتسجيل حضور ومتابعة مخدوميه (كل فصل بشكل منفصل).</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setScannedPerson(null);
              }}
              className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-black text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer min-w-[200px]"
            >
              {myClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-4 rounded-2xl flex items-center gap-3 font-bold animate-fade-in shadow-sm text-right">
          <CheckCircle className="text-emerald-600 shrink-0" size={24} />
          <span className="text-sm md:text-base">{successMessage}</span>
        </div>
      )}

      {/* Camera/Scan Error Alert */}
      {cameraError && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-4 rounded-2xl flex items-center gap-3 font-bold animate-fade-in shadow-sm text-right">
          <AlertCircle className="text-amber-600 shrink-0" size={24} />
          <span className="text-sm md:text-base">{cameraError}</span>
        </div>
      )}

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* RIGHT COLUMN: The Scan Area & active Evaluation Card */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tab switching */}
          <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex gap-2">
            <button
              onClick={() => setActiveTab('scan')}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'scan' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <QrCode size={18} />
              <span>بدء المسح والتسجيل</span>
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'list' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Users size={18} />
              <span>مراجعة الكشف ({scannedPeople.length} مسجل)</span>
            </button>
          </div>

          {activeTab === 'scan' ? (
            <>
              {!scannedPerson ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center text-center py-12 space-y-6">
                  {isCameraActive ? (
                    <div className="w-full max-w-md flex flex-col items-center space-y-4">
                      {/* Scanning element - Square Box constraint with high contrast borders */}
                      <div className="relative w-full aspect-square max-w-[280px] md:max-w-[300px] border-4 border-indigo-500 rounded-3xl overflow-hidden bg-black shadow-2xl">
                        <div id={scannerId} className="w-full h-full" />
                        
                        {/* Glowing scan laser line animation */}
                        <div className="absolute left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,1)] animate-bounce z-10 pointer-events-none" style={{ top: '20%' }} />
                        <div className="absolute inset-0 border-2 border-dashed border-white/20 pointer-events-none rounded-2xl m-4" />
                      </div>
                      
                      <button 
                        onClick={stopCamera}
                        className="px-6 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-black rounded-xl transition-colors flex items-center gap-1.5 border border-red-200 dark:border-red-900/40"
                      >
                        <CameraOff size={16} />
                        إيقاف الكاميرا
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-sm">
                      <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto border-2 border-indigo-100 dark:border-indigo-800">
                        <Scan size={36} className="animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-gray-800 dark:text-white text-lg">بانتظار مسح بطاقة</h4>
                        <p className="text-gray-400 text-xs leading-relaxed">
                          اضغط على زر الكاميرا للبدء، أو استخدم البحث السريع بالأسفل لتحديد الشخص المسجل يدوياً.
                        </p>
                      </div>
                      
                      <button 
                        onClick={startCamera}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 mx-auto scale-105 hover:scale-110 active:scale-95"
                      >
                        <Camera size={18} />
                        تشغيل كاميرا الماسح (مربع)
                      </button>
                    </div>
                  )}

                  {/* Manual Fallback & Search Box */}
                  <div className="w-full max-w-md pt-4 border-t border-gray-100 dark:border-slate-700">
                    <div className="relative">
                      <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={isServant ? "بحث سريع باسم المخدوم لتسجيله يدوياً..." : "بحث سريع باسم الخادم لتسجيله يدوياً..."}
                        className="w-full pr-11 pl-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm font-semibold rounded-2xl text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-right"
                      />
                    </div>
                    
                    {/* Search Results */}
                    {searchQuery.trim().length > 0 && (
                      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl mt-2 overflow-hidden shadow-lg max-h-[180px] overflow-y-auto no-scrollbar animate-fade-in text-right">
                        {filteredUnscanned.map(person => (
                          <div 
                            key={person.id}
                            onClick={() => {
                              handlePersonScanned(person.id);
                              setSearchQuery('');
                            }}
                            className="p-3 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border-b border-gray-100 dark:border-slate-800 last:border-none flex justify-between items-center"
                          >
                            <div>
                              <div className="font-extrabold text-sm text-gray-800 dark:text-white">{person.name}</div>
                              <div className="text-[10px] text-gray-500">{person.className} • {person.sectorName}</div>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-1 rounded-lg">اختر لتسجيل</span>
                          </div>
                        ))}
                        {filteredUnscanned.length === 0 && (
                          <div className="p-4 text-center text-gray-400 text-xs">لا توجد نتائج غير مسجلة حالياً</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Person scanned card (Details display + Custom evaluation fields + Notes textarea) */
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden animate-fade-in text-right">
                  
                  {/* Person card header */}
                  <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                        <QrCode size={28} />
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400 font-bold">تم المسح والتعرف على:</div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight mt-0.5">{scannedPerson.name}</h3>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold mt-1">
                          {scannedPerson.className} • {scannedPerson.sectorName}
                        </p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setScannedPerson(null)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Clean evaluations list + notes textarea */}
                  <div className="p-6 space-y-4">
                    <h4 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-2 mb-2 border-b pb-2">
                      <Check className="text-indigo-500" size={16} />
                      تسجيل الحضور وتقييم الأنشطة
                    </h4>
                    
                    <div className="space-y-3">
                      {fieldsToRender.map((field) => {
                        const val = evaluations[field.id as keyof Omit<EvaluationState, 'notes'>];
                        return (
                          <div 
                            key={field.id}
                            className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                              val === true 
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/40 text-emerald-900 dark:text-emerald-100 shadow-sm'
                                : val === false 
                                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-500/40 text-rose-900 dark:text-rose-100 shadow-sm'
                                  : 'bg-gray-50/50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <span className="font-black text-sm md:text-base">{field.label}</span>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSetEvaluation(field.id as keyof Omit<EvaluationState, 'notes'>, true)}
                                className={`px-4 py-2 rounded-xl font-black text-xs md:text-sm transition-all flex items-center gap-1.5 ${
                                  val === true 
                                    ? 'bg-emerald-600 text-white shadow'
                                    : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
                                }`}
                              >
                                <Check size={16} />
                                <span>نعم</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetEvaluation(field.id as keyof Omit<EvaluationState, 'notes'>, false)}
                                className={`px-4 py-2 rounded-xl font-black text-xs md:text-sm transition-all flex items-center gap-1.5 ${
                                  val === false 
                                    ? 'bg-rose-600 text-white shadow'
                                    : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-rose-50 hover:text-rose-600'
                                }`}
                              >
                                <X size={16} />
                                <span>لا</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Notes Box below evaluations */}
                      <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/30 space-y-2 text-right">
                        <label className="block text-sm font-black text-gray-700 dark:text-gray-300">الملاحظات</label>
                        <textarea
                          value={evaluations.notes}
                          onChange={(e) => setEvaluations(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="اكتب أي ملاحظات إضافية هنا..."
                          rows={3}
                          className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-right resize-none"
                        />
                      </div>
                    </div>

                    {/* Bottom Action buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                      <button
                        onClick={handleSaveLocal}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
                      >
                        <Save size={18} />
                        حفظ التقييم والمتابعة
                      </button>
                      <button
                        onClick={() => setScannedPerson(null)}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-all text-sm"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Review and List compiled Tab */
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 space-y-4 text-right">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="font-black text-lg text-gray-800 dark:text-white">الأسماء التي تم مسحها وتقييمها اليوم</h3>
                <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-xs font-black px-3 py-1 rounded-full">
                  {scannedPeople.length} سجل حالياً
                </span>
              </div>

              {scannedPeople.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm font-medium space-y-2">
                  <Info className="mx-auto text-gray-300" size={32} />
                  <div>لا يوجد أي اسم تم مسحه أو حفظه في الذاكرة المؤقتة بعد.</div>
                  <p className="text-xs text-gray-500">ابدأ بمسح البطاقات أو البحث عنها وتأكيد التقييمات أولاً.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-700/60 max-h-[400px] overflow-y-auto no-scrollbar">
                  {scannedPeople.map((person) => {
                    const rec = localRecords[person.id];
                    return (
                      <div key={person.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                        <div>
                          <h4 className="font-black text-sm text-gray-800 dark:text-white">{person.name}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {person.className} • {person.sectorName}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {isServant ? (
                            [
                              { key: 'present', label: 'م' },
                              { key: 'absent', label: 'غ' },
                              { key: 'attendedMass', label: 'ق' },
                              { key: 'communion', label: 'ت' },
                              { key: 'prayer', label: 'ص' },
                              { key: 'didVisitation', label: 'ا' }
                            ].map(badge => {
                              const optVal = rec[badge.key];
                              return (
                                <span 
                                  key={badge.key}
                                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shadow-inner ${
                                    optVal === true 
                                      ? 'bg-emerald-500 text-white' 
                                      : optVal === false 
                                        ? 'bg-rose-500 text-white' 
                                        : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                                  }`}
                                  title={badge.key}
                                >
                                  {badge.label}
                                </span>
                              );
                            })
                          ) : (
                            [
                              { key: 'present', label: 'م' },
                              { key: 'absent', label: 'غ' },
                              { key: 'attendedMass', label: 'ق' },
                              { key: 'preparedLesson', label: 'تح' },
                              { key: 'didVisitation', label: 'ا' }
                            ].map(badge => {
                              const optVal = rec[badge.key];
                              return (
                                <span 
                                  key={badge.key}
                                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shadow-inner ${
                                    optVal === true 
                                      ? 'bg-emerald-500 text-white' 
                                      : optVal === false 
                                        ? 'bg-rose-500 text-white' 
                                        : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                                  }`}
                                  title={badge.key}
                                >
                                  {badge.label}
                                </span>
                              );
                            })
                          )}
                          
                          {rec.notes && (
                            <span className="text-gray-400 dark:text-gray-300 ml-1" title={rec.notes}>
                              📝
                            </span>
                          )}
                          
                          <button
                            onClick={() => {
                              handlePersonScanned(person.id);
                              setActiveTab('scan');
                            }}
                            className="mr-3 px-2.5 py-1.5 bg-gray-100 hover:bg-indigo-50 text-indigo-600 dark:bg-slate-700 dark:text-indigo-400 dark:hover:bg-slate-600 text-xs font-bold rounded-lg transition-all"
                          >
                            تعديل
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Bottom Complete System Submit Button */}
          {scannedPeople.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in text-right">
              <div>
                <h4 className="font-extrabold text-lg flex items-center gap-2">
                  <CheckCircle />
                  هل انتهيت من تسجيل ومسح جميع البطاقات؟
                </h4>
                <p className="text-emerald-100 text-xs mt-1">
                  الآن يمكنك تسليم وحفظ كل البيانات المؤكدة لتسجيلها في النظام بشكل نهائي.
                </p>
              </div>
              <button
                onClick={handleSubmitAll}
                className="w-full sm:w-auto px-8 py-3 bg-white text-emerald-700 hover:bg-emerald-50 font-black rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 shrink-0 border border-white/20 active:scale-95"
              >
                <Send size={18} />
                تأكيد وتسليم الكشف بالكامل
              </button>
            </div>
          )}
        </div>

        {/* LEFT COLUMN: WHO IS SCANNED & NOT SCANNED TABS */}
        <div className="lg:col-span-4 space-y-6 text-right">
          
          {/* Status card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
            <h3 className="font-black text-sm text-gray-800 dark:text-white border-b pb-2 flex items-center gap-2">
              <Users size={18} className="text-indigo-600" />
              قائمة المتابعة والحالة العامة
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setListFilter('scanned')}
                className={`py-2.5 text-xs font-black rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                  listFilter === 'scanned'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <UserCheck size={18} />
                <span>من تم مسحهم ({scannedPeople.length})</span>
              </button>
              
              <button
                onClick={() => setListFilter('unscanned')}
                className={`py-2.5 text-xs font-black rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                  listFilter === 'unscanned'
                    ? 'bg-rose-50/10 border-rose-500 text-rose-700 dark:text-rose-400 font-bold'
                    : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <UserX size={18} />
                <span>من لم يتم مسحهم ({unscannedPeople.length})</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto no-scrollbar pt-2">
              {listFilter === 'scanned' ? (
                scannedPeople.map(p => (
                  <div key={p.id} className="p-3 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-xs text-gray-800 dark:text-white">{p.name}</div>
                      <div className="text-[10px] text-gray-400">{p.className}</div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                      <Check size={10} />
                      جاهز
                    </span>
                  </div>
                ))
              ) : (
                unscannedPeople.map(p => (
                  <div key={p.id} className="p-3 bg-rose-50/20 dark:bg-rose-950/10 border border-rose-500/10 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-xs text-gray-800 dark:text-white">{p.name}</div>
                      <div className="text-[10px] text-gray-400">{p.className}</div>
                    </div>
                    
                    <button
                      onClick={() => handlePersonScanned(p.id)}
                      className="text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 px-2.5 py-1 rounded-lg transition-colors border border-indigo-200/40 dark:border-indigo-900/40"
                    >
                      تسجيل سريع
                    </button>
                  </div>
                ))
              )}

              {listFilter === 'scanned' && scannedPeople.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-xs font-semibold">لم يتم مسح أي اسم بعد.</div>
              )}
              {listFilter === 'unscanned' && unscannedPeople.length === 0 && (
                <div className="text-center py-8 text-emerald-600 text-xs font-extrabold">رائع! لقد قمت بمسح جميع الأسماء بالكامل! 🎉</div>
              )}
            </div>
          </div>

          {/* Quick Guide / Help Info Card */}
          <div className="bg-gray-50 dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 space-y-3">
            <h4 className="font-black text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
              <HelpCircle size={14} className="text-indigo-500" />
              تعليمات التشغيل السريع والرموز
            </h4>
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2 leading-relaxed">
              <ul className="list-disc list-inside space-y-1.5 pr-2">
                <li>افتح الكاميرا ووجّهها نحو باركود بطاقة الهوية.</li>
                <li>سيتم التعرف فوراً على الفرد وعرض بنود حضور مدارس الأحد والقداس والتقييمات المطلوبة ومربع الملاحظات.</li>
                <li>اختر (نعم) أو (لا) لكل بند، واكتب ملاحظاتك إن وجدت، ثم اضغط على <b>حفظ التقييم والمتابعة</b>.</li>
                <li>عند الانتهاء تماماً، اضغط على <b>تأكيد وتسليم الكشف بالكامل</b> لحفظ البيانات نهائياً.</li>
              </ul>
              <div className="border-t pt-2 mt-2 space-y-1 font-bold">
                <div>دلالة الرموز في المراجعة:</div>
                <div className="grid grid-cols-2 gap-1 text-[11px] mt-1 text-gray-600 dark:text-gray-400">
                  <div><b>(م)</b> : حضور مدارس الأحد</div>
                  <div><b>(غ)</b> : غياب</div>
                  <div><b>(ق)</b> : حضور القداس</div>
                  {isServant ? (
                    <>
                      <div><b>(ت)</b> : تناول الأسرار</div>
                      <div><b>(ص)</b> : الصلاة اليومية</div>
                    </>
                  ) : (
                    <div><b>(تح)</b> : تحضير الدرس</div>
                  )}
                  <div><b>(ا)</b> : الافتقاد والمتابعة</div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
