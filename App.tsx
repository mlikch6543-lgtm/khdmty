

import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { DashboardHome, SectorManagement, SectorServantsView, ClassManagement, ServantsDirectory, UserManagement, PreparationsAdminView } from './components/AdminViews';
import { AttendanceView, OccasionsView, PreparationView } from './components/ServantViews';
import { ServantRequestsView, SecretaryRequestsView, AdminRequestsView } from './components/RequestsViews';
import { CardGenerator } from './components/CardGenerator';
import { ScannerView } from './components/ScannerView';
import { User, Student, Sector, ClassGroup, UserRole, AppNotification, Occasion, OccasionPayment, LessonPreparation, PreparationComment, RequestMessage } from './types';
import { Clock, ShieldAlert, RefreshCw, AlertCircle, Layers, Church, ChevronLeft, ArrowRight, User as UserIcon, Users, Gift, UserCheck, BookOpen } from 'lucide-react';
import { subscribeToData, signIn, addData, updateData, deleteData, db, auth } from './services/firebase';
import { ref, onValue } from 'firebase/database';
import { 
  sendTelegramReport, 
  sendSignupNotification, 
  sendPreparationNotification, 
  sendSectorAttendanceNotification 
} from './services/telegramBot';

const PendingAssignmentView = ({ onLogout }: { onLogout: () => void }) => (
  <div className="min-h-screen bg-indigo-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
    <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-8 border border-indigo-100 dark:border-indigo-900/20 animate-fade-in">
      <div className="mx-auto w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 animate-bounce">
        <Clock size={48} />
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">أهلاً بك في خدمتي</h2>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium text-lg">
          حسابك مفعل بنجاح، ولكنك بانتظار "أمين الخدمة" ليقوم بتحديد فصلك أو قطاعك.
        </p>
      </div>
      <button 
        onClick={onLogout}
        className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-black rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all border border-gray-200 dark:border-slate-700"
      >
        تسجيل خروج
      </button>
    </div>
  </div>
);

const AccountDeletedView = ({ onBackToLogin }: { onBackToLogin: () => void }) => (
  <div className="min-h-screen bg-red-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
    <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-8 border border-red-100 dark:border-red-900/20 animate-fade-in">
      <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red600">
        <ShieldAlert size={48} />
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">عذراً، تم حذف الحساب</h2>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium text-lg">
          يبدو أنه تم إزالة حسابك من قبل المسؤول. يرجى مراجعة أمين الخدمة العام.
        </p>
      </div>
      <button 
        onClick={onBackToLogin}
        className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-black rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all border border-gray-200 dark:border-slate-700"
      >
        العودة لشاشة الدخول
      </button>
    </div>
  </div>
);

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('khedmaty_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activePage, setActivePage] = useState<string>(() => {
    return localStorage.getItem('khedmaty_active_page') || 'dashboard';
  });

  const [sectorAttendanceClassId, setSectorAttendanceClassId] = useState<string | null>(null);
  const [sectorOccasionsClassId, setSectorOccasionsClassId] = useState<string | null>(null);

  const [isAccountDeleted, setIsAccountDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, any>>({}); 
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [occasionPayments, setOccasionPayments] = useState<Record<string, Record<string, OccasionPayment>>>({});
  const [preparations, setPreparations] = useState<LessonPreparation[]>([]);
  const [requestsData, setRequestsData] = useState<Record<string, any>>({}); // New state for requests

    const notifyAdminOfActivity = async (title: string, message: string, type: any, sectorId?: string) => {
    const notifId = `notif_${Date.now()}`;
    const newNotif: AppNotification = {
      id: notifId,
      title,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
      type: (['attendance_saved', 'user_signup', 'user_login', 'preparation_sent', 'student_added', 'class_added'].includes(type) ? type : 'system') as any
    };

    if (sectorId) {
      newNotif.sectorId = sectorId;
    }
    
    try {
      await addData(`notifications/${notifId}`, newNotif);
    } catch (e) { 
      console.error("Notif DB Error:", e); 
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const startService = async () => {
        try {
            setIsLoading(true);
            setPermissionError(null);
            await signIn();
            
            unsubscribe = subscribeToData(
              (data, isEssentialLoaded) => {
                setUsers(data.users || []);
                setSectors(data.sectors || []);
                setClasses(data.classes || []);
                setStudents(data.students || []);
                setAttendance(data.attendance || {});
                setNotifications(data.notifications || []);
                setOccasions(data.occasions || []);
                setOccasionPayments(data.occasion_payments || {});
                setPreparations(data.preparations || []);
                setRequestsData(data.requests || {}); // Load requests

                if (isEssentialLoaded) setIsLoading(false);
              },
              (error: any) => {
                if (error.message.includes("permission_denied")) setPermissionError("تنبيه أمان: تم رفض الوصول لقاعدة البيانات.");
                setIsLoading(false);
              }
            );
        } catch (err) {
            setIsLoading(false);
        }
    };

    startService();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!currentUser?.id || currentUser.id === 'master_admin') return;
    const userRef = ref(db, `users/${currentUser.id}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (!snapshot.exists()) {
        if (!currentUser.id.startsWith('master_')) {
            handleLogoutInternal();
            setIsAccountDeleted(true);
        }
      } else {
        const updatedData = { ...snapshot.val(), id: currentUser.id };
        // We do not want to automatically overwrite the sectorId if the user is switching context,
        // unless the user was removed from that sector.
        // We'll leave sectorId management to the switching logic mostly.
        
        // Only update if critical data changed to avoid resetting view state
        if (updatedData.role !== currentUser.role || updatedData.name !== currentUser.name) {
          setCurrentUser(prev => ({ ...updatedData, sectorId: prev?.sectorId || updatedData.sectorId }));
          localStorage.setItem('khedmaty_user', JSON.stringify({ ...updatedData, sectorId: currentUser.sectorId }));
        }
      }
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    const adminPages = ['dashboard', 'requests', 'users', 'sectors', 'classes', 'all-servants', 'preparations-admin', 'cards'];
    const secretaryPages = ['dashboard', 'my-sector', 'requests', 'sector-occasions', 'servant-attendance', 'sector-preparations', 'sector-student-attendance', 'scanner'];
    const servantPages = ['dashboard', 'attendance', 'requests', 'preparation', 'occasions', 'scanner'];
    let isAllowed = true;
    if (currentUser.role === UserRole.ADMIN) isAllowed = adminPages.includes(activePage);
    else if (currentUser.role === UserRole.SECTOR_SECRETARY) isAllowed = secretaryPages.includes(activePage);
    else if (currentUser.role === UserRole.SERVANT) isAllowed = servantPages.includes(activePage);
    if (!isAllowed) {
      setActivePage(currentUser.role === UserRole.ADMIN ? 'dashboard' : currentUser.role === UserRole.SECTOR_SECRETARY ? 'dashboard' : 'dashboard');
    }
    setSectorAttendanceClassId(null);
    setSectorOccasionsClassId(null);
  }, [currentUser?.role, activePage]);

  const handleLogoutInternal = async () => {
    setCurrentUser(null);
    localStorage.removeItem('khedmaty_user');
    localStorage.removeItem('khedmaty_active_page');
    try {
        await auth.signOut();
        // Re-initialize anonymous session for next user
        await signIn();
    } catch (e) {
        console.error("Logout Error:", e);
    }
  };

  const handleLogout = () => {
    handleLogoutInternal();
    setIsAccountDeleted(false);
  };

  const handleLogin = (user: User) => {
    setIsAccountDeleted(false);
    // Initial sector setup logic handled in effect below
    setCurrentUser(user);
    localStorage.setItem('khedmaty_user', JSON.stringify(user));
    if (user.role !== UserRole.ADMIN) {
      notifyAdminOfActivity("دخول خادم", `الخادم ${user.name} متواجد الآن على النظام.`, 'user_login', user.sectorId);
    }
    setActivePage(user.role === UserRole.SERVANT ? 'attendance' : user.role === UserRole.SECTOR_SECRETARY ? 'dashboard' : 'dashboard');
  };

  const handleSignup = async (userData: Omit<User, 'id' | 'avatarUrl'>) => {
    let firebaseUid = auth.currentUser?.uid;
    
    // Safety check: If current UID is already taken by another user in our DB,
    // we must get a fresh UID to avoid overwriting.
    const isUidTaken = users.some(u => u.id === firebaseUid);
    
    if (!firebaseUid || isUidTaken) {
        try {
            if (auth.currentUser) await auth.signOut();
            const cred = await signIn(); // Get fresh anonymous account
            firebaseUid = cred.uid;
        } catch (e) {
            console.error("Signup Auth Error:", e);
            return;
        }
    }

    if (!firebaseUid) return;

    const newUser: User = { ...userData, id: firebaseUid, avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random` };
    await addData(`users/${firebaseUid}`, newUser);
    notifyAdminOfActivity("إنشاء حساب جديد", `قام الخادم "${userData.name}" بإنشاء حساب جديد برقم هاتف: ${userData.phone}`, 'user_signup');
    sendSignupNotification(newUser.name, newUser.phone || 'لا يوجد', 'SERVANT')
      .catch(err => console.error("Telegram Signup Error:", err));
    handleLogin(newUser);
  };

  const handleSwitchSector = (sectorId: string) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, sectorId };
    setCurrentUser(updatedUser);
    localStorage.setItem('khedmaty_user', JSON.stringify(updatedUser));
  };

  const handleSaveAttendance = async (date: string, records: Record<string, any>) => {
    const recordList = Object.values(records);
    if (recordList.length === 0) return;
    try {
      for (const record of recordList) {
         const id = record.studentId || record.servantId;
         if (!id) continue;
         
         // Determine the correct key for storage
         let key = `${date}_${id}`;
         
         // If it's a servant record and has a sectorId, use the composite key
         if (record.servantId && record.sectorId) {
             key = `${date}_${id}_${record.sectorId}`;
         }
         
         await addData(`attendance/${key}`, { ...record, date });
         if (record.studentId && record.present) updateData(`students/${record.studentId}`, { lastAttendedDate: date });
      }
      
      let sectorIdForNotif: string | undefined = undefined;

      if (currentUser) {
          if (recordList[0].studentId) {
              const presentNames: string[] = [];
              const absentNames: string[] = [];
              let className = "غير محدد";
              let sectorName = "غير محدد";

              const firstStudent = students.find(s => s.id === recordList[0].studentId);
              let totalClassSize = 0;
              if (firstStudent) {
                  const cls = classes.find(c => c.id === firstStudent.classId);
                  const sec = sectors.find(s => s.id === firstStudent.sectorId);
                  if (cls) className = cls.name;
                  if (sec) {
                      sectorName = sec.name;
                      sectorIdForNotif = sec.id;
                  }
                  
                  // Calculate total class size
                  totalClassSize = students.filter(s => s.classId === firstStudent.classId).length;
              }

              recordList.forEach((rec: any) => {
                 const student = students.find(s => s.id === rec.studentId);
                 if (student) {
                     if (rec.present) presentNames.push(student.name);
                     else if (rec.absent) absentNames.push(student.name);
                 }
              });

              sendTelegramReport(className, sectorName, currentUser.name, presentNames, absentNames, date, totalClassSize)
                .catch(e => console.error("Telegram Student Report Error:", e));
          } 
          else if (recordList[0].servantId) {
              const presentCount = recordList.filter((r: any) => r.present).length;
              const absentCount = recordList.filter((r: any) => r.absent).length;
              let sectorName = "غير محدد";
              if (currentUser.sectorId) {
                  const sec = sectors.find(s => s.id === currentUser.sectorId);
                  if (sec) {
                      sectorName = sec.name;
                      sectorIdForNotif = sec.id;
                  }
              }
              sendSectorAttendanceNotification(sectorName, currentUser.name, date, presentCount, absentCount, recordList.length)
                .catch(e => console.error("Telegram Servant Report Error:", e));
          }
      }
      
      const actorName = currentUser?.name || "مستخدم";
      const roleTitle = currentUser?.role === UserRole.SECTOR_SECRETARY ? "أمين القطاع" : "الخادم";
      notifyAdminOfActivity("تسجيل حضور", `قام ${roleTitle} ${actorName} بتسجيل الحضور ليوم ${date}`, 'attendance_saved', sectorIdForNotif);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPreparationComment = async (prepId: string, text: string) => {
    try {
        const prep = preparations.find(p => p.id === prepId);
        if (!prep) return;
        
        const newComment: PreparationComment = {
            id: `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            authorName: currentUser?.name || 'مستخدم غير معروف',
            authorRole: currentUser?.role || UserRole.ADMIN,
            text,
            timestamp: new Date().toISOString()
        };
        
        const updatedComments = [...(prep.comments || []), newComment];
        await updateData(`preparations/${prepId}`, { comments: updatedComments });
    } catch (error) {
        console.error("Error adding comment:", error);
    }
  };

  const handleSendPreparation = async (prepData: any) => {
    try {
      const newPrepRef = `preparations/${Date.now()}`;
      const timestamp = new Date().toISOString();
      await addData(newPrepRef, { ...prepData, timestamp });
      
      let sectorName = "غير محدد";
      let className = "غير محدد";
      let sectorIdForNotif: string | undefined = undefined;

      if (prepData.classId) {
          const cls = classes.find(c => c.id === prepData.classId);
          if (cls) {
              className = cls.name;
              const sec = sectors.find(s => s.id === cls.sectorId);
              if (sec) {
                  sectorName = sec.name;
                  sectorIdForNotif = sec.id;
              }
          }
      }

      // Fallback: Use provided names/IDs if lookup failed
      if (className === "غير محدد" && prepData.className) {
          className = prepData.className;
      }
      
      if (sectorName === "غير محدد" && prepData.sectorId) {
          const sec = sectors.find(s => s.id === prepData.sectorId);
          if (sec) {
              sectorName = sec.name;
              sectorIdForNotif = sec.id;
          }
      }

      notifyAdminOfActivity("تحضير جديد", `قام الخادم ${prepData.servantName} بإرسال تحضير درس جديد.`, 'preparation_sent', sectorIdForNotif);

      const prepType = prepData.imageUrls && prepData.imageUrls.length > 0 ? 'image' : 'text';

      await sendPreparationNotification(
        prepData.servantName, 
        prepData.date, // This is the lesson date
        prepData.imageUrls?.length || 0,
        sectorName,
        className,
        prepType
      );

    } catch (e) {
      console.error(e);
    }
  };

  // Robust Logic to determine sectors available to this secretary
  // Checks the 'sectors' collection for where the user is assigned, 
  // ensuring up-to-date access even if 'user.sectorIds' is stale.
  const myAdminSectors = useMemo(() => {
      if (!currentUser || currentUser.role !== UserRole.SECTOR_SECRETARY) {
          return [];
      }
      return sectors.filter(s => 
          s.secretaryId === currentUser.id || 
          (s.secretaryIds && s.secretaryIds.includes(currentUser.id))
      );
  }, [currentUser, sectors]);

  // Effect to ensure active sector is valid and auto-select if missing
  useEffect(() => {
      if (currentUser?.role === UserRole.SECTOR_SECRETARY && myAdminSectors.length > 0) {
          const isCurrentValid = myAdminSectors.some(s => s.id === currentUser.sectorId);
          // If current sector is invalid or missing, default to the first one available
          if (!isCurrentValid || !currentUser.sectorId) {
              handleSwitchSector(myAdminSectors[0].id);
          }
      }
  }, [myAdminSectors, currentUser?.sectorId, currentUser?.role]);
  
  // Handler for sending request messages
  const handleSendRequest = async (text: string, threadId: string) => {
      if (!currentUser || !text.trim()) return;
      
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newMessage: RequestMessage = {
          id: messageId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: currentUser.role,
          text: text.trim(),
          timestamp: new Date().toISOString(),
          isRead: false
      };
      
      await addData(`requests/${threadId}/${messageId}`, newMessage);
  };

  if (isAccountDeleted) return <AccountDeletedView onBackToLogin={handleLogout} />;
  if (!currentUser) return <Auth users={users} onLogin={handleLogin} onSignup={handleSignup} />;
  if (isLoading) return <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (currentUser.role === UserRole.SERVANT && !currentUser.classId && !classes.some(c => c.servantIds?.includes(currentUser.id))) {
    return <PendingAssignmentView onLogout={handleLogout} />;
  }

  const myClasses = classes.filter(c => c.servantIds?.includes(currentUser.id));
  const mySector = sectors.find(s => s.id === currentUser.sectorId);
  const mySectorClasses = classes.filter(c => c.sectorId === currentUser.sectorId);
  const mySectorServants = users.filter(u => u.role === UserRole.SERVANT && (u.sectorId === currentUser.sectorId || u.sectorIds?.includes(currentUser.sectorId || '')));
  
  return (
    <Layout 
      user={currentUser} 
      onLogout={handleLogout} 
      activePage={activePage} 
      setActivePage={setActivePage}
      userSectors={myAdminSectors}
      currentSectorId={currentUser.sectorId}
      onSwitchSector={handleSwitchSector}
    >
      {permissionError && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400" />
          <p className="text-red-800 dark:text-red-200 font-bold">{permissionError}</p>
        </div>
      )}

      {currentUser.role === UserRole.ADMIN && (
        <>
          {activePage === 'dashboard' && <DashboardHome role={UserRole.ADMIN} students={students} sectors={sectors} notifications={notifications} attendance={attendance} classes={classes} users={users} currentUser={currentUser} />}
          {activePage === 'requests' && <AdminRequestsView currentUser={currentUser} users={users} classes={classes} requestsData={requestsData} onSendMessage={handleSendRequest} sectors={sectors} />}
          {activePage === 'users' && <UserManagement users={users} sectors={sectors} onAddUser={async (u) => { const uid = `u_${Date.now()}`; await addData(`users/${uid}`, { ...u, id: uid }); }} onEditUser={(id, u) => updateData(`users/${id}`, u)} onDeleteUser={(id) => deleteData(`users/${id}`)} />}
          {activePage === 'sectors' && <SectorManagement sectors={sectors} users={users} attendance={attendance} onAddSector={async (name, ids) => { const sid = `s_${Date.now()}`; await addData(`sectors/${sid}`, { id: sid, name, secretaryIds: ids }); }} onEditSector={(id, name, ids) => updateData(`sectors/${id}`, { name, secretaryIds: ids })} onDeleteSector={(id) => deleteData(`sectors/${id}`)} onAssignServantToSector={(sid, secId, action) => { const usr = users.find(u => u.id === sid); if(usr) updateData(`users/${sid}`, { sectorId: action === 'add' ? secId : null, sectorIds: action === 'add' ? [...(usr.sectorIds||[]), secId] : (usr.sectorIds||[]).filter(x => x !== secId) }); }} />}
          {activePage === 'classes' && <ClassManagement classes={classes} sectors={sectors} users={users} students={students} attendance={attendance} onAddClass={async (name, secId, srvIds) => { const cid = `c_${Date.now()}`; await addData(`classes/${cid}`, { id: cid, name, sectorId: secId, servantIds: srvIds }); }} onEditClass={(id, name, secId, srvIds) => updateData(`classes/${id}`, { name, sectorId: secId, servantIds: srvIds })} onDeleteClass={(id) => deleteData(`classes/${id}`)} onAddStudent={async (s) => { const sid = `st_${Date.now()}`; await addData(`students/${sid}`, { ...s, id: sid }); }} onEditStudent={(id, s) => updateData(`students/${id}`, s)} onDeleteStudent={(id) => deleteData(`students/${id}`)} />}
          {activePage === 'all-servants' && <ServantsDirectory users={users} sectors={sectors} classes={classes} />}
          {activePage === 'preparations-admin' && <PreparationsAdminView users={users} preparations={preparations} onDeletePreparation={(id) => deleteData(`preparations/${id}`)} onAddComment={handleAddPreparationComment} />}
          {activePage === 'cards' && <CardGenerator students={students} sectors={sectors} classes={classes} users={users} />}
        </>
      )}

      {currentUser.role === UserRole.SECTOR_SECRETARY && (
        <>
          {activePage === 'dashboard' && (
            <DashboardHome 
                role={UserRole.SECTOR_SECRETARY} 
                students={students.filter(s => s.sectorId === currentUser.sectorId)} 
                sectors={sectors.filter(s => s.id === currentUser.sectorId)} 
                notifications={notifications.filter(n => n.sectorId === currentUser.sectorId || (n.type === 'system' && !n.sectorId))} 
                attendance={attendance} 
                classes={classes.filter(c => c.sectorId === currentUser.sectorId)} 
                users={users.filter(u => u.sectorId === currentUser.sectorId || u.sectorIds?.includes(currentUser.sectorId || ''))} 
                currentUser={currentUser}
            />
          )}
          {activePage === 'my-sector' && (
             <div className="space-y-6">
                {/* Visual Sector Switcher for Secretaries with multiple sectors */}
                {myAdminSectors.length > 1 && (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <Layers size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-sm">تغيير القطاع</h3>
                                <p className="text-[10px] text-gray-500">لديك صلاحية على {myAdminSectors.length} قطاعات</p>
                            </div>
                        </div>
                        <div className="flex gap-2 overflow-x-auto w-full pb-2 sm:pb-0 no-scrollbar">
                            {myAdminSectors.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => handleSwitchSector(s.id)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex-shrink-0 ${
                                        currentUser.sectorId === s.id
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                                        : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600 hover:border-indigo-300'
                                    }`}
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Church /> {mySector?.name || 'جاري التحميل...'}</h2>
                        <p className="opacity-80 mt-1">إدارة الفصل والخدام والمخدومين</p>
                    </div>
                    <div className="text-left bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                        <div className="text-xs opacity-70">إجمالي المخدومين</div>
                        <div className="text-2xl font-bold">{students.filter(s => s.sectorId === currentUser.sectorId).length}</div>
                    </div>
                </div>
                <ClassManagement 
                    classes={mySectorClasses} 
                    sectors={mySector ? [mySector] : []} 
                    users={mySectorServants} 
                    students={students} 
                    attendance={attendance}
                    onAddClass={async (name, secId, srvIds) => { 
                        const cid = `c_${Date.now()}`; 
                        await addData(`classes/${cid}`, { id: cid, name, sectorId: currentUser.sectorId, servantIds: srvIds }); 
                    }} 
                    onEditClass={(id, name, secId, srvIds) => updateData(`classes/${id}`, { name, sectorId: currentUser.sectorId, servantIds: srvIds })} 
                    onDeleteClass={(id) => deleteData(`classes/${id}`)} 
                    onAddStudent={async (s) => { const sid = `st_${Date.now()}`; await addData(`students/${sid}`, { ...s, id: sid }); }} 
                    onEditStudent={(id, s) => updateData(`students/${id}`, s)} 
                    onDeleteStudent={(id) => deleteData(`students/${id}`)}
                    isSimplifiedView={true}
                />
             </div>
          )}
          {activePage === 'requests' && currentUser.sectorId && (
            <SecretaryRequestsView 
                currentUser={currentUser} 
                users={users} 
                classes={classes} 
                requestsData={requestsData} 
                onSendMessage={handleSendRequest} 
                sectorId={currentUser.sectorId}
            />
          )}
          {activePage === 'sector-occasions' && (
             <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Gift className="text-pink-500" />
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-white">إدارة المناسبات والاشتراكات</h3>
                            <p className="text-xs text-gray-500">
                                {sectorOccasionsClassId 
                                    ? `فصل: ${mySectorClasses.find(c => c.id === sectorOccasionsClassId)?.name}`
                                    : 'اختر الفصل لعرض المناسبات الخاصة به'
                                }
                            </p>
                        </div>
                    </div>
                    {sectorOccasionsClassId && (
                        <button 
                            onClick={() => setSectorOccasionsClassId(null)}
                            className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                            <ArrowRight size={16} /> تغيير الفصل
                        </button>
                    )}
                </div>

                {!sectorOccasionsClassId ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                        {mySectorClasses.map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => setSectorOccasionsClassId(c.id)}
                                className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-indigo-500 transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-pink-50 dark:bg-pink-900/30 rounded-xl text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                                        <Gift size={24} />
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white group-hover:text-pink-500 transition-colors">{c.name}</h3>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <Users size={16} />
                                    <span>{students.filter(s => s.classId === c.id).length} مخدوم</span>
                                </div>
                            </div>
                        ))}
                        {mySectorClasses.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-400">لا توجد فصول في هذا القطاع</div>
                        )}
                    </div>
                ) : (
                    <OccasionsView 
                        availableClasses={[mySectorClasses.find(c => c.id === sectorOccasionsClassId)!]}
                        students={students}
                        occasions={occasions}
                        payments={occasionPayments}
                        onAddOccasion={async (name, cid) => { const oid = `occ_${Date.now()}`; await addData(`occasions/${oid}`, { id: oid, name, classId: cid, createdAt: new Date().toISOString() }); }}
                        onEditOccasion={(id, name) => updateData(`occasions/${id}`, { name })}
                        onDeleteOccasion={(id) => deleteData(`occasions/${id}`)}
                        currentUserName={currentUser.name}
                    />
                )}
             </div>
          )}
          {activePage === 'servant-attendance' && (
             <SectorServantsView 
                users={mySectorServants} 
                attendance={attendance} 
                onSaveAttendance={handleSaveAttendance} 
                sectorId={currentUser.sectorId}
                classes={mySectorClasses}
                students={students}
                currentUserName={currentUser.name}
             />
          )}
          {activePage === 'sector-preparations' && (
             <PreparationsAdminView 
                users={mySectorServants}
                preparations={preparations.filter(p => {
                    // Strict filtering to ensure only current sector's preps are shown
                    
                    // 1. If classId is present, the class MUST belong to the current sector
                    if (p.classId) {
                        const cls = classes.find(c => c.id === p.classId);
                        return cls && cls.sectorId === currentUser.sectorId;
                    }
                    
                    // 2. If no classId (general prep), fallback to checking if servant belongs to this sector
                    const servant = users.find(u => u.id === p.servantId);
                    if (!servant) return false;
                    return servant.sectorId === currentUser.sectorId || (servant.sectorIds && servant.sectorIds.includes(currentUser.sectorId || ''));
                })}
                onDeletePreparation={(id) => deleteData(`preparations/${id}`)}
                onAddComment={handleAddPreparationComment}
             />
          )}
          {activePage === 'sector-student-attendance' && (
             <div className="space-y-6">
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <UserCheck className="text-indigo-600"/> 
                        <div>
                            <h2 className="text-xl font-bold">تسجيل حضور المخدومين (نيابة عن الخدام)</h2>
                            <p className="text-xs text-gray-500 mt-1">
                                {sectorAttendanceClassId 
                                    ? `فصل: ${mySectorClasses.find(c => c.id === sectorAttendanceClassId)?.name}`
                                    : 'اختر الفصل لبدء تسجيل الحضور'
                                }
                            </p>
                        </div>
                    </div>
                    {sectorAttendanceClassId && (
                        <button 
                            onClick={() => setSectorAttendanceClassId(null)}
                            className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                            <ArrowRight size={16} /> تغيير الفصل
                        </button>
                    )}
                 </div>
                 
                 {!sectorAttendanceClassId ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                        {mySectorClasses.map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => setSectorAttendanceClassId(c.id)}
                                className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-indigo-500 transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <BookOpen size={24} />
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{c.name}</h3>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                   <div className="flex items-center gap-1">
                                     <Users size={16} />
                                     <span>{students.filter(s => s.classId === c.id).length} مخدوم</span>
                                   </div>
                                </div>
                            </div>
                        ))}
                         {mySectorClasses.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-400">لا توجد فصول في هذا القطاع</div>
                        )}
                    </div>
                 ) : (
                     <AttendanceView 
                        availableClasses={[mySectorClasses.find(c => c.id === sectorAttendanceClassId)!]}
                        students={students}
                        attendance={attendance}
                        onSaveAttendance={handleSaveAttendance}
                        onAddStudent={async (s) => { const sid = `st_${Date.now()}`; await addData(`students/${sid}`, { ...s, id: sid }); }}
                        onEditStudent={(id, s) => updateData(`students/${id}`, s)}
                        onDeleteStudent={(id) => deleteData(`students/${id}`)}
                        currentUserName={currentUser.name}
                     />
                 )}
             </div>
          )}
          {activePage === 'scanner' && (
            <ScannerView 
              currentUser={currentUser}
              students={students}
              classes={classes}
              sectors={sectors}
              users={users}
              onSaveAttendance={handleSaveAttendance}
            />
          )}
        </>
      )}

      {currentUser.role === UserRole.SERVANT && (
        <>
          {activePage === 'dashboard' && (
            <DashboardHome 
                role={UserRole.SERVANT} 
                students={students.filter(s => myClasses.some(c => c.id === s.classId))} 
                sectors={sectors.filter(s => s.id === currentUser.sectorId)} 
                notifications={notifications.filter(n => n.sectorId === currentUser.sectorId || (n.type === 'system' && !n.sectorId))} 
                attendance={attendance} 
                classes={myClasses} 
                users={users.filter(u => u.id === currentUser.id || myClasses.some(c => c.servantIds?.includes(u.id)))} 
                currentUser={currentUser}
            />
          )}
          {activePage === 'attendance' && (
            <AttendanceView 
              availableClasses={myClasses} 
              students={students} 
              attendance={attendance} 
              onSaveAttendance={handleSaveAttendance} 
              onAddStudent={async (s) => { const sid = `st_${Date.now()}`; await addData(`students/${sid}`, { ...s, id: sid }); }}
              onEditStudent={(id, s) => updateData(`students/${id}`, s)}
              onDeleteStudent={(id) => deleteData(`students/${id}`)}
              currentUserName={currentUser.name}
            />
          )}
          {activePage === 'requests' && (
            <ServantRequestsView 
                currentUser={currentUser} 
                classes={classes} 
                requestsData={requestsData} 
                onSendMessage={handleSendRequest} 
            />
          )}
          {activePage === 'preparation' && (
            <PreparationView 
                user={currentUser} 
                availableClasses={myClasses} 
                onSendPreparation={handleSendPreparation} 
                myPreparations={preparations.filter(p => p.servantId === currentUser.id)}
            />
          )}
          {activePage === 'occasions' && (
            <OccasionsView 
              availableClasses={myClasses} 
              students={students}
              occasions={occasions}
              payments={occasionPayments}
              onAddOccasion={async (name, cid) => { const oid = `occ_${Date.now()}`; await addData(`occasions/${oid}`, { id: oid, name, classId: cid, createdAt: new Date().toISOString() }); }}
              onEditOccasion={(id, name) => updateData(`occasions/${id}`, { name })}
              onDeleteOccasion={(id) => deleteData(`occasions/${id}`)}
              currentUserName={currentUser.name}
            />
          )}
          {activePage === 'scanner' && (
            <ScannerView 
              currentUser={currentUser}
              students={students}
              classes={classes}
              sectors={sectors}
              users={users}
              onSaveAttendance={handleSaveAttendance}
            />
          )}
        </>
      )}
    </Layout>
  );
};
