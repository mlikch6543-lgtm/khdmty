
import { User, UserRole, Sector, ClassGroup, Student } from './types';

// Mock Users
export const MOCK_USERS: User[] = [
  {
    id: 'admin_1',
    name: 'جرجس رضا',
    email: 'ggrgesreda99@gmail.com',
    password: 'admin_password',
    role: UserRole.ADMIN,
    avatarUrl: 'https://picsum.photos/200/200?random=1',
  },
  {
    id: 'u2',
    name: 'م. يوسف (أمين قطاع إعدادي)',
    email: 'youssef@example.com',
    password: 'pass_youssef',
    role: UserRole.SECTOR_SECRETARY,
    sectorId: 's1',
    avatarUrl: 'https://picsum.photos/200/200?random=2',
  },
  {
    id: 'u3',
    name: 'تاسوني مريم (خادمة)',
    email: 'maryam@example.com',
    password: 'pass_maryam',
    role: UserRole.SERVANT,
    sectorId: 's1',
    avatarUrl: 'https://picsum.photos/200/200?random=3',
  },
  {
    id: 'u4',
    name: 'أستاذ مايكل (خادم)',
    phone: '0122334455',
    password: 'pass_michael',
    role: UserRole.SERVANT,
    sectorId: 's1',
    avatarUrl: 'https://picsum.photos/200/200?random=4',
  },
  {
    id: 'u5',
    name: 'تاسوني دميانة (خادمة)',
    phone: '0100998877',
    password: 'pass_demiana',
    role: UserRole.SERVANT,
    sectorId: 's1',
    avatarUrl: 'https://picsum.photos/200/200?random=5',
  },
  {
    id: 'u6',
    name: 'أستاذ جورج (خادم)',
    role: UserRole.SERVANT,
    password: 'pass_george',
    sectorId: 's1',
    avatarUrl: 'https://picsum.photos/200/200?random=6',
  },
  {
    id: 'u7',
    name: 'تاسوني سارة (خادمة)',
    role: UserRole.SERVANT,
    password: 'pass_sara',
    sectorId: 's1',
    avatarUrl: 'https://picsum.photos/200/200?random=7',
  }
];

// Mock Sectors
export const MOCK_SECTORS: Sector[] = [
  { id: 's1', name: 'قطاع إعدادي بنين', secretaryId: 'u2' },
  { id: 's2', name: 'قطاع ابتدائي', secretaryId: 'u4' },
  { id: 's3', name: 'قطاع ثانوي', secretaryId: 'u5' },
];

// Mock Classes
export const MOCK_CLASSES: ClassGroup[] = [
  { id: 'c1', name: 'فصل القديس أبانوب (١ إعدادي)', sectorId: 's1', servantIds: ['u3', 'u4'] },
  { id: 'c2', name: 'فصل الأنبا أنطونيوس (٢ إعدادي)', sectorId: 's1', servantIds: ['u6'] },
  { id: 'c3', name: 'فصل مارجرجس (٣ إعدادي)', sectorId: 's1', servantIds: ['u7'] },
];

// Mock Students
export const MOCK_STUDENTS: Student[] = [
  { id: 'st1', name: 'بيتر سامي', age: 13, classId: 'c1', sectorId: 's1', phone: '0123456789', address: 'ش شبرا', attendanceRate: 90, lastAttendedDate: '2023-10-22' },
  { id: 'st2', name: 'كيرلس مجدي', age: 13, classId: 'c1', sectorId: 's1', phone: '0100000000', address: 'الخلفاوي', attendanceRate: 45, lastAttendedDate: '2023-09-15' },
  { id: 'st3', name: 'مينا عماد', age: 13, classId: 'c1', sectorId: 's1', phone: '0111111111', address: 'الساحل', attendanceRate: 85, lastAttendedDate: '2023-10-22' },
  { id: 'st4', name: 'جون هاني', age: 13, classId: 'c1', sectorId: 's1', phone: '0122222222', address: 'روض الفرج', attendanceRate: 100, lastAttendedDate: '2023-10-22' },
  { id: 'st5', name: 'ديفيد رامي', age: 13, classId: 'c1', sectorId: 's1', phone: '0155555555', address: 'سانت تريزا', attendanceRate: 20, lastAttendedDate: '2023-08-01', notes: 'يحتاج افتقاد عاجل' },
  { id: 'st6', name: 'أندرو عادل', age: 14, classId: 'c2', sectorId: 's1', phone: '0123123123', address: 'مصر الجديدة', attendanceRate: 75 },
];

export const ATTENDANCE_CHART_DATA = [
  { name: 'الجمعة ١', present: 45, absent: 5 },
  { name: 'الجمعة ٢', present: 40, absent: 10 },
  { name: 'الجمعة ٣', present: 38, absent: 12 },
  { name: 'الجمعة ٤', present: 48, absent: 2 },
];
