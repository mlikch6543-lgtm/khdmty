

import React from 'react';
import { User, UserRole, Sector } from '../types';
import { Avatar } from './Avatar';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  BookOpen, 
  LogOut, 
  Menu, 
  X,
  Church,
  ClipboardList,
  UserCog,
  ChevronRight,
  Gift,
  FileText,
  UserCheck,
  MessageCircle, // Imported MessageCircle icon
  CreditCard,
  QrCode
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  activePage: string;
  setActivePage: (page: string) => void;
  // Added props to handle sector switching for secretaries
  userSectors?: Sector[];
  currentSectorId?: string;
  onSwitchSector?: (id: string) => void;
}

interface SidebarItemProps {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 whitespace-nowrap ${
      active 
        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold' 
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'
    }`}
  >
    <Icon size={20} className="min-w-[20px]" />
    <span>{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  activePage, 
  setActivePage,
  userSectors = [],
  currentSectorId,
  onSwitchSector
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // Define menu items based on role
  const getMenuItems = () => {
    if (user.role === UserRole.ADMIN) {
      return [
        { id: 'dashboard', label: 'لوحة المعلومات', icon: LayoutDashboard },
        { id: 'requests', label: 'الطلبات والرسائل', icon: MessageCircle },
        { id: 'users', label: 'المستخدمين', icon: UserCog },
        { id: 'sectors', label: 'القطاعات', icon: Church },
        { id: 'classes', label: 'الفصول', icon: BookOpen },
        { id: 'all-servants', label: 'دليل الخدام', icon: Users },
        { id: 'preparations-admin', label: 'التحضير', icon: FileText },
        { id: 'cards', label: 'البطاقات', icon: CreditCard },
      ];
    } else if (user.role === UserRole.SECTOR_SECRETARY) {
      return [
        { id: 'dashboard', label: 'لوحة المعلومات', icon: LayoutDashboard },
        { id: 'my-sector', label: 'القطاع والفصول', icon: Church },
        { id: 'requests', label: 'الطلبات والرسائل', icon: MessageCircle },
        { id: 'scanner', label: 'الماسح الضوئي (الخدام)', icon: QrCode },
        { id: 'sector-occasions', label: 'المناسبات', icon: Gift },
        { id: 'servant-attendance', label: 'حضور الخدام', icon: ClipboardList },
        { id: 'sector-preparations', label: 'متابعة التحضير', icon: FileText },
        { id: 'sector-student-attendance', label: 'حضور المخدومين', icon: UserCheck },
      ];
    } else {
      // Servant View
      return [
        { id: 'dashboard', label: 'لوحة المعلومات', icon: LayoutDashboard },
        { id: 'attendance', label: 'تسجيل الحضور', icon: CalendarCheck },
        { id: 'scanner', label: 'الماسح الضوئي', icon: QrCode },
        { id: 'requests', label: 'الطلبات', icon: MessageCircle },
        { id: 'preparation', label: 'التحضير', icon: FileText },
        { id: 'occasions', label: 'المناسبات', icon: Gift },
      ];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col md:flex-row transition-colors duration-200">
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-800 shadow-sm p-4 flex justify-between items-center z-20 relative border-b dark:border-slate-700">
        <div className="font-bold text-xl text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
          <Church />
          <span>خدمتي</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600 dark:text-gray-300">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-20 bg-white dark:bg-slate-800 shadow-xl border-l dark:border-slate-700
        transform transition-all duration-300 ease-in-out overflow-hidden
        md:relative md:transform-none
        ${isMobileMenuOpen ? 'translate-x-0 w-64' : 'translate-x-full md:translate-x-0'}
        ${isSidebarCollapsed ? 'md:w-0 md:border-l-0' : 'md:w-64'}
      `}>
        <div className={`flex flex-col h-full ${isSidebarCollapsed ? 'md:opacity-0' : 'md:opacity-100'} transition-opacity duration-200 min-w-[16rem]`}>
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-700 dark:text-indigo-300 shrink-0">
                <Church size={24} />
            </div>
            <div>
                <h1 className="font-bold text-lg text-gray-800 dark:text-gray-100">خدمتي</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">نظام مدارس الأحد</p>
            </div>
            </div>

            <div className="p-4 flex flex-col gap-2 flex-1 overflow-y-auto">
            <div className="mb-6 px-4">
                <div className="flex items-center gap-3 mb-2">
                <Avatar src={user.avatarUrl} name={user.name} className="w-10 h-10 rounded-full border-2 border-indigo-100 dark:border-indigo-900 shrink-0" />
                <div className="overflow-hidden">
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate">
                    {user.role === UserRole.ADMIN ? 'أمين عام' : 
                    user.role === UserRole.SECTOR_SECRETARY ? 'أمين قطاع' : 'خادم'}
                    </p>
                </div>
                </div>

                {/* Sector Switcher for Secretaries with multiple sectors */}
                {user.role === UserRole.SECTOR_SECRETARY && userSectors.length > 1 && onSwitchSector && (
                  <div className="mt-4 p-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50 animate-fade-in-up">
                    <label className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1.5 mr-1 flex items-center gap-1">
                        <Church size={12} />
                        القطاع الحالي:
                    </label>
                    <div className="relative">
                        <select 
                        value={currentSectorId}
                        onChange={(e) => onSwitchSector(e.target.value)}
                        className="w-full appearance-none bg-white dark:bg-slate-800 text-xs font-bold py-2 px-3 rounded-lg border border-indigo-200 dark:border-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-200 cursor-pointer shadow-sm"
                        >
                        {userSectors.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                        </select>
                        <ChevronRight className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90" size={14} />
                    </div>
                  </div>
                )}
            </div>

            <div className="space-y-1">
                {getMenuItems().map((item) => (
                <SidebarItem 
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activePage === item.id}
                    onClick={() => {
                    setActivePage(item.id);
                    setIsMobileMenuOpen(false);
                    }}
                />
                ))}
            </div>

            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-700">
                <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors whitespace-nowrap"
                >
                <LogOut size={20} className="min-w-[20px]" />
                <span>تسجيل خروج</span>
                </button>
            </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)] md:h-screen flex flex-col relative">
        
        {/* Desktop Sidebar Toggle Button */}
        <div className="hidden md:flex items-center px-6 pt-4 pb-0">
            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 rounded-lg bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm border border-gray-200 dark:border-slate-700 transition-all"
                title={isSidebarCollapsed ? "إظهار القائمة" : "إخفاء القائمة"}
            >
                {isSidebarCollapsed ? <Menu size={20} /> : <ChevronRight size={20} />}
            </button>
        </div>

        <div className="flex-1 p-4 md:p-8 md:pt-4">
            <div className="max-w-6xl mx-auto">
                {children}
            </div>
        </div>
        
        {/* Footer */}
        <footer className="w-full py-4 text-center border-t border-gray-100 dark:border-slate-800 mt-auto bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <p className="text-sm font-semibold text-gray-400 dark:text-slate-500 flex items-center justify-center gap-2">
                <span className="animate-rainbow-text text-base">&lt;Developed by="Gerges Reda" /&gt;</span>
            </p>
        </footer>
      </main>
    </div>
  );
};