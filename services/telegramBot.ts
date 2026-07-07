

// بيانات البوت والمجموعة الافتراضية
const DEFAULT_BOT_TOKEN = "8542760747:AAES3pDOFyfPYp8rBDv4aGysFRDsoMZEsbk"; 
const DEFAULT_CHAT_ID = "-1003660358958"; 

// بيانات بوت الإشعارات الإدارية
const ADMIN_BOT_TOKEN = "8475942227:AAF-kSOGJV1sU0OMf6EdtPlWooiuqxhHU9k";
const ADMIN_CHAT_ID = "5193028423";

// تعريف واجهة الرسالة المحفوظة
interface QueuedMessage {
  id: string;
  token: string;
  formData: { [key: string]: string };
  timestamp: number;
}

// مفتاح التخزين في المتصفح
const QUEUE_STORAGE_KEY = 'khedmaty_telegram_queue';

/**
 * حفظ الرسالة في الطابور عند الفشل
 */
const saveToQueue = (token: string, payload: { [key: string]: string }) => {
  try {
    const queue: QueuedMessage[] = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || '[]');
    const newMessage: QueuedMessage = {
      id: Date.now().toString() + Math.random().toString(),
      token,
      formData: payload,
      timestamp: Date.now()
    };
    queue.push(newMessage);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    console.log("⚠️ No internet/Network Error. Message queued for retry.");
  } catch (e) {
    console.error("Queue save error:", e);
  }
};

/**
 * محاولة إرسال رسالة واحدة
 */
const attemptSend = async (token: string, payload: { [key: string]: string }): Promise<boolean> => {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    // تحويل البيانات لـ FormData لتجاوز مشاكل CORS والمتصفح
    const body = new FormData();
    Object.keys(payload).forEach(key => body.append(key, payload[key]));

    // استخدام no-cors للسماح للمتصفح بإرسال الطلب للسيرفر الخارجي
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      body: body
    });

    return true; // نعتبر الإرسال نجح طالما لم يحدث Network Error
  } catch (error) {
    console.error("Telegram Send Failed:", error);
    return false;
  }
};

/**
 * معالجة الطابور (تعمل تلقائياً)
 */
const processQueue = async () => {
  if (!navigator.onLine) return; // لا تحاول إذا لم يكن هناك إنترنت

  const queueStr = localStorage.getItem(QUEUE_STORAGE_KEY);
  if (!queueStr) return;

  const queue: QueuedMessage[] = JSON.parse(queueStr);
  if (queue.length === 0) return;

  console.log(`🔄 Processing ${queue.length} queued messages...`);

  const remainingQueue: QueuedMessage[] = [];

  for (const msg of queue) {
    const success = await attemptSend(msg.token, msg.formData);
    if (!success) {
      remainingQueue.push(msg); // إذا فشل مرة أخرى، ابقه في الطابور
    } else {
      console.log("✅ Queued message sent successfully.");
    }
  }

  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingQueue));
};

// تشغيل المعالج كل 10 ثواني وعند عودة الإنترنت
setInterval(processQueue, 10000);
window.addEventListener('online', processQueue);

/**
 * الدالة الرئيسية للإرسال
 */
const sendToTelegram = async (message: string, token: string = DEFAULT_BOT_TOKEN, chatId: string = DEFAULT_CHAT_ID) => {
  const payload = {
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown'
  };

  // محاولة الإرسال الفوري
  const success = await attemptSend(token, payload);

  // إذا فشل الإرسال، احفظ في الطابور
  if (!success) {
    saveToQueue(token, payload);
  }
};

// --- دوال التصدير (لم تتغير الواجهة، فقط التنفيذ الداخلي) ---

export const sendTelegramReport = async (
  className: string,
  sectorName: string,
  servantName: string,
  presentNames: string[],
  absentNames: string[],
  date: string,
  totalCount: number
) => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ar-EG');
  const presentCount = presentNames.length;
  const absentCount = absentNames.length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const message = `
📌 *تقرير حضور (مدارس الأحد)*
📅 التاريخ: ${date}
⏰ وقت التسليم: ${timeStr}
👤 *قام بالتسليم:* ${servantName}

📘 الفصل: ${className}
🏢 القطاع: ${sectorName}

📊 *الإحصائيات:*
👥 العدد الكلي: ${totalCount}
✅ حضور: ${presentCount}
❌ غياب: ${absentCount}
📉 نسبة الحضور: ${attendanceRate}%
  `.trim();

  // إرسال للجروب
  await sendToTelegram(message, DEFAULT_BOT_TOKEN, DEFAULT_CHAT_ID);
  
  // إرسال للبوت (الشات الخاص مع الأدمن)
  await sendToTelegram(message, DEFAULT_BOT_TOKEN, ADMIN_CHAT_ID);
};

export const sendSignupNotification = async (name: string, phone: string, role: string) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG');
  const timeStr = now.toLocaleTimeString('ar-EG');

  const message = `
🆕 *تسجيل مستخدم جديد*

👤 الاسم: ${name}
📱 الهاتف: ${phone}
📅 التاريخ: ${dateStr}
⏰ الوقت: ${timeStr}

⚠️ *تنبيه:* المستخدم بانتظار التعيين في فصل أو قطاع.
  `.trim();

  // إرسال إشعارات التسجيل للأدمن فقط
  await sendToTelegram(message, ADMIN_BOT_TOKEN, ADMIN_CHAT_ID);
};

export const sendPreparationNotification = async (
  servantName: string, 
  lessonDate: string, 
  imageCount: number,
  sectorName: string,
  className: string,
  prepType: 'image' | 'text'
) => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ar-EG');
  const dateStr = now.toLocaleDateString('ar-EG');

  const typeText = prepType === 'image' ? `رفع صور (${imageCount})` : 'كتابة التحضير';

  const message = `
📝 *استلام تحضير درس جديد*

👤 الخادم: ${servantName}
📅 تاريخ شرح الدرس: ${lessonDate}
⏰ وقت الإرسال: ${timeStr} (${dateStr})
📂 نوع التحضير: ${typeText}

🏢 القطاع: ${sectorName}
📘 الفصل: ${className}

✅ تم الحفظ في قاعدة البيانات بنجاح.
  `.trim();

  // إرسال للجروب
  await sendToTelegram(message, DEFAULT_BOT_TOKEN, DEFAULT_CHAT_ID);

  // إرسال للبوت (الشات الخاص مع الأدمن)
  await sendToTelegram(message, DEFAULT_BOT_TOKEN, ADMIN_CHAT_ID);
};

export const sendSectorAttendanceNotification = async (
  sectorName: string,
  secretaryName: string,
  date: string,
  presentCount: number,
  absentCount: number,
  totalCount: number
) => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ar-EG');
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const message = `
🏢 *تقرير متابعة الخدام (قطاع)*
📅 التاريخ: ${date}
⏰ وقت التسليم: ${timeStr}
👤 *أمين القطاع:* ${secretaryName}

📍 القطاع: ${sectorName}

📊 *الإحصائيات:*
👥 العدد الكلي: ${totalCount}
✅ حضور: ${presentCount}
❌ غياب: ${absentCount}
📉 نسبة الحضور: ${attendanceRate}%

تم حفظ السجل في النظام.
  `.trim();

  // إرسال للجروب
  await sendToTelegram(message, DEFAULT_BOT_TOKEN, DEFAULT_CHAT_ID);

  // إرسال للبوت (الشات الخاص مع الأدمن)
  await sendToTelegram(message, DEFAULT_BOT_TOKEN, ADMIN_CHAT_ID);
};