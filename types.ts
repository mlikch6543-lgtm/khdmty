

export enum UserRole {
  ADMIN = 'ADMIN', // أمين الخدمة العام
  SECTOR_SECRETARY = 'SECTOR_SECRETARY', // أمين القطاع
  SERVANT = 'SERVANT', // الخادم
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  password?: string; // For display purposes as requested
  sectorId?: string; // For secretaries and servants (Primary or Legacy)
  sectorIds?: string[]; // For multiple sector assignments
  classId?: string; // Deprecated in favor of assigning via ClassGroup, kept for compat
  avatarUrl: string;
}

export interface Student {
  id: string;
  name: string;
  age: number; // For compatibility
  birthDate?: string; // تاريخ الميلاد
  classId: string;
  sectorId: string;
  phone: string;
  address: string;
  attendanceRate: number; // 0-100
  lastAttendedDate?: string;
  notes?: string;
}

export interface ClassGroup {
  id: string;
  name: string; // e.g., "5th Grade Boys"
  sectorId: string;
  servantIds: string[]; // Changed to array for multiple servants
}

export interface Sector {
  id: string;
  name: string; // e.g., "Saint Mark Sector"
  secretaryId: string; // Primary Secretary
  secretaryIds?: string[]; // List of all secretaries
}

export interface Occasion {
  id: string;
  name: string;
  classId: string;
  createdAt: string;
  createdBy?: string; // اسم الخادم الذي أضاف المناسبة
}

export interface OccasionPayment {
  paid: boolean;
  paymentDate: string;
  collectedBy?: string; // اسم الخادم الذي استلم المبلغ
}

export interface PreparationComment {
  id: string;
  authorName: string;
  authorRole: UserRole;
  text: string;
  timestamp: string;
}

export interface LessonPreparation {
  id: string;
  servantId: string;
  servantName: string;
  date: string;
  imageUrls: string[]; // مصفوفة من الصور المشفرة Base64
  timestamp: string;
  classId?: string; // ID الفصل الذي يتم التحضير له
  className?: string; // اسم الفصل
  title?: string; // عنوان الدرس (للتحضير النصي)
  content?: string; // محتوى الدرس (للتحضير النصي)
  lessonVerse?: string; // آية الدرس
  lessonElements?: string;
  lessonObjectives?: string;
  illustrationMethod?: string;
  training?: string;
  comments?: PreparationComment[]; // تعليقات الأمناء
}

// Detailed attendance for Students
export interface StudentDailyRecord {
  studentId: string;
  present: boolean;
  absent: boolean;
  attendedMass: boolean;
  communion: boolean;
  prayer: boolean;
  didVisitation: boolean;
  notes?: string; // ملاحظات يومية مرتبطة بالتاريخ
}

// Detailed attendance for Servants (viewed by Sector Secretary)
export interface ServantDailyRecord {
  servantId: string;
  present: boolean;
  absent: boolean;
  attendedMass: boolean;
  preparedLesson: boolean;
  didVisitation: boolean;
  notes?: string; // ملاحظات يومية للخادم
  sectorId?: string; // To track attendance per sector
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'attendance_saved' | 'system' | 'user_signup' | 'user_login' | 'preparation_sent' | 'student_added' | 'class_added';
  sectorId?: string; // Optional sector ID for filtering
}

export interface RequestMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
  isRead: boolean;
  isEdited?: boolean; // هل تم تعديل الرسالة
  reactions?: Record<string, string>; // { userId: emoji }
}