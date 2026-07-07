import React, { useState, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { Student, Sector, ClassGroup, User, UserRole } from '../types';
import { downloadOrShareFile } from './downloadHelper';
import { 
  CreditCard, 
  Printer, 
  UserPlus, 
  ChevronRight, 
  Sparkles, 
  Phone, 
  User as UserIcon, 
  Church, 
  Layers, 
  Search, 
  Edit, 
  Trash, 
  Check, 
  X,
  FileDown,
  Loader2
} from 'lucide-react';

const getDeterministicHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const SECTOR_GRADIENTS = [
  {
    gradient: 'from-slate-900 via-indigo-950/90 to-slate-900',
    accent: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    textName: 'text-indigo-300',
    badgeStyle: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    servantGradient: 'from-indigo-950 via-slate-900 to-amber-950',
    servantAccent: 'text-amber-400 border-amber-400/30 bg-amber-400/10'
  },
  {
    gradient: 'from-slate-900 via-emerald-950/90 to-slate-900',
    accent: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    textName: 'text-emerald-300',
    badgeStyle: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    servantGradient: 'from-emerald-950 via-slate-900 to-amber-950',
    servantAccent: 'text-amber-400 border-amber-400/30 bg-amber-400/10'
  },
  {
    gradient: 'from-slate-900 via-violet-950/90 to-slate-900',
    accent: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
    textName: 'text-violet-300',
    badgeStyle: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    servantGradient: 'from-violet-950 via-slate-900 to-amber-950',
    servantAccent: 'text-amber-400 border-amber-400/30 bg-amber-400/10'
  },
  {
    gradient: 'from-slate-900 via-rose-950/90 to-slate-900',
    accent: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    textName: 'text-rose-300',
    badgeStyle: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    servantGradient: 'from-rose-950 via-slate-900 to-amber-950',
    servantAccent: 'text-amber-400 border-amber-400/30 bg-amber-400/10'
  },
  {
    gradient: 'from-slate-900 via-cyan-950/90 to-slate-900',
    accent: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    textName: 'text-cyan-300',
    badgeStyle: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    servantGradient: 'from-cyan-950 via-slate-900 to-amber-950',
    servantAccent: 'text-amber-400 border-amber-400/30 bg-amber-400/10'
  },
  {
    gradient: 'from-slate-900 via-teal-950/90 to-slate-900',
    accent: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
    textName: 'text-teal-300',
    badgeStyle: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    servantGradient: 'from-teal-950 via-slate-900 to-amber-950',
    servantAccent: 'text-amber-400 border-amber-400/30 bg-amber-400/10'
  },
  {
    gradient: 'from-slate-900 via-purple-950/90 to-slate-900',
    accent: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    textName: 'text-purple-300',
    badgeStyle: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    servantGradient: 'from-purple-950 via-slate-900 to-amber-950',
    servantAccent: 'text-amber-400 border-amber-400/30 bg-amber-400/10'
  },
  {
    gradient: 'from-slate-900 via-blue-950/90 to-slate-900',
    accent: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    textName: 'text-blue-300',
    badgeStyle: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    servantGradient: 'from-blue-950 via-slate-900 to-amber-950',
    servantAccent: 'text-amber-400 border-amber-400/30 bg-amber-400/10'
  }
];

export const getCardTheme = (sectorId: string, classId: string, type: 'student' | 'servant') => {
  const sectorHash = getDeterministicHash(sectorId || 'default-sector');
  const classHash = getDeterministicHash(classId || 'default-class');
  
  const sectorIndex = sectorHash % SECTOR_GRADIENTS.length;
  const classIndex = classHash % SECTOR_GRADIENTS.length;
  const baseTheme = SECTOR_GRADIENTS[sectorIndex];
  
  if (type === 'servant') {
    // Distinct glowing borders per sector for servants
    const goldBorders = [
      'border-amber-400/60 shadow-lg shadow-amber-500/20',
      'border-emerald-400/60 shadow-lg shadow-emerald-500/20',
      'border-violet-400/60 shadow-lg shadow-violet-500/20',
      'border-rose-400/60 shadow-lg shadow-rose-500/20',
      'border-cyan-400/60 shadow-lg shadow-cyan-500/20',
      'border-teal-400/60 shadow-lg shadow-teal-500/20',
      'border-purple-400/60 shadow-lg shadow-purple-500/20',
      'border-blue-400/60 shadow-lg shadow-blue-500/20'
    ];
    
    return {
      gradient: baseTheme.servantGradient,
      accent: baseTheme.servantAccent,
      textName: 'text-amber-300 font-extrabold',
      border: goldBorders[sectorIndex],
      badgeStyle: 'bg-amber-500/20 text-amber-300 border border-amber-400/40 font-black animate-pulse',
      typeLabel: 'بطاقة خادم',
      qrFg: '#1e1b4b'
    };
  } else {
    // Offsetting graduates per classId so distinct classes are immediately distinguishable!
    const combinedIndex = (sectorIndex + classIndex) % SECTOR_GRADIENTS.length;
    const finalTheme = SECTOR_GRADIENTS[combinedIndex];
    
    return {
      gradient: finalTheme.gradient,
      accent: finalTheme.accent,
      textName: finalTheme.textName,
      border: 'border-slate-800 shadow-md',
      badgeStyle: finalTheme.badgeStyle,
      typeLabel: 'بطاقة مخدوم',
      qrFg: '#0f172a'
    };
  }
};

interface CardGeneratorProps {
  students: Student[];
  sectors: Sector[];
  classes: ClassGroup[];
  users: User[];
}

export const CardGenerator: React.FC<CardGeneratorProps> = ({ 
  students, 
  sectors, 
  classes,
  users 
}) => {
  // States
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  
  // Generated cards list (supports manual edits before print/download)
  const [generatedCards, setGeneratedCards] = useState<any[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  
  // Single card editing
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [downloadingCardId, setDownloadingCardId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    sectorName: '',
    className: '',
    phone: '',
  });

  // Filter classes based on selected sector
  const filteredClasses = useMemo(() => {
    if (!selectedSectorId) return [];
    return classes.filter(c => c.sectorId === selectedSectorId);
  }, [classes, selectedSectorId]);

  // Handle Sector Change (reset class selection)
  const handleSectorChange = (sectorId: string) => {
    setSelectedSectorId(sectorId);
    setSelectedClassId('');
    setIsGenerated(false);
  };

  // Generate cards for the entire selected class (Students)
  const handleGenerateStudentCards = () => {
    if (!selectedSectorId || !selectedClassId) return;

    const sector = sectors.find(s => s.id === selectedSectorId);
    const classGroup = classes.find(c => c.id === selectedClassId);
    
    if (!sector || !classGroup) return;

    // Get all students in the selected class
    const classStudents = students.filter(s => s.classId === selectedClassId);

    // Format students into card data
    const cards = classStudents.map(student => ({
      id: student.id,
      name: student.name,
      sectorId: sector.id,
      classId: classGroup.id,
      sectorName: sector.name,
      className: classGroup.name,
      phone: student.phone || '',
      type: 'student' as 'student' | 'servant',
    }));

    setGeneratedCards(cards);
    setIsGenerated(true);
  };

  // Generate cards for the Servants
  const handleGenerateServantCards = () => {
    if (!selectedSectorId) return;

    const sector = sectors.find(s => s.id === selectedSectorId);
    if (!sector) return;

    let sectorServants: User[] = [];

    if (selectedClassId) {
      const classGroup = classes.find(c => c.id === selectedClassId);
      if (classGroup) {
        // Get servants assigned to this class
        sectorServants = users.filter(u => 
          (u.role === UserRole.SERVANT || u.role === UserRole.SECTOR_SECRETARY) &&
          (classGroup.servantIds?.includes(u.id) || u.classId === selectedClassId)
        );
      }
    }

    // Fallback/Default: Get all servants in this sector if none in class or no class selected
    if (sectorServants.length === 0) {
      sectorServants = users.filter(u => 
        (u.role === UserRole.SERVANT || u.role === UserRole.SECTOR_SECRETARY) &&
        (u.sectorId === selectedSectorId || u.sectorIds?.includes(selectedSectorId))
      );
    }

    const cards = sectorServants.map(servant => {
      const servantClass = classes.find(c => c.servantIds?.includes(servant.id) || servant.classId === c.id);
      return {
        id: servant.id,
        name: servant.name,
        sectorId: sector.id,
        classId: servantClass?.id || '',
        sectorName: sector.name,
        className: servant.role === UserRole.SECTOR_SECRETARY ? 'أمين القطاع' : (servantClass ? servantClass.name : 'خادم بالقطاع'),
        phone: servant.phone || '',
        type: 'servant' as 'student' | 'servant',
        role: servant.role,
      };
    });

    setGeneratedCards(cards);
    setIsGenerated(true);
  };

  // Edit Card Handlers
  const startEditing = (card: any) => {
    setEditingCardId(card.id);
    setEditFormData({
      name: card.name,
      sectorName: card.sectorName,
      className: card.className,
      phone: card.phone,
    });
  };

  const saveEdit = (id: string) => {
    setGeneratedCards(prev => prev.map(card => {
      if (card.id === id) {
        return {
          ...card,
          name: editFormData.name,
          sectorName: editFormData.sectorName,
          className: editFormData.className,
          phone: editFormData.phone,
        };
      }
      return card;
    }));
    setEditingCardId(null);
  };

  const cancelEdit = () => {
    setEditingCardId(null);
  };

  const deleteCard = (id: string) => {
    setGeneratedCards(prev => prev.filter(card => card.id !== id));
  };

  const handleDownloadPNG = async (cardId: string, studentName: string) => {
    const cardEl = document.getElementById(`card-design-${cardId}`);
    if (!cardEl) return;
    
    setDownloadingCardId(cardId);
    try {
      // Short delay for standard layout stability
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const dataUrl = await toPng(cardEl, {
        cacheBust: true,
        backgroundColor: 'transparent',
        style: {
          borderRadius: '12px',
        },
        pixelRatio: 3, // High DPI resolution (3x scale) for professional quality
      });
      
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await downloadOrShareFile(blob, `بطاقة_هوية_${studentName.replace(/\s+/g, '_')}.png`);
    } catch (error) {
      console.error('Error generating card image:', error);
    } finally {
      setDownloadingCardId(null);
    }
  };

  // Print cards action
  const handlePrint = () => {
    window.print();
  };

  // Export all cards in a compressed ZIP file
  const handleExportZIP = async () => {
    if (generatedCards.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      // We will loop and generate PNG for each card
      for (const card of generatedCards) {
        const cardEl = document.getElementById(`card-design-${card.id}`);
        if (!cardEl) continue;
        
        // wait to allow layout stability
        await new Promise(resolve => setTimeout(resolve, 80));
        
        const dataUrl = await toPng(cardEl, {
          cacheBust: true,
          backgroundColor: 'transparent',
          style: {
            borderRadius: '12px',
          },
          pixelRatio: 3, // High resolution PNG
        });
        
        const base64Data = dataUrl.split(',')[1];
        const fileName = `بطاقة_${card.name.replace(/\s+/g, '_')}.png`;
        zip.file(fileName, base64Data, { base64: true });
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const sector = sectors.find(s => s.id === selectedSectorId);
      const classGroup = classes.find(c => c.id === selectedClassId);
      
      let zipName = 'بطاقات_الهوية';
      if (sector) {
        zipName += `_${sector.name.replace(/\s+/g, '_')}`;
      }
      if (classGroup) {
        zipName += `_${classGroup.name.replace(/\s+/g, '_')}`;
      }
      
      await downloadOrShareFile(content, `${zipName}.zip`);
    } catch (error) {
      console.error('Error generating ZIP:', error);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
            <CreditCard size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">توليد بطاقات الهوية الذكية</h2>
            <p className="text-xs text-gray-500 mt-1">توليد وتصميم بطاقات الهوية الذكية مع رمز QR للمخدمين والخدام للفصول والقطاعات</p>
          </div>
        </div>
        
        {/* Trigger Button: إضافة خادم */}
        <button 
          onClick={() => setIsPanelVisible(!isPanelVisible)}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow transition-all duration-300 ${
            isPanelVisible 
              ? 'bg-amber-500 hover:bg-amber-600 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/20'
          }`}
          id="btn-toggle-control-panel"
        >
          <UserPlus size={18} />
          <span>{isPanelVisible ? 'إخفاء لوحة التحكم' : 'إضافة خادم / توليد بطاقات'}</span>
        </button>
      </div>

      {/* Conditionally Rendered Control Panel (لوحة التحكم) */}
      {isPanelVisible && (
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 p-6 rounded-2xl border border-indigo-50 dark:border-slate-700 shadow-md space-y-6 animate-fade-in-up">
          <div className="flex items-center gap-2 border-b dark:border-slate-700 pb-3">
            <Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h3 className="font-bold text-gray-800 dark:text-white">لوحة تحديد الفصل والقطاع</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sector Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Church size={16} className="text-indigo-500" />
                اختر القطاع:
              </label>
              <select 
                value={selectedSectorId}
                onChange={(e) => handleSectorChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer font-medium"
              >
                <option value="">-- اختر القطاع --</option>
                {sectors.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Class Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Layers size={16} className="text-indigo-500" />
                اختر الفصل:
              </label>
              <select 
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setIsGenerated(false);
                }}
                disabled={!selectedSectorId}
                className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- اختر الفصل --</option>
                {filteredClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button 
              onClick={handleGenerateServantCards}
              disabled={!selectedSectorId}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white font-black rounded-xl transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
              id="btn-generate-servant-cards"
            >
              <Sparkles size={18} />
              توليد بطاقات الخدام
            </button>
            <button 
              onClick={handleGenerateStudentCards}
              disabled={!selectedSectorId || !selectedClassId}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white font-black rounded-xl transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
              id="btn-generate-student-cards"
            >
              <Sparkles size={18} />
              توليد بطاقات المخدومين (الفصل)
            </button>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {isGenerated && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">معاينة بطاقات الفصل ({generatedCards.length} بطاقة)</h3>
              <p className="text-xs text-gray-400 mt-1">تظهر هنا البطاقات بعد ملء البيانات تلقائياً. يمكنك تعديل أو حذف أي بطاقة قبل الطباعة.</p>
            </div>
            
            <button 
              onClick={handleExportZIP}
              disabled={generatedCards.length === 0 || isZipping}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow"
              id="btn-export-zip-cards"
            >
              {isZipping ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <FileDown size={18} />
              )}
              <span>{isZipping ? 'جاري ضغط الملفات...' : 'تصدير مضغوط (ZIP)'}</span>
            </button>
          </div>

          {generatedCards.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 text-gray-400 italic">
              <UserIcon size={48} className="mx-auto mb-3 opacity-25" />
              لا يوجد مخدومين مسجلين في هذا الفصل لتوليد بطاقات لهم.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedCards.map((card, index) => {
                const isEditing = editingCardId === card.id;
                const theme = getCardTheme(card.sectorId, card.classId, card.type);
                
                return (
                  <div 
                    key={card.id} 
                    className="relative bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 hover:shadow-md transition-all flex flex-col group/card"
                    id={`card-container-${card.id}`}
                  >
                    {/* Action buttons (hidden in print view) */}
                    <div className="absolute top-2 left-2 flex gap-1 print:hidden opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity z-10">
                      {isEditing ? (
                        <>
                          <button 
                            onClick={() => saveEdit(card.id)}
                            className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            title="حفظ"
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            onClick={cancelEdit}
                            className="p-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            title="إلغاء"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleDownloadPNG(card.id, card.name)}
                            disabled={downloadingCardId === card.id}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-emerald-800 disabled:opacity-50 transition-colors flex items-center justify-center"
                            title="تحميل PNG"
                            id={`btn-download-png-${card.id}`}
                          >
                            {downloadingCardId === card.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <FileDown size={14} />
                            )}
                          </button>
                          <button 
                            onClick={() => startEditing(card)}
                            className="p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                            title="تعديل البيانات"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => deleteCard(card.id)}
                            className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            title="حذف"
                          >
                            <Trash size={14} />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Card Inner Printable Design */}
                    <div 
                      id={`card-design-${card.id}`}
                      className={`bg-gradient-to-br ${theme.gradient} text-white rounded-xl p-4 flex flex-col justify-between h-[210px] relative overflow-hidden ${theme.border}`}
                      style={{ direction: 'rtl' }}
                    >
                      {/* Decorative Background Badges */}
                      <div className="absolute right-[-20px] bottom-[-20px] w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="absolute left-[-20px] top-[-20px] w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none" />

                      {/* Card Header */}
                      <div className="flex justify-between items-center border-b border-white/10 pb-2 z-10">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 bg-white/10 rounded-lg text-amber-400">
                            <Church size={14} />
                          </div>
                          <div>
                            <span className="text-[8.5px] font-black tracking-tight text-slate-300 block">كنائس الأمراء بداقوف</span>
                            <span className="text-[8px] font-bold text-slate-400 block mt-[-2px]">مدارس الأحد</span>
                          </div>
                        </div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${theme.badgeStyle}`}>
                          {theme.typeLabel}
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="flex gap-3 my-auto items-center z-10">
                        {/* Details (Placed first so it displays on the right under RTL) */}
                        <div className="flex-1 min-w-0 space-y-1 text-right">
                          {isEditing ? (
                            <div className="space-y-1 print:hidden">
                              <input 
                                type="text" 
                                value={editFormData.name}
                                onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                                className="w-full text-[10px] bg-slate-800 text-white border border-slate-700 rounded px-1.5 py-0.5"
                                placeholder="الاسم"
                              />
                              <input 
                                type="text" 
                                value={editFormData.sectorName}
                                onChange={e => setEditFormData({...editFormData, sectorName: e.target.value})}
                                className="w-full text-[10px] bg-slate-800 text-white border border-slate-700 rounded px-1.5 py-0.5"
                                placeholder="القطاع"
                              />
                              <input 
                                type="text" 
                                value={editFormData.className}
                                onChange={e => setEditFormData({...editFormData, className: e.target.value})}
                                className="w-full text-[10px] bg-slate-800 text-white border border-slate-700 rounded px-1.5 py-0.5"
                                placeholder="الفصل"
                              />
                              <input 
                                type="text" 
                                value={editFormData.phone}
                                onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                                className="w-full text-[10px] bg-slate-800 text-white border border-slate-700 rounded px-1.5 py-0.5"
                                placeholder="رقم الهاتف"
                              />
                            </div>
                          ) : (
                            <>
                              <h4 className={`font-extrabold text-[13px] truncate leading-tight ${theme.textName}`}>
                                {card.name}
                              </h4>
                              
                              <div className="space-y-0.5 pt-0.5">
                                <div className="text-[9px] text-slate-300 flex items-center gap-1">
                                  <span className="font-bold text-slate-400">القطاع:</span>
                                  <span className="font-extrabold truncate">{card.sectorName}</span>
                                </div>
                                <div className="text-[9px] text-slate-300 flex items-center gap-1">
                                  <span className="font-bold text-slate-400">الفصل:</span>
                                  <span className="font-extrabold truncate">{card.className}</span>
                                </div>
                                <div className="text-[9px] text-slate-300 flex items-center gap-1">
                                  <span className="font-bold text-slate-400">الهاتف:</span>
                                  {card.phone ? (
                                    <span className="font-mono text-[9px] font-bold text-emerald-400">{card.phone}</span>
                                  ) : (
                                    <span className="text-slate-500 italic text-[8px]">غير مسجل</span>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* QR Code (Placed second so it displays on the left under RTL) */}
                        <div className="bg-white p-1.5 rounded-lg shrink-0 shadow-inner flex items-center justify-center border border-white/20">
                          <QRCodeSVG 
                            value={card.id} 
                            size={72} 
                            level="M" 
                            fgColor={theme.qrFg} 
                            bgColor="#ffffff"
                          />
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="flex justify-between items-center border-t border-white/5 pt-1.5 text-[8px] text-slate-400 font-medium z-10">
                        <span className="tracking-wider">كود رقمي مشفر</span>
                        <span className="animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          نظام هوية ذكية
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Printable Area Styling (Injected to only format print output beautifully) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background-color: transparent !important;
          }
          /* Show only generated cards */
          #print-area-wrapper, #print-area-wrapper * {
            visibility: visible;
          }
          #print-area-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            direction: rtl;
          }
          .print\\:hidden {
            display: none !important;
          }
          /* A4 Grid layout for cards */
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 15px !important;
            padding: 10px !important;
          }
          .print-card-box {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1px solid #312e81 !important;
            border-radius: 12px !important;
            overflow: hidden;
          }
        }
      `}</style>

      {/* Hidden container formatted specifically for printing */}
      <div id="print-area-wrapper" className="hidden print:block">
        <div className="p-4 text-center border-b-2 border-slate-800 pb-2 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">بطاقات الهوية الذكية لمدارس الأحد</h1>
          <p className="text-xs text-slate-500 mt-1">
            القطاع: {sectors.find(s => s.id === selectedSectorId)?.name || 'كل القطاعات'}
          </p>
        </div>
        <div className="print-grid grid grid-cols-2 gap-4">
          {generatedCards.map(card => {
            const theme = getCardTheme(card.sectorId, card.classId, card.type);
            return (
              <div 
                key={card.id} 
                className={`print-card-box bg-gradient-to-br ${theme.gradient} text-white p-4 flex flex-col justify-between h-[200px] relative overflow-hidden`}
                style={{ direction: 'rtl', border: '1px solid #1e1b4b', borderRadius: '12px', boxSizing: 'border-box' }}
              >
                {/* Header */}
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-[8.5px] font-black tracking-tight text-slate-300">كنائس الأمراء بداقوف</span>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full border ${theme.badgeStyle}`}>{theme.typeLabel}</span>
                </div>

                {/* Body */}
                <div className="flex gap-4 my-auto items-center">
                  {/* Details (Placed first so it displays on the right under RTL) */}
                  <div className="flex-1 text-right space-y-1">
                    <h4 className={`font-extrabold text-[12px] truncate ${theme.textName}`}>{card.name}</h4>
                    <div className="text-[8px] text-slate-300 space-y-0.5">
                      <div><span className="text-slate-400 font-bold">القطاع:</span> {card.sectorName}</div>
                      <div><span className="text-slate-400 font-bold">الفصل:</span> {card.className}</div>
                      <div>
                        <span className="text-slate-400 font-bold">الهاتف:</span>{' '}
                        <span className="font-mono">{card.phone || 'غير مسجل'}</span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code (Placed second so it displays on the left under RTL) */}
                  <div className="bg-white p-1 rounded">
                    <QRCodeSVG value={card.id} size={70} fgColor={theme.qrFg} bgColor="#ffffff" />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center border-t border-white/5 pt-1 text-[8px] text-slate-400">
                  <span>كود رقمي مشفر</span>
                  <span>نظام هوية ذكية</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
