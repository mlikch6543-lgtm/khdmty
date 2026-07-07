
import React, { useState, useEffect, useRef } from 'react';
import { Church, Lock, Phone, User as UserIcon, UserPlus, LogIn, Sparkles, Eye, EyeOff } from 'lucide-react';
import { User, UserRole } from '../types';

interface AuthProps {
  users: User[];
  onLogin: (user: User) => void;
  onSignup: (user: Omit<User, 'id' | 'avatarUrl'>) => void;
}

// Custom Angel Component - Smaller & More Realistic Style (Restored)
const ClearAngel = ({ className, delay = "0s", flip = false }: { className?: string, delay?: string, flip?: boolean }) => (
  <div className={`absolute top-1/2 -translate-y-1/2 ${className} z-0 pointer-events-none select-none`} style={{ animationDelay: delay }}>
    <svg 
      width="140" 
      height="140" 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg"
      className={`relative drop-shadow-md ${flip ? '-scale-x-100' : ''}`}
    >
      <defs>
        <linearGradient id="angelWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fef3c7" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="angelSkinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe4c4" />
          <stop offset="100%" stopColor="#f5d0a9" />
        </linearGradient>
        <linearGradient id="angelRobeGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
      </defs>

      {/* Halo */}
      <ellipse cx="65" cy="20" rx="12" ry="3" fill="none" stroke="#fbbf24" strokeWidth="1.5" className="animate-pulse" />

      {/* Back Wing (Darker/Behind) */}
      <g className="origin-[70px_40px] animate-wing-flap-back opacity-90">
         <path 
           d="M70 40 Q 90 10 95 25 Q 98 45 85 55 Q 75 50 70 40" 
           fill="#f1f5f9" 
           stroke="#cbd5e1" 
           strokeWidth="0.5" 
         />
      </g>

      {/* Body/Robe */}
      <path 
        d="M60 35 Q 70 35 75 45 L 85 90 Q 60 95 45 90 L 55 45 Q 55 35 60 35" 
        fill="url(#angelRobeGrad)" 
        stroke="#cbd5e1" 
        strokeWidth="0.5"
      />
      
      {/* Head */}
      <circle cx="65" cy="28" r="8" fill="url(#angelSkinGrad)" />
      {/* Hair */}
      <path d="M60 22 Q 70 18 73 28 Q 75 35 65 30" fill="#854d0e" />

      {/* Sleeve */}
      <path d="M65 40 Q 75 55 60 60" fill="white" stroke="#cbd5e1" strokeWidth="0.5" />
      
      {/* Hand (Praying) */}
      <circle cx="58" cy="58" r="3" fill="url(#angelSkinGrad)" />

      {/* Front Wing (Main) */}
      <g className="origin-[68px_40px] animate-wing-flap">
         <path 
           d="M68 40 Q 95 5 98 25 Q 100 60 80 70 Q 70 60 68 40" 
           fill="url(#angelWingGrad)" 
           stroke="#fbbf24" 
           strokeWidth="0.5" 
         />
         {/* Feather Details */}
         <path d="M70 42 Q 85 20 88 30" fill="none" stroke="#fbbf24" strokeWidth="0.2" opacity="0.5"/>
         <path d="M72 45 Q 85 30 85 40" fill="none" stroke="#fbbf24" strokeWidth="0.2" opacity="0.5"/>
      </g>

    </svg>
  </div>
);

export const Auth: React.FC<AuthProps> = ({ users, onLogin, onSignup }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    identifier: '', // Email or Phone for login
    phone: '', // For signup
    password: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State for password visibility
  const [isRinging, setIsRinging] = useState(false);

  const playBell = () => {
    setIsRinging(true);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      // Beautiful harmonic frequencies for a metallic bell/chime sound
      const frequencies = [261.63, 311.13, 392.00, 523.25, 783.99, 1046.50]; // C4 chord frequencies
      const gains = [0.25, 0.15, 0.12, 0.1, 0.08, 0.05];
      const decays = [1.8, 1.4, 1.2, 0.8, 0.5, 0.3];
      
      frequencies.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        
        gainNode.gain.setValueAtTime(0, now);
        // Instant attack
        gainNode.gain.linearRampToValueAtTime(gains[index], now + 0.01);
        // Exponential decay
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decays[index]);
        
        osc.start(now);
        osc.stop(now + decays[index]);
      });
    } catch (err) {
      console.warn("Web Audio bell synthesis skipped/blocked:", err);
    }
    setTimeout(() => setIsRinging(false), 2000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      // Clean inputs (remove accidental spaces which causes login failure)
      const inputIdentifier = formData.identifier.trim();
      const inputPassword = formData.password.trim();

      if (!inputIdentifier || !inputPassword) {
        setError('يرجى إدخال البيانات كاملة');
        return;
      }

      // --- LOGIN LOGIC ---
      
      // 1. Check Hardcoded Master Admin (Super Admin)
      // This account is now strictly independent and won't search for other admins in the DB
      if (
        inputIdentifier.toLowerCase() === 'ggrgesreda99@gmail.com' &&
        inputPassword === 'G@1532008'
      ) {
        const masterAdmin: User = {
          id: 'master_admin',
          name: 'جرجس رضا (المسؤول العام)',
          role: UserRole.ADMIN,
          avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=indigo&color=fff',
          email: 'ggrgesreda99@gmail.com',
          password: 'G@1532008'
        };
        onLogin(masterAdmin);
        return;
      }

      // 2. Check Database Users (Including other ADMINS, SECRETARIES, and SERVANTS)
      const foundUser = users.find(u => {
        // Skip master_admin ID if it somehow exists in database to avoid conflict
        if (u.id === 'master_admin') return false;

        const dbEmail = (u.email || '').toLowerCase().trim();
        const dbPhone = (u.phone || '').trim();
        const dbName = u.name.trim();
        
        const checkIdentifier = inputIdentifier.toLowerCase();
        
        const identifierMatch = 
          dbEmail === checkIdentifier || 
          dbPhone === inputIdentifier || 
          dbName.toLowerCase() === checkIdentifier;
          
        const passwordMatch = u.password === inputPassword;
        
        return identifierMatch && passwordMatch;
      });

      if (foundUser) {
        onLogin(foundUser);
      } else {
        setError('بيانات الدخول غير صحيحة. تأكد من البيانات وكلمة المرور.');
      }
    } else {
      // --- SIGNUP LOGIC ---
      if (!formData.name || !formData.phone || !formData.password) {
        setError('جميع الحقول مطلوبة');
        return;
      }
      
      const cleanPhone = formData.phone.trim();
      if (users.some(u => u.phone === cleanPhone)) {
        setError('رقم الهاتف مسجل مسبقاً');
        return;
      }

      onSignup({
        name: formData.name.trim(),
        phone: cleanPhone,
        password: formData.password.trim(),
        role: UserRole.SERVANT,
        sectorId: '',
        classId: ''
      });
    }
  };

  return (
    <div className="h-screen w-full relative flex items-center justify-center p-4 overflow-hidden bg-[#0f172a]">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-purple-900 to-indigo-950 z-0">
        <div className="absolute inset-0 opacity-20 animate-rays origin-center overflow-hidden">
            <div className="absolute top-1/2 left-1/2 w-[200vw] h-[200vw] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgba(255,215,0,0.3)_30deg,transparent_60deg,rgba(255,215,0,0.3)_90deg,transparent_120deg,rgba(255,215,0,0.3)_150deg,transparent_180deg)] blur-3xl"></div>
        </div>
        {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 4 + 1}px`,
                height: `${Math.random() * 4 + 1}px`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 10 + 10}s`
              }}
            ></div>
        ))}
      </div>

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center py-8">
            <div className="relative mb-6 mt-36 cursor-pointer group" onClick={playBell}>
              <ClearAngel className="-right-24" delay="0s" />
              <ClearAngel className="-left-24" delay="1.5s" flip={true} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-yellow-500/10 rounded-full blur-[40px]"></div>
              
              {/* Rotating Cross Container */}
              <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-30 perspective-500">
                  <div className="animate-spin-3d-clean origin-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-100 drop-shadow-[0_0_12px_rgba(255,215,0,1)]">
                        {/* Clean Cross Path - No Triangle/No extra paths */}
                        <path d="M11 2h2v7h7v2h-7v11h-2v-11h-7v-2h7V2z" />
                    </svg>
                  </div>
              </div>

              <div className={`relative z-20 transition-transform duration-300 transform group-hover:scale-105 ${isRinging ? 'animate-bell' : 'animate-float'}`}>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-16 bg-orange-400 rounded-full blur-xl animate-interior z-[-1]"></div>
                  <Church size={90} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" strokeWidth={1.5} />
              </div>
            </div>

            <div className="w-full bg-white/10 backdrop-blur-2xl rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.3)] border border-white/20 relative overflow-hidden p-8 animate-fade-in-up">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-70"></div>
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-md">خدمتي</h2>
                <p className="text-indigo-200 text-sm">
                {isLogin ? 'بوابة خدام كنيسة الامراء بداقوف' : 'انضمام خادم جديد'}
                </p>
            </div>

            {error && (
                <div className="bg-red-500/20 text-red-100 p-3 rounded-xl mb-6 text-sm font-medium border border-red-500/30 flex items-center gap-2 backdrop-blur-sm">
                <Lock size={16} />
                {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                <div className="group">
                    <label className="block text-xs font-bold text-indigo-100 mb-1 mr-1">الاسم بالكامل</label>
                    <div className="relative">
                    <UserIcon className="absolute right-3 top-3 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 text-gray-900 placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all shadow-sm"
                        placeholder="الاسم الثلاثي"
                    />
                    </div>
                </div>
                )}

                <div className="group">
                <label className="block text-xs font-bold text-indigo-100 mb-1 mr-1">
                    {isLogin ? 'اسم المستخدم / الهاتف' : 'رقم الهاتف'}
                </label>
                <div className="relative">
                    {isLogin ? (
                    <UserIcon className="absolute right-3 top-3 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    ) : (
                    <Phone className="absolute right-3 top-3 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    )}
                    <input
                    type="text"
                    name={isLogin ? "identifier" : "phone"}
                    value={isLogin ? formData.identifier : formData.phone}
                    onChange={handleChange}
                    className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 text-gray-900 placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all shadow-sm"
                    placeholder={isLogin ? "الاسم أو الهاتف" : "01xxxxxxxxx"}
                    />
                </div>
                </div>

                <div className="group">
                <label className="block text-xs font-bold text-indigo-100 mb-1 mr-1">كلمة المرور</label>
                <div className="relative">
                    <Lock className="absolute right-3 top-3 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pr-10 pl-10 py-3 bg-white border border-gray-200 text-gray-900 placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all shadow-sm"
                    placeholder="••••••••"
                    />
                    <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3 text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none"
                    >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                </div>

                <button
                type="submit"
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-slate-900 font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.3)] transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-4"
                >
                {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                {isLogin ? 'دخول' : 'إنشاء حساب'}
                </button>
                
                <div className="mt-4 pt-2 border-t border-white/10 text-center">
                    <p className="text-[10px] text-indigo-300/80 font-mono tracking-wider flex items-center justify-center gap-1">
                        <span className="animate-rainbow-text">&lt;Developed by="Gerges Reda" /&gt;</span>
                    </p>
                </div>
            </form>

            <div className="mt-4 text-center">
                <button
                type="button"
                onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setShowPassword(false);
                    setFormData({ name: '', identifier: '', phone: '', password: '' });
                }}
                className="text-indigo-200 hover:text-white text-sm font-medium hover:underline transition-all"
                >
                {isLogin ? (
                    <>ليس لديك حساب؟ <span className="text-yellow-400 font-bold">انضم للخدمة</span></>
                ) : (
                    <>لديك حساب بالفعل؟ <span className="text-yellow-400 font-bold">تسجيل الدخول</span></>
                )}
                </button>
            </div>
            </div>
            <div className="mt-8 text-center opacity-70">
                <p className="text-indigo-300 text-xs flex items-center justify-center gap-2">
                    <Sparkles size={12} className="text-yellow-400" />
                    نظام مدارس الأحد - كنيسة الامراء
                    <Sparkles size={12} className="text-yellow-400" />
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};
