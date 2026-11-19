import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaTopScrim, fileToBase64 } from "@hatch/space-sdk/client";
import { actionFields } from "@hatch/space-sdk/fields" with { type: "macro" };
import type { Actions } from "../../server/src/actions";
import { api, type ApiResponse } from "./api";

const FIELDS = actionFields<typeof Actions>();
type Message = ApiResponse<typeof api, "listMessages">["messages"][number];
type CalEvent = ApiResponse<typeof api, "listEvents">["events"][number];
type Folder = "inbox" | "starred" | "sent" | "drafts" | "archive" | "junk" | "trash";
type CatFilter = "all" | "work" | "personal" | "professional";
type Cat = "work" | "personal" | "professional";
type Account = ApiResponse<typeof api, "listAccounts">["accounts"][number];
function catColor(cat: string) { return cat === "work" ? "#334155" : cat === "professional" ? "#6D28D9" : "#0F766E"; }
function catLabel(cat: string) { return cat === "work" ? "💼 Work" : cat === "professional" ? "🏢 Professional" : "🏠 Personal"; }

const FOLDERS: { id: Folder; label: string; icon: string }[] = [
  { id: "inbox", label: "Inbox", icon: "📥" },
  { id: "starred", label: "Starred", icon: "★" },
  { id: "sent", label: "Sent", icon: "➤" },
  { id: "drafts", label: "Drafts", icon: "✎" },
  { id: "archive", label: "Archive", icon: "🗄" },
  { id: "junk", label: "Junk", icon: "⚠" },
  { id: "trash", label: "Trash", icon: "🗑" },
];

function initials(name: string) { return name.split(/\s+/).map(s => s[0]).join("").slice(0, 2).toUpperCase() || "•"; }
function fmtTime(iso: string) {
  const d = new Date(iso); const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
function fmtFull(iso: string) { return new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }); }
function toLocalInput(d: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function dayKey(d: Date) { const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }

function CatBadge({ cat }: { cat: string }) {
  const bg = cat === "work" ? "#E2E8F0" : cat === "professional" ? "#EDE9FE" : "#CCFBF1";
  const fg = cat === "work" ? "#334155" : cat === "professional" ? "#5B21B6" : "#115E59";
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0" style={{ background: bg, color: fg }}>{catLabel(cat)}</span>;
}


export const UI_LANGS = [
  { code: "en", label: "English", native: "English", rtl: false }, { code: "es", label: "Spanish", native: "Español", rtl: false },
  { code: "fr", label: "French", native: "Français", rtl: false }, { code: "de", label: "German", native: "Deutsch", rtl: false },
  { code: "it", label: "Italian", native: "Italiano", rtl: false }, { code: "pt", label: "Portuguese", native: "Português", rtl: false },
  { code: "nl", label: "Dutch", native: "Nederlands", rtl: false }, { code: "sv", label: "Swedish", native: "Svenska", rtl: false },
  { code: "pl", label: "Polish", native: "Polski", rtl: false }, { code: "ru", label: "Russian", native: "Русский", rtl: false },
  { code: "uk", label: "Ukrainian", native: "Українська", rtl: false }, { code: "tr", label: "Turkish", native: "Türkçe", rtl: false },
  { code: "ar", label: "Arabic", native: "العربية", rtl: true }, { code: "fa", label: "Persian", native: "فارسی", rtl: true },
  { code: "ur", label: "Urdu", native: "اردو", rtl: true }, { code: "he", label: "Hebrew", native: "עברית", rtl: true },
  { code: "hi", label: "Hindi", native: "हिन्दी", rtl: false }, { code: "bn", label: "Bengali", native: "বাংলা", rtl: false },
  { code: "zh", label: "Chinese (Simplified)", native: "简体中文", rtl: false }, { code: "zh-TW", label: "Chinese (Traditional)", native: "繁體中文", rtl: false },
  { code: "ja", label: "Japanese", native: "日本語", rtl: false }, { code: "ko", label: "Korean", native: "한국어", rtl: false },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia", rtl: false }, { code: "vi", label: "Vietnamese", native: "Tiếng Việt", rtl: false },
  { code: "th", label: "Thai", native: "ไทย", rtl: false }, { code: "el", label: "Greek", native: "Ελληνικά", rtl: false },
  { code: "cs", label: "Czech", native: "Čeština", rtl: false }, { code: "ro", label: "Romanian", native: "Română", rtl: false },
  { code: "hu", label: "Hungarian", native: "Magyar", rtl: false }, { code: "fi", label: "Finnish", native: "Suomi", rtl: false },
  { code: "da", label: "Danish", native: "Dansk", rtl: false }, { code: "no", label: "Norwegian", native: "Norsk", rtl: false },
] as const;
export const EMAIL_LANGS = ["English","Spanish","French","German","Italian","Portuguese","Dutch","Swedish","Danish","Norwegian","Finnish","Icelandic","Irish","Welsh","Scottish Gaelic","Basque","Catalan","Galician","Polish","Czech","Slovak","Slovenian","Croatian","Serbian","Bosnian","Montenegrin","Macedonian","Bulgarian","Romanian","Hungarian","Greek","Russian","Ukrainian","Belarusian","Lithuanian","Latvian","Estonian","Turkish","Azerbaijani","Georgian","Armenian","Kazakh","Uzbek","Tajik","Kyrgyz","Mongolian","Arabic","Persian (Farsi)","Urdu","Hebrew","Pashto","Dari","Kurdish","Hindi","Bengali","Punjabi","Gujarati","Marathi","Tamil","Telugu","Kannada","Malayalam","Sinhala","Nepali","Urdu","Chinese (Simplified)","Chinese (Traditional)","Cantonese","Japanese","Korean","Thai","Lao","Khmer (Cambodian)","Vietnamese","Indonesian","Malay","Tagalog (Filipino)","Javanese","Sundanese","Burmese (Myanmar)","Amharic","Swahili","Hausa","Yoruba","Igbo","Zulu","Xhosa","Afrikaans","Somali","Malagasy","Shona","Esperanto","Latin","Hawaiian","Maori","Samoan","Tongan"];
type Dict = Record<string, string>;
export const STR: Record<string, Dict> = {
  en: { mail:"Mail", calendar:"Calendar", newMail:"New Mail", newEvent:"New Event", search:"Search mail…", inbox:"Inbox", starred:"Starred", sent:"Sent", drafts:"Drafts", archive:"Archive", junk:"Junk", trash:"Trash", all:"All", work:"Work", personal:"Personal", professional:"Professional", accounts:"Accounts", notifications:"Notifications", markAllRead:"Mark all read", noNotifications:"No notifications", today:"Today", upcoming:"Upcoming", language:"Language" },
  es: { mail:"Correo", calendar:"Calendario", newMail:"Nuevo correo", newEvent:"Nuevo evento", search:"Buscar correo…", inbox:"Bandeja de entrada", starred:"Destacados", sent:"Enviados", drafts:"Borradores", archive:"Archivo", junk:"Spam", trash:"Papelera", all:"Todo", work:"Trabajo", personal:"Personal", professional:"Profesional", accounts:"Cuentas", notifications:"Notificaciones", markAllRead:"Marcar todo como leído", noNotifications:"Sin notificaciones", today:"Hoy", upcoming:"Próximos", language:"Idioma" },
  fr: { mail:"Courrier", calendar:"Calendrier", newMail:"Nouveau message", newEvent:"Nouvel événement", search:"Rechercher…", inbox:"Boîte de réception", starred:"Favoris", sent:"Envoyés", drafts:"Brouillons", archive:"Archives", junk:"Indésirables", trash:"Corbeille", all:"Tout", work:"Travail", personal:"Personnel", professional:"Professionnel", accounts:"Comptes", notifications:"Notifications", markAllRead:"Tout marquer comme lu", noNotifications:"Aucune notification", today:"Aujourd'hui", upcoming:"À venir", language:"Langue" },
  de: { mail:"E-Mail", calendar:"Kalender", newMail:"Neue E-Mail", newEvent:"Neuer Termin", search:"E-Mails suchen…", inbox:"Posteingang", starred:"Markiert", sent:"Gesendet", drafts:"Entwürfe", archive:"Archiv", junk:"Spam", trash:"Papierkorb", all:"Alle", work:"Arbeit", personal:"Privat", professional:"Beruflich", accounts:"Konten", notifications:"Benachrichtigungen", markAllRead:"Alle als gelesen markieren", noNotifications:"Keine Benachrichtigungen", today:"Heute", upcoming:"Anstehend", language:"Sprache" },
  it: { mail:"Posta", calendar:"Calendario", newMail:"Nuovo messaggio", newEvent:"Nuovo evento", search:"Cerca posta…", inbox:"Posta in arrivo", starred:"Speciali", sent:"Inviata", drafts:"Bozze", archive:"Archivio", junk:"Spam", trash:"Cestino", all:"Tutto", work:"Lavoro", personal:"Personale", professional:"Professionale", accounts:"Account", notifications:"Notifiche", markAllRead:"Segna tutto come letto", noNotifications:"Nessuna notifica", today:"Oggi", upcoming:"In arrivo", language:"Lingua" },
  pt: { mail:"Correio", calendar:"Calendário", newMail:"Novo e-mail", newEvent:"Novo evento", search:"Pesquisar correio…", inbox:"Caixa de entrada", starred:"Com estrela", sent:"Enviados", drafts:"Rascunhos", archive:"Arquivo", junk:"Spam", trash:"Lixeira", all:"Tudo", work:"Trabalho", personal:"Pessoal", professional:"Profissional", accounts:"Contas", notifications:"Notificações", markAllRead:"Marcar tudo como lido", noNotifications:"Sem notificações", today:"Hoje", upcoming:"Próximos", language:"Idioma" },
  nl: { mail:"E-mail", calendar:"Agenda", newMail:"Nieuwe e-mail", newEvent:"Nieuwe afspraak", search:"E-mail zoeken…", inbox:"Postvak IN", starred:"Met ster", sent:"Verzonden", drafts:"Concepten", archive:"Archief", junk:"Ongewenst", trash:"Prullenbak", all:"Alles", work:"Werk", personal:"Persoonlijk", professional:"Professioneel", accounts:"Accounts", notifications:"Meldingen", markAllRead:"Alles als gelezen markeren", noNotifications:"Geen meldingen", today:"Vandaag", upcoming:"Aankomend", language:"Taal" },
  ru: { mail:"Почта", calendar:"Календарь", newMail:"Новое письмо", newEvent:"Новое событие", search:"Поиск почты…", inbox:"Входящие", starred:"Отмеченные", sent:"Отправленные", drafts:"Черновики", archive:"Архив", junk:"Спам", trash:"Корзина", all:"Все", work:"Работа", personal:"Личное", professional:"Профессиональное", accounts:"Аккаунты", notifications:"Уведомления", markAllRead:"Отметить всё как прочитанное", noNotifications:"Нет уведомлений", today:"Сегодня", upcoming:"Предстоящие", language:"Язык" },
  uk: { mail:"Пошта", calendar:"Календар", newMail:"Новий лист", newEvent:"Нова подія", search:"Пошук пошти…", inbox:"Вхідні", starred:"Із зірочкою", sent:"Надіслані", drafts:"Чернетки", archive:"Архів", junk:"Спам", trash:"Кошик", all:"Усе", work:"Робота", personal:"Особисте", professional:"Професійне", accounts:"Облікові записи", notifications:"Сповіщення", markAllRead:"Позначити все як прочитане", noNotifications:"Немає сповіщень", today:"Сьогодні", upcoming:"Майбутні", language:"Мова" },
  ar: { mail:"البريد", calendar:"التقويم", newMail:"رسالة جديدة", newEvent:"حدث جديد", search:"بحث في البريد…", inbox:"البريد الوارد", starred:"المميزة", sent:"المرسلة", drafts:"المسودات", archive:"الأرشيف", junk:"البريد المزعج", trash:"المهملات", all:"الكل", work:"العمل", personal:"شخصي", professional:"مهني", accounts:"الحسابات", notifications:"الإشعارات", markAllRead:"تعليم الكل كمقروء", noNotifications:"لا توجد إشعارات", today:"اليوم", upcoming:"القادمة", language:"اللغة" },
  hi: { mail:"मेल", calendar:"कैलेंडर", newMail:"नया मेल", newEvent:"नया कार्यक्रम", search:"मेल खोजें…", inbox:"इनबॉक्स", starred:"तारांकित", sent:"भेजे गए", drafts:"ड्राफ़्ट", archive:"संग्रह", junk:"स्पैम", trash:"कचरा", all:"सभी", work:"कार्य", personal:"व्यक्तिगत", professional:"व्यावसायिक", accounts:"खाते", notifications:"सूचनाएँ", markAllRead:"सभी को पढ़ा हुआ चिह्नित करें", noNotifications:"कोई सूचना नहीं", today:"आज", upcoming:"आगामी", language:"भाषा" },
  zh: { mail:"邮件", calendar:"日历", newMail:"新邮件", newEvent:"新日程", search:"搜索邮件…", inbox:"收件箱", starred:"星标", sent:"已发送", drafts:"草稿箱", archive:"归档", junk:"垃圾邮件", trash:"已删除", all:"全部", work:"工作", personal:"个人", professional:"专业", accounts:"账户", notifications:"通知", markAllRead:"全部标为已读", noNotifications:"暂无通知", today:"今天", upcoming:"即将到来", language:"语言" },
  ja: { mail:"メール", calendar:"カレンダー", newMail:"新規メール", newEvent:"新規予定", search:"メールを検索…", inbox:"受信トレイ", starred:"スター付き", sent:"送信済み", drafts:"下書き", archive:"アーカイブ", junk:"迷惑メール", trash:"ゴミ箱", all:"すべて", work:"仕事", personal:"個人", professional:"プロフェッショナル", accounts:"アカウント", notifications:"通知", markAllRead:"すべて既読にする", noNotifications:"通知はありません", today:"今日", upcoming:"今後の予定", language:"言語" },
  ko: { mail:"메일", calendar:"캘린더", newMail:"새 메일", newEvent:"새 일정", search:"메일 검색…", inbox:"받은편지함", starred:"별표", sent:"보낸편지함", drafts:"임시보관함", archive:"보관", junk:"스팸", trash:"휴지통", all:"전체", work:"업무", personal:"개인", professional:"전문", accounts:"계정", notifications:"알림", markAllRead:"모두 읽음으로 표시", noNotifications:"알림 없음", today:"오늘", upcoming:"예정", language:"언어" },
  tr: { mail:"Posta", calendar:"Takvim", newMail:"Yeni posta", newEvent:"Yeni etkinlik", search:"Posta ara…", inbox:"Gelen Kutusu", starred:"Yıldızlı", sent:"Gönderilmiş", drafts:"Taslaklar", archive:"Arşiv", junk:"İstenmeyen", trash:"Çöp", all:"Tümü", work:"İş", personal:"Kişisel", professional:"Profesyonel", accounts:"Hesaplar", notifications:"Bildirimler", markAllRead:"Tümünü okundu işaretle", noNotifications:"Bildirim yok", today:"Bugün", upcoming:"Yaklaşan", language:"Dil" },
  pl: { mail:"Poczta", calendar:"Kalendarz", newMail:"Nowa wiadomość", newEvent:"Nowe wydarzenie", search:"Szukaj poczty…", inbox:"Skrzynka odbiorcza", starred:"Oznaczone", sent:"Wysłane", drafts:"Wersje robocze", archive:"Archiwum", junk:"Spam", trash:"Kosz", all:"Wszystko", work:"Praca", personal:"Osobiste", professional:"Zawodowe", accounts:"Konta", notifications:"Powiadomienia", markAllRead:"Oznacz wszystko jako przeczytane", noNotifications:"Brak powiadomień", today:"Dzisiaj", upcoming:"Nadchodzące", language:"Język" },
  id: { mail:"Surat", calendar:"Kalender", newMail:"Surat baru", newEvent:"Acara baru", search:"Cari surat…", inbox:"Kotak Masuk", starred:"Berbintang", sent:"Terkirim", drafts:"Draf", archive:"Arsip", junk:"Spam", trash:"Sampah", all:"Semua", work:"Kerja", personal:"Pribadi", professional:"Profesional", accounts:"Akun", notifications:"Notifikasi", markAllRead:"Tandai semua dibaca", noNotifications:"Tidak ada notifikasi", today:"Hari ini", upcoming:"Mendatang", language:"Bahasa" },
  vi: { mail:"Thư", calendar:"Lịch", newMail:"Thư mới", newEvent:"Sự kiện mới", search:"Tìm thư…", inbox:"Hộp thư đến", starred:"Có gắn sao", sent:"Đã gửi", drafts:"Bản nháp", archive:"Lưu trữ", junk:"Thư rác", trash:"Thùng rác", all:"Tất cả", work:"Công việc", personal:"Cá nhân", professional:"Chuyên nghiệp", accounts:"Tài khoản", notifications:"Thông báo", markAllRead:"Đánh dấu tất cả đã đọc", noNotifications:"Không có thông báo", today:"Hôm nay", upcoming:"Sắp tới", language:"Ngôn ngữ" },
  th: { mail:"จดหมาย", calendar:"ปฏิทิน", newMail:"จดหมายใหม่", newEvent:"กิจกรรมใหม่", search:"ค้นหาจดหมาย…", inbox:"กล่องขาเข้า", starred:"ติดดาว", sent:"ส่งแล้ว", drafts:"ฉบับร่าง", archive:"เก็บถาวร", junk:"จดหมายขยะ", trash:"ถังขยะ", all:"ทั้งหมด", work:"งาน", personal:"ส่วนตัว", professional:"มืออาชีพ", accounts:"บัญชี", notifications:"การแจ้งเตือน", markAllRead:"ทำเครื่องหมายว่าอ่านทั้งหมด", noNotifications:"ไม่มีการแจ้งเตือน", today:"วันนี้", upcoming:"กำลังจะมาถึง", language:"ภาษา" },
};
export function uiStr(lang: string, key: string): string { return STR[lang]?.[key] ?? STR["en"]?.[key] ?? key; }

function Avatar({ account, name, size = 40 }: { account?: Account | null; name: string; size?: number }) {
  if (account?.avatarUrl) return <img src={account.avatarUrl} alt={`Profile picture for ${account.email}`} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  return <span className="rounded-full grid place-items-center font-bold text-white shrink-0" style={{ width: size, height: size, background: catColor(account?.type ?? "work"), fontSize: Math.max(11, size * 0.34) }}>{initials(name)}</span>;
}
type ComposeState = { id: number | null; accountId: number | null; to: string; cc: string; subject: string; body: string; category: Cat };
type EventState = { id: number | null; accountId: number | null; title: string; description: string; location: string; start: string; end: string; allDay: boolean; category: Cat; color: string };
type AccountState = { id: number | null; displayName: string; email: string; type: Cat; organization: string; incomingProtocol: "imap"|"pop3"|"none"; incomingServer: string; incomingPort: number; incomingUsername: string; incomingPassword: string; incomingUseTls: boolean; smtpServer: string; smtpPort: number; smtpUsername: string; smtpPassword: string; smtpUseTls: boolean; signature: string; autoReplyEnabled: boolean; autoReplySubject: string; autoReplyBody: string };
type ChatMsg = { role: "user" | "assistant"; content: string };

export function App() {
  const qc = useQueryClient();
  const [view, setView] = useState<"mail" | "calendar">("mail");
  const [folder, setFolder] = useState<Folder>("inbox");
  const [catFilter, setCatFilter] = useState<CatFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [compose, setCompose] = useState<ComposeState | null>(null);
  const [composeError, setComposeError] = useState("");
  const [eventEdit, setEventEdit] = useState<EventState | null>(null);
  const [eventError, setEventError] = useState("");
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [recv, setRecv] = useState({ fromName: "", fromEmail: "", subject: "", body: "", category: "work" as Cat });
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([{ role: "assistant", content: "Good day. I am Foxmail, your assistant. I would be pleased to help you draft correspondence, summarise your inbox, or arrange calendar events. Please let me know how I may assist you." }]);
  const [chatInput, setChatInput] = useState("");
  const [pendingDraft, setPendingDraft] = useState<{ subject: string; body: string; category: Cat } | null>(null);
  const [pendingEvent, setPendingEvent] = useState<{ title: string; location: string; description: string } | null>(null);
  const [summary, setSummary] = useState<{ summary: string; bullets: string[]; urgent: string[] } | null>(null);
  const [lang, setLang] = useState<string>(() => { try { return localStorage.getItem("foxmail-lang") || "en"; } catch { return "en"; } });
  const tr = (k: string) => uiStr(lang, k);
  const isRtl = UI_LANGS.find(l=>l.code===lang)?.rtl ?? false;
  const [emailLang, setEmailLang] = useState("English");
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [accountEdit, setAccountEdit] = useState<AccountState | null>(null);
  const [accountError, setAccountError] = useState("");
  const [calCursor, setCalCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));

  const accountsQ = useQuery({ queryKey: ["accounts"], queryFn: () => api.listAccounts({}) });
  const accounts = accountsQ.data?.accounts ?? [];
  const activeAccount: Account | undefined = accounts.find(a => a.id === selectedAccountId);
  const notifQ = useQuery({ queryKey: ["notifications"], queryFn: () => api.listNotifications({ limit: 50 }) });
  const markAllReadMut = useMutation({ mutationFn: () => api.markNotificationsRead({ id: null }), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  const countsQ = useQuery({ queryKey: ["counts"], queryFn: () => api.getCounts({}) });
  const messagesQ = useQuery({ queryKey: ["messages", folder, catFilter, selectedAccountId, search], queryFn: () => api.listMessages({ folder, category: catFilter, accountId: selectedAccountId, search, limit: 100 }) });
  const eventsQ = useQuery({ queryKey: ["events", catFilter, selectedAccountId], queryFn: () => api.listEvents({ category: catFilter, accountId: selectedAccountId }) });

  const messages = messagesQ.data?.messages ?? [];
  const events = eventsQ.data?.events ?? [];
  const selected: Message | undefined = messages.find(m => m.id === selectedId) ?? messages[0];

  const invalidate = () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["accounts"] }); qc.invalidateQueries({ queryKey: ["messages"] }); qc.invalidateQueries({ queryKey: ["counts"] }); qc.invalidateQueries({ queryKey: ["events"] }); };
  const updMsg = useMutation({ mutationFn: (a: { id: number; isRead?: boolean | null; isStarred?: boolean | null; folder?: Folder | null; category?: Cat | null }) => api.updateMessage({ id: a.id, isRead: a.isRead ?? null, isStarred: a.isStarred ?? null, folder: a.folder ?? null, category: a.category ?? null }), onSuccess: invalidate });
  const delMsg = useMutation({ mutationFn: (id: number) => api.deleteMessage({ id }), onSuccess: () => { setSelectedId(null); invalidate(); } });
  const sendMut = useMutation({ mutationFn: async (c: ComposeState) => await api.sendEmail({ id: c.id, accountId: c.accountId, toRecipients: c.to, ccRecipients: c.cc, subject: c.subject, body: c.body, category: c.category }), onSuccess: () => { setCompose(null); setFolder("sent"); invalidate(); } });
  const draftMut = useMutation({ mutationFn: async (c: ComposeState) => await api.saveDraft({ id: c.id, accountId: c.accountId, toRecipients: c.to, ccRecipients: c.cc, subject: c.subject, body: c.body, category: c.category }), onSuccess: () => { setCompose(null); setFolder("drafts"); invalidate(); } });
  const recvMut = useMutation({ mutationFn: () => api.createInboxMessage({ accountId: selectedAccountId, fromName: recv.fromName, fromEmail: recv.fromEmail, subject: recv.subject, body: recv.body, category: recv.category }), onSuccess: () => { setReceiveOpen(false); setRecv({ fromName: "", fromEmail: "", subject: "", body: "", category: "work" }); setFolder("inbox"); invalidate(); } });
  const [avatarBusy, setAvatarBusy] = useState(false);
  const uploadAvatarMut = useMutation({ mutationFn: async (args: { accountId: number; dataBase64: string; mimeType: string }) => await api.uploadAvatar(args), onSuccess: invalidate });
  const removeAvatarMut = useMutation({ mutationFn: (accountId: number) => api.removeAvatar({ accountId }), onSuccess: invalidate });
  const handleAvatarFile = async (accountId: number | null, file: File | undefined, isNewAccount: boolean) => {
    if (!file) return;
    if (!accountId) { setAccountError("Please save the account first, then add its profile picture here in Settings."); return; }
    setAvatarBusy(true);
    try { const { dataBase64, mimeType } = await fileToBase64(file); await uploadAvatarMut.mutateAsync({ accountId, dataBase64, mimeType }); } finally { setAvatarBusy(false); }
  };
  const saveAccountMut = useMutation({ mutationFn: async (a: AccountState) => a.id ? await api.updateAccount({ id: a.id, displayName: a.displayName, email: a.email, type: a.type, organization: a.organization, incomingProtocol: a.incomingProtocol, incomingServer: a.incomingServer, incomingPort: a.incomingPort, incomingUsername: a.incomingUsername, incomingPassword: a.incomingPassword, incomingUseTls: a.incomingUseTls, smtpServer: a.smtpServer, smtpPort: a.smtpPort, smtpUsername: a.smtpUsername, smtpPassword: a.smtpPassword, smtpUseTls: a.smtpUseTls, signature: a.signature, autoReplyEnabled: a.autoReplyEnabled, autoReplySubject: a.autoReplySubject, autoReplyBody: a.autoReplyBody }) : await api.createAccount({ displayName: a.displayName, email: a.email, type: a.type, organization: a.organization, incomingProtocol: a.incomingProtocol, incomingServer: a.incomingServer, incomingPort: a.incomingPort, incomingUsername: a.incomingUsername, incomingPassword: a.incomingPassword, incomingUseTls: a.incomingUseTls, smtpServer: a.smtpServer, smtpPort: a.smtpPort, smtpUsername: a.smtpUsername, smtpPassword: a.smtpPassword, smtpUseTls: a.smtpUseTls, signature: a.signature, autoReplyEnabled: a.autoReplyEnabled, autoReplySubject: a.autoReplySubject, autoReplyBody: a.autoReplyBody }), onSuccess: (_d, a) => { setAccountEdit(null); invalidate(); if (!a.id) { /* new account will appear in switcher */ } } });
  const delAccountMut = useMutation({ mutationFn: (id: number) => api.deleteAccount({ id }), onSuccess: () => { setSelectedAccountId(null); invalidate(); } });
  const openAccount = (prefill?: Partial<AccountState>) => { setAccountError(""); setAccountEdit({ id: null, displayName: "", email: "", type: "professional", organization: "", incomingProtocol: "imap", incomingServer: "", incomingPort: 993, incomingUsername: "", incomingPassword: "", incomingUseTls: true, smtpServer: "", smtpPort: 587, smtpUsername: "", smtpPassword: "", smtpUseTls: true, signature: "", autoReplyEnabled: false, autoReplySubject: "Out of office", autoReplyBody: "", ...prefill }); };
  const createEvt = useMutation({ mutationFn: async (e: EventState) => e.id ? await api.updateEvent({ id: e.id, accountId: e.accountId, title: e.title, description: e.description, location: e.location, startAt: new Date(e.start).toISOString(), endAt: new Date(e.end).toISOString(), allDay: e.allDay, category: e.category, color: e.color }) : await api.createEvent({ accountId: e.accountId, title: e.title, description: e.description, location: e.location, startAt: new Date(e.start).toISOString(), endAt: new Date(e.end).toISOString(), allDay: e.allDay, category: e.category, color: e.color }), onSuccess: () => { setEventEdit(null); invalidate(); } });
  const delEvt = useMutation({ mutationFn: (id: number) => api.deleteEvent({ id }), onSuccess: invalidate });
  const summaryMut = useMutation({ mutationFn: () => api.summarizeInbox({ category: catFilter }), onSuccess: (d) => setSummary(d) });
  const aiDraftMut = useMutation({ mutationFn: (prompt: string) => api.draftEmailAI({ prompt, language: emailLang, category: compose?.category ?? (catFilter === "personal" ? "personal" : catFilter === "professional" ? "professional" : "work"), recipient: compose?.to ?? "" }), onSuccess: (d) => { if (compose) setCompose({ ...compose, subject: d.subject, body: d.body }); } });
  const [aiPrompt, setAiPrompt] = useState("");
  const chatMut = useMutation({
    mutationFn: async (msg: string) => await api.assistantChat({ message: msg, category: catFilter, history: chat.slice(-10) }),
    onSuccess: (d) => {
      setChat(prev => [...prev, { role: "assistant", content: d.reply }]);
      if (d.draftSubject || d.draftBody) setPendingDraft({ subject: d.draftSubject ?? "", body: d.draftBody ?? "", category: d.draftCategory === "personal" ? "personal" : d.draftCategory === "professional" ? "professional" : "work" });
      if (d.eventTitle) setPendingEvent({ title: d.eventTitle, location: d.eventLocation ?? "", description: d.eventDescription ?? "" });
    },
  });

  const countFor = (f: Folder, cat: CatFilter = catFilter) => {
    const counts = countsQ.data?.counts ?? [];
    if (f === "starred") return messages.filter(m => m.isStarred).length && cat === "all" ? counts.reduce((s, c) => s, 0) : 0;
    return counts.filter(c => c.folder === f && (cat === "all" || c.category === cat)).reduce((s, c) => s + c.total, 0);
  };
  const unreadFor = (f: Folder) => (countsQ.data?.counts ?? []).filter(c => c.folder === f && (catFilter === "all" || c.category === catFilter) && (!selectedAccountId || c.accountId === selectedAccountId)).reduce((s, c) => s + c.unread, 0);
  const unreadForAccount = (aid: number) => (countsQ.data?.counts ?? []).filter(c => c.folder === "inbox" && c.accountId === aid).reduce((s, c) => s + c.unread, 0);
  const folderTotal = (f: Folder) => {
    if (f === "starred") return undefined;
    return (countsQ.data?.counts ?? []).filter(c => c.folder === f && (catFilter === "all" || c.category === catFilter) && (!selectedAccountId || c.accountId === selectedAccountId)).reduce((s, c) => s + c.total, 0);
  };

  const openCompose = (prefill?: Partial<ComposeState>) => { setComposeError(""); const acct = accounts.find(a => a.id === (prefill?.accountId ?? selectedAccountId)) ?? accounts.find(a => catFilter !== "all" && a.type === catFilter) ?? accounts[0]; setCompose({ id: null, accountId: acct?.id ?? null, to: "", cc: "", subject: "", body: "", category: (acct?.type as Cat) ?? "work", ...prefill }); };
  const openEvent = (prefill?: Partial<EventState>, forDay?: string) => {
    setEventError("");
    const base = forDay ? new Date(`${forDay}T10:00:00`) : new Date(); if (!forDay) base.setMinutes(0, 0, 0);
    const end = new Date(base.getTime() + 3600000);
    setEventEdit({ id: null, accountId: selectedAccountId, title: "", description: "", location: "", start: toLocalInput(base), end: toLocalInput(end), allDay: false, category: catFilter === "personal" ? "personal" : catFilter === "professional" ? "professional" : "work", color: "#EA580C", ...prefill });
  };
  const selectMessage = (m: Message) => { setSelectedId(m.id); if (!m.isRead) updMsg.mutate({ id: m.id, isRead: true }); if (m.folder === "drafts") { /* keep selection; edit via button */ } };

  // Calendar grid
  const calDays = useMemo(() => {
    const y = calCursor.getFullYear(), mo = calCursor.getMonth();
    const first = new Date(y, mo, 1); const startOffset = first.getDay();
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < startOffset; i++) cells.push({ date: new Date(y, mo, i - startOffset + 1), inMonth: false });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(y, mo, d), inMonth: true });
    while (cells.length % 7 !== 0) cells.push({ date: new Date(y, mo + 1, cells.length - daysInMonth - startOffset + 1), inMonth: false });
    return cells;
  }, [calCursor]);
  const eventsOn = (key: string) => events.filter(e => dayKey(new Date(e.startAt)) === key);
  const selectedDayEvents = eventsOn(selectedDay);
  const todayEvents = eventsOn(dayKey(new Date()));

  const sendChat = () => { const t = chatInput.trim(); if (!t || chatMut.isPending) return; setChat(prev => [...prev, { role: "user", content: t }]); setChatInput(""); chatMut.mutate(t); };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
      <SafeAreaTopScrim backgroundColor="var(--bg)" />
      {/* Toolbar */}
      <header className="sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--border)] pt-safe">
        <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
          <div className="flex items-center gap-2 mr-1">
            <span className="w-8 h-8 rounded-lg bg-[#EA580C] text-white grid place-items-center font-bold text-lg" aria-hidden>🦊</span>
            <span className="font-bold text-[17px] hidden sm:block">FoxMail</span>
            {(activeAccount ?? accounts[0]) && <span className="hidden sm:flex items-center gap-1.5 ml-1"><Avatar account={activeAccount ?? accounts[0]} name={(activeAccount ?? accounts[0])!.displayName || (activeAccount ?? accounts[0])!.email} size={30} /><span className="text-xs text-[var(--dim)] max-w-[140px] truncate hidden lg:block">{(activeAccount ?? accounts[0])!.email}</span></span>}
          </div>
          <nav aria-label="Main views" className="flex bg-[var(--surface2)] border border-[var(--border)] rounded-full p-0.5">
            <button aria-label="Mail view" onClick={() => setView("mail")} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${view === "mail" ? "bg-[#EA580C] text-white" : ""}`}>✉ {tr("mail")}</button>
            <button aria-label="Calendar view" onClick={() => setView("calendar")} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${view === "calendar" ? "bg-[#EA580C] text-white" : ""}`}>📅 {tr("calendar")}{countsQ.data ? ` (${countsQ.data.upcomingEvents})` : ""}</button>
          </nav>
          <div className="flex bg-[var(--surface2)] border border-[var(--border)] rounded-full p-0.5" role="group" aria-label="Work or Personal filter">
            {(["all", "work", "personal", "professional"] as CatFilter[]).map(c => (
              <button key={c} aria-label={`Show ${c}`} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded-full text-[13px] font-semibold capitalize ${catFilter === c ? "bg-[var(--text)] text-[var(--bg)]" : ""}`}>{c === "all" ? tr("all") : `${c === "work" ? "💼" : c === "professional" ? "🏢" : "🏠"} ${tr(c)}`}</button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-sm"><span className="sr-only">Active email account</span><select aria-label="Active email account" value={selectedAccountId ?? ""} onChange={e => { const v = e.target.value ? Number(e.target.value) : null; setSelectedAccountId(v); const a = accounts.find(x=>x.id===v); if (a) setCatFilter(a.type as CatFilter); setSelectedId(null); }} className="border border-[var(--border)] rounded-full px-3 py-2 bg-[var(--surface2)] text-sm font-semibold max-w-[240px]"><option value="">All accounts</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.displayName} — {a.email}{a.organization ? ` (${a.organization})` : ""}</option>)}</select></label>
          <div className="flex-1 min-w-[140px]">
            <input aria-label="Search mail" {...FIELDS.listMessages.search} placeholder={tr("search")} value={search} onChange={e => { setSearch(e.target.value); setView("mail"); }} className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-full px-4 py-2 text-sm outline-none" />
          </div>
          <label className="flex items-center gap-1 text-sm"><span aria-hidden>🌐</span><select aria-label="Interface language" value={lang} onChange={e => { setLang(e.target.value); try { localStorage.setItem("foxmail-lang", e.target.value); } catch {} }} className="border border-[var(--border)] rounded-full px-2 py-2 bg-[var(--surface2)] text-sm max-w-[150px]">{UI_LANGS.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}</select></label>
          <button aria-label="Notifications" onClick={() => setNotifOpen(true)} className="relative px-3 py-2 rounded-full border border-[var(--border)] text-sm font-semibold">🔔{notifQ.data && notifQ.data.unread > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{notifQ.data.unread}</span>}</button>
          <button aria-label="Ask Foxmail assistant" onClick={() => setAssistantOpen(true)} className="px-3 py-2 rounded-full bg-[#FFF7ED] border border-orange-200 text-[#9A3412] text-sm font-semibold">✦ Foxmail</button>
          {view === "mail" ? (
            <button aria-label="New mail" onClick={() => openCompose()} className="px-4 py-2 rounded-full bg-[#EA580C] text-white text-sm font-bold shadow-sm">+ {tr("newMail")}</button>
          ) : (
            <button aria-label="New event" onClick={() => openEvent(undefined, selectedDay)} className="px-4 py-2 rounded-full bg-[#EA580C] text-white text-sm font-bold shadow-sm">+ {tr("newEvent")}</button>
          )}
        </div>
      </header>

      {view === "mail" ? (
        <div className="flex-1 flex min-h-0">
          {/* Sidebar */}
          <aside className="hidden md:flex flex-col w-[248px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-3 gap-4 overflow-y-auto" aria-label="Folders">
            <div>
              <div className="flex items-center justify-between px-1 mb-1.5"><p className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)]">Accounts</p><button aria-label="Add email account" onClick={() => openAccount()} className="text-[13px] font-bold text-[#EA580C]">+ Add</button></div>
              <button aria-label="All accounts" onClick={() => { setSelectedAccountId(null); setCatFilter("all"); setSelectedId(null); }} className={`w-full text-left px-2 py-2 rounded-lg text-sm ${!selectedAccountId && catFilter === "all" ? "bg-orange-50 font-semibold" : ""}`}>All accounts <span className="text-xs text-[var(--dim)]">· {accounts.length}</span></button>
              {accounts.map(a => (
                <div key={a.id} className={`rounded-lg ${selectedAccountId === a.id ? "bg-orange-50" : ""}`}>
                  <button aria-label={`Switch to account ${a.email}`} onClick={() => { setSelectedAccountId(a.id); setCatFilter(a.type as CatFilter); setSelectedId(null); }} className="w-full text-left px-2 py-2">
                    <span className="flex items-center gap-2"><Avatar account={a} name={a.displayName || a.email} size={28} /><span className="flex-1 min-w-0"><span className="block text-sm font-semibold truncate">{a.displayName}{a.organization ? ` · ${a.organization}` : ""}</span><span className="block text-xs text-[var(--dim)] truncate">{a.email}</span></span>{unreadForAccount(a.id) > 0 && <span className="bg-[#EA580C] text-white text-[11px] font-bold rounded-full px-1.5 py-0.5">{unreadForAccount(a.id)}</span>}</span>
                    <span className="flex gap-1.5 mt-1 ml-9 items-center"><CatBadge cat={a.type} />{a.type === "professional" && <span className="text-[11px] text-[var(--dim)]">{a.incomingProtocol.toUpperCase()}{a.incomingServer ? ` · ${a.incomingServer}` : " · not linked"}</span>}</span>
                  </button>
                  <div className="flex gap-2 px-2 pb-1.5 ml-9"><button aria-label={`Edit account ${a.email}`} onClick={() => openAccount({ id: a.id, displayName: a.displayName, email: a.email, type: a.type as Cat, organization: a.organization, incomingProtocol: a.incomingProtocol as AccountState["incomingProtocol"], incomingServer: a.incomingServer, incomingPort: a.incomingPort, incomingUsername: a.incomingUsername, incomingPassword: "", incomingUseTls: a.incomingUseTls, smtpServer: a.smtpServer, smtpPort: a.smtpPort, smtpUsername: a.smtpUsername, smtpPassword: "", smtpUseTls: a.smtpUseTls, signature: a.signature, autoReplyEnabled: a.autoReplyEnabled, autoReplySubject: a.autoReplySubject, autoReplyBody: a.autoReplyBody })} className="text-xs font-semibold underline">Settings</button><button aria-label={`Delete account ${a.email}`} onClick={() => delAccountMut.mutate(a.id)} className="text-xs font-semibold text-red-700 underline">Remove</button></div>
                </div>
              ))}
              <p className="text-[11px] text-[var(--dim)] px-2 mt-1">Each account has its own Inbox, Drafts, Sent &amp; folders. Professional links use IMAP by default (POP3 also supported) + SMTP.</p>
            </div>
            {(["all", "work", "personal", "professional"] as const).map(section => (
              <div key={section}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--dim)] px-2 mb-1">{section === "all" ? "Mailbox" : catLabel(section)}</p>
                {FOLDERS.map(f => {
                  const total = section === "all" ? folderTotal(f.id) : (countsQ.data?.counts ?? []).filter(c => c.folder === f.id && c.category === section).reduce((s, c) => s + c.total, 0);
                  const unread = section === "all" ? unreadFor(f.id) : (countsQ.data?.counts ?? []).filter(c => c.folder === f.id && c.category === section).reduce((s, c) => s + c.unread, 0);
                  return (
                    <button key={f.id} aria-label={`${f.label} folder`} onClick={() => { setFolder(f.id); if (section !== "all") setCatFilter(section); setSelectedId(null); }} className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left ${folder === f.id && (section === "all" || catFilter === section) ? "bg-orange-50 font-semibold text-[#9A3412]" : ""}`}>
                      <span aria-hidden>{f.icon}</span><span className="flex-1">{f.label}</span>
                      {unread > 0 && <span className="bg-[#EA580C] text-white text-[11px] font-bold rounded-full px-1.5 py-0.5">{unread}</span>}
                      {total !== undefined && <span className="text-xs text-[var(--dim)]">{total}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
            <button aria-label="Add received message" onClick={() => setReceiveOpen(true)} className="mt-auto text-left px-2 py-2 text-sm text-[var(--dim)] underline">Log a received message…</button>
            <div className="rounded-xl bg-[var(--surface2)] border border-[var(--border)] p-3">
              <p className="text-[13px] font-bold">Today</p>
              <p className="text-[13px] text-[var(--dim)] mt-1">{todayEvents.length ? todayEvents.map(e => `${e.title} · ${new Date(e.startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`).join("\n") : "No events today."}</p>
              <button aria-label="View calendar" onClick={() => setView("calendar")} className="text-[13px] font-semibold text-[#EA580C] mt-2">Open calendar →</button>
            </div>
          </aside>

          {/* List + reading pane */}
          <div className="flex-1 flex min-w-0">
            <section className={`${selectedId ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-[380px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)]`} aria-label="Message list">
              {/* Mobile folder chips */}
              <div className="md:hidden flex gap-1.5 px-3 py-2 overflow-x-auto border-b border-[var(--border)]">
                {FOLDERS.map(f => (
                  <button key={f.id} aria-label={`${f.label} folder`} onClick={() => { setFolder(f.id); setSelectedId(null); }} className={`px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap border ${folder === f.id ? "bg-[#EA580C] text-white border-transparent" : "border-[var(--border)]"}`}>{f.label}{f.id === "inbox" && unreadFor("inbox") > 0 ? ` (${unreadFor("inbox")})` : ""}</button>
                ))}
              </div>
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-baseline justify-between">
                <h1 className="text-lg font-bold capitalize">{folder}{catFilter !== "all" ? ` · ${catFilter}` : ""}</h1>
                <span className="text-xs text-[var(--dim)]">{messages.length} message{messages.length === 1 ? "" : "s"}</span>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
                {messagesQ.isPending && <p className="p-4 text-sm text-[var(--dim)]">Loading your mail…</p>}
                {messagesQ.isError && <p className="p-4 text-sm">We could not load your mail. Please try again.</p>}
                {!messagesQ.isPending && messages.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="text-3xl" aria-hidden>✉️</p>
                    <p className="font-semibold mt-2">No messages here</p>
                    <p className="text-sm text-[var(--dim)] mt-1">This {folder} view is empty{catFilter !== "all" ? ` for ${catFilter}` : ""}. Compose a new message to get started.</p>
                    <button aria-label="Compose first message" onClick={() => openCompose()} className="mt-3 px-4 py-2 rounded-full bg-[#EA580C] text-white text-sm font-bold">Compose</button>
                  </div>
                )}
                {messages.map(m => (
                  <button key={m.id} aria-label={`Message: ${m.subject} from ${folder === "sent" || folder === "drafts" ? m.toRecipients || "—" : m.fromName}`} onClick={() => selectMessage(m)} className={`w-full text-left px-4 py-3 flex gap-3 ${selected?.id === m.id ? "bg-orange-50/70" : ""} ${!m.isRead ? "bg-[var(--surface)]" : "bg-[var(--surface2)]/60"}`}>
                    {(folder === "sent" || folder === "drafts") ? <Avatar account={accounts.find(a=>a.id===m.accountId) ?? accounts.find(a=>a.type===m.category)} name={m.fromName} size={40} /> : <span className="w-10 h-10 rounded-full grid place-items-center text-[13px] font-bold text-white shrink-0" style={{ background: catColor(m.category) }}>{initials(m.fromName)}</span>}
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className={`flex-1 truncate text-sm ${!m.isRead ? "font-bold" : "font-medium"}`}>{folder === "sent" || folder === "drafts" ? (m.toRecipients || "(No recipient)") : m.fromName}</span>
                        <span className="text-[11px] text-[var(--dim)] shrink-0">{fmtTime(m.createdAt)}</span>
                      </span>
                      <span className={`block truncate text-sm ${!m.isRead ? "font-semibold" : ""}`}>{m.subject}</span>
                      <span className="block truncate text-[13px] text-[var(--dim)]">{m.body.replace(/\n/g, " ").slice(0, 90) || "—"}</span>
                      <span className="flex gap-1.5 mt-1 items-center"><CatBadge cat={m.category} />{m.isStarred && <span aria-label="Starred" className="text-amber-500 text-sm">★</span>}{!m.isRead && <span className="w-2 h-2 rounded-full bg-[#EA580C]" aria-label="Unread" />}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className={`${selectedId ? "flex" : "hidden lg:flex"} flex-1 flex-col bg-[var(--surface)] min-w-0`} aria-label="Reading pane">
              {selected ? (
                <>
                  <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] flex-wrap">
                    <button aria-label="Back to list" onClick={() => setSelectedId(null)} className="lg:hidden px-2 py-1 text-sm font-semibold">← Back</button>
                    <button aria-label="Reply" onClick={() => openCompose({ to: selected.fromEmail, subject: `Re: ${selected.subject}`, category: selected.category as Cat, body: `\n\n———\nOn ${fmtFull(selected.createdAt)}, ${selected.fromName} wrote:\n${selected.body.split("\n").map(l => `> ${l}`).join("\n")}` })} className="px-3 py-1.5 rounded-full border border-[var(--border)] text-sm font-semibold">↩ Reply</button>
                    <button aria-label="Forward" onClick={() => openCompose({ subject: `Fwd: ${selected.subject}`, category: selected.category as Cat, body: `\n\n——— Forwarded message ———\nFrom: ${selected.fromName} <${selected.fromEmail}>\nSubject: ${selected.subject}\n\n${selected.body}` })} className="px-3 py-1.5 rounded-full border border-[var(--border)] text-sm font-semibold">Forward</button>
                    <button aria-label={selected.isStarred ? "Unstar" : "Star"} onClick={() => updMsg.mutate({ id: selected.id, isStarred: !selected.isStarred })} className="px-3 py-1.5 rounded-full border border-[var(--border)] text-sm">{selected.isStarred ? "★ Starred" : "☆ Star"}</button>
                    <button aria-label="Mark unread" onClick={() => updMsg.mutate({ id: selected.id, isRead: false })} className="px-3 py-1.5 rounded-full border border-[var(--border)] text-sm">Mark unread</button>
                    {selected.folder !== "archive" && <button aria-label="Archive" onClick={() => { updMsg.mutate({ id: selected.id, folder: "archive" }); setSelectedId(null); }} className="px-3 py-1.5 rounded-full border border-[var(--border)] text-sm">Archive</button>}
                    <button aria-label="Move to other category" onClick={() => updMsg.mutate({ id: selected.id, category: selected.category === "work" ? "personal" : "work" })} className="px-3 py-1.5 rounded-full border border-[var(--border)] text-sm">Move to {selected.category === "work" ? "Personal" : "Work"}</button>
                    {selected.folder === "drafts" && <button aria-label="Edit draft" onClick={() => setCompose({ id: selected.id, accountId: selected.accountId, to: selected.toRecipients, cc: selected.ccRecipients, subject: selected.subject, body: selected.body, category: selected.category as Cat })} className="px-3 py-1.5 rounded-full bg-[#EA580C] text-white text-sm font-bold">Edit draft</button>}
                    {selected.folder !== "trash" ? (
                      <button aria-label="Delete message" onClick={() => { updMsg.mutate({ id: selected.id, folder: "trash" }); setSelectedId(null); }} className="px-3 py-1.5 rounded-full border border-red-200 text-red-700 text-sm">Delete</button>
                    ) : (
                      <button aria-label="Delete permanently" onClick={() => delMsg.mutate(selected.id)} className="px-3 py-1.5 rounded-full bg-red-600 text-white text-sm font-bold">Delete permanently</button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 max-w-3xl w-full mx-auto">
                    <h2 className="text-xl font-bold leading-snug">{selected.subject}</h2>
                    <div className="flex items-start gap-3 mt-4 pb-4 border-b border-[var(--border)]">
                      {(selected.folder === "sent" || selected.folder === "drafts") ? <Avatar account={accounts.find(a=>a.id===selected.accountId) ?? accounts.find(a=>a.type===selected.category)} name={selected.fromName} size={44} /> : <span className="w-11 h-11 rounded-full grid place-items-center font-bold text-white shrink-0" style={{ background: catColor(selected.category) }}>{initials(selected.fromName)}</span>}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm">{selected.fromName} <span className="font-normal text-[var(--dim)]">&lt;{selected.fromEmail}&gt;</span></p>
                        <p className="text-[13px] text-[var(--dim)]">To: {selected.toRecipients || "me"}{selected.ccRecipients ? ` · Cc: ${selected.ccRecipients}` : ""}</p>
                        <p className="text-[13px] text-[var(--dim)]">{fmtFull(selected.createdAt)}</p>
                      </div>
                      <CatBadge cat={selected.category} />
                    </div>
                    <div className="whitespace-pre-wrap text-[15px] leading-relaxed mt-4">{selected.body || <span className="text-[var(--dim)]">(No content)</span>}</div>
                    <div className="mt-8 rounded-xl border border-orange-200 bg-[#FFF7ED] p-4 flex flex-wrap items-center gap-3">
                      <p className="text-sm flex-1 min-w-[200px]"><strong>Foxmail can help:</strong> ask for a formal reply draft or a summary of this thread.</p>
                      <button aria-label="Ask Foxmail about this message" onClick={() => { setAssistantOpen(true); setChatInput(`Please draft a formal reply to: ${selected.subject}`); }} className="px-3 py-2 rounded-full bg-[#EA580C] text-white text-sm font-bold">Ask Foxmail ✦</button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 grid place-items-center p-8 text-center"><div><p className="text-4xl" aria-hidden>🦊</p><p className="font-semibold mt-3">Select a message to read it here</p><p className="text-sm text-[var(--dim)] mt-1">Your Work and Personal mail are kept separate — use the switch above to focus.</p></div></div>
              )}
            </section>
          </div>
        </div>
      ) : (
        /* CALENDAR */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-3 sm:p-5 grid lg:grid-cols-[1fr_340px] gap-5 items-start">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <button aria-label="Previous month" onClick={() => setCalCursor(new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1))} className="px-3 py-1.5 rounded-full border border-[var(--border)] font-bold">‹</button>
                <h1 className="text-lg font-bold">{calCursor.toLocaleDateString([], { month: "long", year: "numeric" })}</h1>
                <div className="flex gap-1.5">
                  <button aria-label="Today" onClick={() => { setCalCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setSelectedDay(dayKey(new Date())); }} className="px-3 py-1.5 rounded-full border border-[var(--border)] text-sm font-semibold">Today</button>
                  <button aria-label="Next month" onClick={() => setCalCursor(new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1))} className="px-3 py-1.5 rounded-full border border-[var(--border)] font-bold">›</button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-center text-[11px] font-bold text-[var(--dim)] mb-1">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} className="py-1">{d}</div>)}</div>
              <div className="grid grid-cols-7 gap-1">
                {calDays.map((cell, i) => {
                  const key = dayKey(cell.date); const dayEvts = eventsOn(key); const isSel = key === selectedDay; const isToday = key === dayKey(new Date());
                  return (
                    <button key={i} aria-label={`Day ${key}`} onClick={() => setSelectedDay(key)} className={`min-h-[64px] sm:min-h-[84px] rounded-xl p-1.5 text-left align-top border ${isSel ? "border-[#EA580C] bg-orange-50/70" : "border-transparent hover:bg-[var(--surface2)]"} ${!cell.inMonth ? "opacity-35" : ""}`}>
                      <span className={`text-[13px] font-semibold ${isToday ? "bg-[#EA580C] text-white rounded-full w-6 h-6 grid place-items-center" : ""}`}>{cell.date.getDate()}</span>
                      <span className="block mt-1 space-y-0.5">
                        {dayEvts.slice(0, 3).map(e => <span key={e.id} className="block truncate text-[10px] leading-tight rounded px-1 py-0.5 text-white" style={{ background: e.color }}>{e.allDay ? e.title : `${new Date(e.startAt).toLocaleTimeString([], { hour: "numeric" })} ${e.title}`}</span>)}
                        {dayEvts.length > 3 && <span className="block text-[10px] text-[var(--dim)]">+{dayEvts.length - 3} more</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-[var(--dim)]"><span>● <span style={{ color: "var(--work)" }}>Work</span></span><span>● <span style={{ color: "var(--personal)" }}>Personal</span></span><span>● Professional</span><span>Showing: {catFilter}</span></div>
            </div>
            <div className="space-y-4">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
                <div className="flex items-center justify-between"><h2 className="font-bold">{new Date(`${selectedDay}T12:00:00`).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</h2><button aria-label="Add event on selected day" onClick={() => openEvent(undefined, selectedDay)} className="text-sm font-bold text-[#EA580C]">+ Add</button></div>
                {selectedDayEvents.length === 0 ? <p className="text-sm text-[var(--dim)] mt-3">No events scheduled for this day{catFilter !== "all" ? ` in ${catFilter}` : ""}.</p> : (
                  <ul className="mt-3 space-y-2">
                    {selectedDayEvents.map(e => (
                      <li key={e.id} className="flex gap-3 rounded-xl border border-[var(--border)] p-3">
                        <span className="w-1.5 rounded-full shrink-0" style={{ background: e.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{e.title}</p>
                          <p className="text-[13px] text-[var(--dim)]">{e.allDay ? "All day" : `${new Date(e.startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${new Date(e.endAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}{e.location ? ` · 📍 ${e.location}` : ""}</p>
                          {e.description && <p className="text-[13px] mt-1 whitespace-pre-wrap">{e.description}</p>}
                          <div className="flex gap-2 mt-2 items-center"><CatBadge cat={e.category} />
                            <button aria-label={`Edit event ${e.title}`} onClick={() => setEventEdit({ id: e.id, accountId: e.accountId, title: e.title, description: e.description, location: e.location, start: toLocalInput(new Date(e.startAt)), end: toLocalInput(new Date(e.endAt)), allDay: e.allDay, category: e.category as Cat, color: e.color })} className="text-[13px] font-semibold underline">Edit</button>
                            <button aria-label={`Delete event ${e.title}`} onClick={() => delEvt.mutate(e.id)} className="text-[13px] font-semibold text-red-700 underline">Delete</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
                <h2 className="font-bold">Upcoming</h2>
                {events.filter(e => new Date(e.endAt) >= new Date()).slice(0, 6).length === 0 ? <p className="text-sm text-[var(--dim)] mt-2">Nothing upcoming.</p> : (
                  <ul className="mt-2 space-y-2">{events.filter(e => new Date(e.endAt) >= new Date()).slice(0, 6).map(e => (
                    <li key={e.id}><button aria-label={`Go to event ${e.title}`} onClick={() => { setSelectedDay(dayKey(new Date(e.startAt))); setCalCursor(new Date(new Date(e.startAt).getFullYear(), new Date(e.startAt).getMonth(), 1)); }} className="w-full text-left flex gap-2 items-baseline"><span className="text-[13px] font-bold shrink-0 w-[86px]">{new Date(e.startAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span><span className="text-sm flex-1 truncate">{e.title}</span><CatBadge cat={e.category} /></button></li>
                  ))}</ul>
                )}
                <button aria-label="Ask Foxmail to help schedule" onClick={() => setAssistantOpen(true)} className="mt-3 w-full py-2 rounded-full bg-[#FFF7ED] border border-orange-200 text-[#9A3412] text-sm font-semibold">✦ Ask Foxmail to help schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom bar */}
      <div className="md:hidden sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] flex pb-safe">
        <button aria-label="New mail mobile" onClick={() => openCompose()} className="flex-1 py-2.5 text-sm font-bold text-[#EA580C]">+ {tr("newMail")}</button>
        <button aria-label="New event mobile" onClick={() => openEvent(undefined, selectedDay)} className="flex-1 py-2.5 text-sm font-bold">+ {tr("newEvent")}</button>
        <button aria-label="Add email account mobile" onClick={() => openAccount()} className="flex-1 py-2.5 text-sm font-bold">+ Account</button>
        <button aria-label="Open Foxmail assistant" onClick={() => setAssistantOpen(true)} className="flex-1 py-2.5 text-sm font-bold">✦ Foxmail</button>
      </div>

      {/* COMPOSE */}
      {compose && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-label="Compose message">
          <div className="bg-[var(--surface)] w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5">
            <div className="flex items-center justify-between"><h2 className="font-bold text-lg">{compose.id ? "Edit message" : "New message"}</h2><button aria-label="Close compose" onClick={() => setCompose(null)} className="px-2 py-1 font-bold">✕</button></div>
            <label className="block mt-3 text-sm font-semibold">From account
              <select aria-label="From account" value={compose.accountId ?? ""} onChange={e => { const a = accounts.find(x=>x.id===Number(e.target.value)); setCompose({ ...compose, accountId: a?.id ?? null, category: (a?.type as Cat) ?? compose.category }); }} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]">{accounts.map(a => <option key={a.id} value={a.id}>{a.displayName} — {a.email}{a.organization ? ` (${a.organization})` : ""} · {a.type}</option>)}</select>
            </label>
            <div className="flex gap-2 mt-3" role="group" aria-label="Message category">
              {(["work", "personal", "professional"] as Cat[]).map(c => <button key={c} aria-label={`Category ${c}`} onClick={() => setCompose({ ...compose, category: c })} className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${compose.category === c ? "bg-[var(--text)] text-[var(--bg)]" : "border-[var(--border)]"}`}>{catLabel(c)}</button>)}
            </div>
            <label className="block mt-4 text-sm font-semibold">To<input aria-label="To recipients" {...FIELDS.sendEmail.toRecipients} value={compose.to} onChange={e => setCompose({ ...compose, to: e.target.value })} placeholder="name@example.com" className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
            <label className="block mt-3 text-sm font-semibold">Cc<input aria-label="Cc recipients" {...FIELDS.sendEmail.ccRecipients} value={compose.cc} onChange={e => setCompose({ ...compose, cc: e.target.value })} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
            <label className="block mt-3 text-sm font-semibold">Subject<input aria-label="Subject" {...FIELDS.sendEmail.subject} value={compose.subject} onChange={e => setCompose({ ...compose, subject: e.target.value })} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
            <label className="block mt-3 text-sm font-semibold">Message<textarea aria-label="Message body" {...FIELDS.sendEmail.body} value={compose.body} onChange={e => setCompose({ ...compose, body: e.target.value })} rows={10} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
            {(() => { const acct = accounts.find(a=>a.id===compose.accountId); return acct?.signature ? <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Signature — {acct.displayName} ({acct.type})</p><button aria-label="Insert signature" onClick={() => { if (!compose.body.includes(acct.signature)) setCompose({ ...compose, body: `${compose.body}${compose.body ? "\n\n" : ""}--\n${acct.signature}` }); }} className="text-[13px] font-bold text-[#EA580C]">Insert signature</button></div><p className="text-[13px] text-[var(--dim)] whitespace-pre-wrap mt-1">{acct.signature}</p><p className="text-xs text-[var(--dim)] mt-1">Your signature is appended automatically when you send.</p></div> : null; })()}
            <label className="block mt-3 text-sm font-semibold">Email language<select aria-label="Email language" value={emailLang} onChange={e => setEmailLang(e.target.value)} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]">{EMAIL_LANGS.map(l => <option key={l} value={l}>{l}</option>)}</select><span className="block text-xs font-normal text-[var(--dim)] mt-1">Foxmail can draft in this language. You may compose and read mail in any world language — FoxMail fully supports Unicode text.</span></label>
            <div className="mt-3 rounded-xl bg-[#FFF7ED] border border-orange-200 p-3">
              <p className="text-sm font-semibold text-[#9A3412]">✦ Draft with Foxmail</p>
              <div className="flex gap-2 mt-2"><input aria-label="Describe email for Foxmail to draft" {...FIELDS.draftEmailAI.prompt} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="e.g. Thank the client and confirm Tuesday at 10am" className="flex-1 border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white" /><button aria-label="Generate draft with Foxmail" disabled={!aiPrompt.trim() || aiDraftMut.isPending} onClick={() => aiDraftMut.mutate(aiPrompt)} className="px-3 py-2 rounded-lg bg-[#EA580C] text-white text-sm font-bold disabled:opacity-50">{aiDraftMut.isPending ? "Drafting…" : "Draft"}</button></div>
              <p className="text-xs text-[#9A3412] mt-1.5">Foxmail writes in a formal, professional and friendly tone.</p>
            </div>
            {composeError && <p className="text-sm text-red-700 mt-3">{composeError}</p>}
            <div className="flex gap-2 mt-4 flex-wrap">
              <button aria-label="Send email" onClick={() => { if (!compose.to.trim()) { setComposeError("Please add at least one recipient in the To field."); return; } setComposeError(""); sendMut.mutate(compose); }} className="px-5 py-2.5 rounded-full bg-[#EA580C] text-white font-bold text-sm">Send</button>
              <button aria-label="Save draft" onClick={() => draftMut.mutate(compose)} className="px-4 py-2.5 rounded-full border border-[var(--border)] font-semibold text-sm">Save draft</button>
              <button aria-label="Discard compose" onClick={() => setCompose(null)} className="px-4 py-2.5 rounded-full text-sm text-[var(--dim)]">Discard</button>
            </div>
          </div>
        </div>
      )}

      {/* EVENT EDITOR */}
      {eventEdit && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-label="Event editor">
          <div className="bg-[var(--surface)] w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5">
            <div className="flex items-center justify-between"><h2 className="font-bold text-lg">{eventEdit.id ? "Edit event" : "New event"}</h2><button aria-label="Close event editor" onClick={() => setEventEdit(null)} className="px-2 py-1 font-bold">✕</button></div>
            <label className="block mt-4 text-sm font-semibold">Title<input aria-label="Event title" {...FIELDS.createEvent.title} value={eventEdit.title} onChange={e => setEventEdit({ ...eventEdit, title: e.target.value })} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
            <div className="flex gap-2 mt-3" role="group" aria-label="Event category">
              {(["work", "personal", "professional"] as Cat[]).map(c => <button key={c} aria-label={`Event category ${c}`} onClick={() => setEventEdit({ ...eventEdit, category: c, color: catColor(c) })} className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${eventEdit.category === c ? "bg-[var(--text)] text-[var(--bg)]" : "border-[var(--border)]"}`}>{catLabel(c)}</button>)}
              <label className="flex items-center gap-2 text-sm ml-2"><input type="checkbox" aria-label="All day event" checked={eventEdit.allDay} onChange={e => setEventEdit({ ...eventEdit, allDay: e.target.checked })} className="w-5 h-5" /> All day</label>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="block text-sm font-semibold">Start<input aria-label="Event start" type="datetime-local" value={eventEdit.start} onChange={e => setEventEdit({ ...eventEdit, start: e.target.value })} className="mt-1 w-full border border-[var(--border)] rounded-lg px-2 py-2 font-normal bg-[var(--surface2)]" /></label>
              <label className="block text-sm font-semibold">End<input aria-label="Event end" type="datetime-local" value={eventEdit.end} onChange={e => setEventEdit({ ...eventEdit, end: e.target.value })} className="mt-1 w-full border border-[var(--border)] rounded-lg px-2 py-2 font-normal bg-[var(--surface2)]" /></label>
            </div>
            <label className="block mt-3 text-sm font-semibold">Location<input aria-label="Event location" {...FIELDS.createEvent.location} value={eventEdit.location} onChange={e => setEventEdit({ ...eventEdit, location: e.target.value })} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
            <label className="block mt-3 text-sm font-semibold">Description<textarea aria-label="Event description" {...FIELDS.createEvent.description} value={eventEdit.description} onChange={e => setEventEdit({ ...eventEdit, description: e.target.value })} rows={4} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
            <label className="block mt-3 text-sm font-semibold">Colour<input aria-label="Event colour" type="color" value={eventEdit.color} onChange={e => setEventEdit({ ...eventEdit, color: e.target.value })} className="mt-1 h-10 w-20 border border-[var(--border)] rounded-lg bg-[var(--surface2)]" /></label>
            {eventError && <p className="text-sm text-red-700 mt-3">{eventError}</p>}
            <div className="flex gap-2 mt-4">
              <button aria-label="Save event" onClick={() => { if (!eventEdit.title.trim()) { setEventError("Please give the event a title."); return; } if (new Date(eventEdit.end) < new Date(eventEdit.start)) { setEventError("The end time must be after the start time."); return; } setEventError(""); createEvt.mutate(eventEdit); }} className="px-5 py-2.5 rounded-full bg-[#EA580C] text-white font-bold text-sm">Save event</button>
              <button aria-label="Cancel event editing" onClick={() => setEventEdit(null)} className="px-4 py-2.5 rounded-full border border-[var(--border)] text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIVE LOGGER */}
      {receiveOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-label="Log received message">
          <div className="bg-[var(--surface)] w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5">
            <div className="flex items-center justify-between"><h2 className="font-bold text-lg">Log a received message</h2><button aria-label="Close received message form" onClick={() => setReceiveOpen(false)} className="px-2 py-1 font-bold">✕</button></div>
            <p className="text-sm text-[var(--dim)] mt-1">Record a message you received elsewhere so it appears in your FoxMail inbox.</p>
            <label className="block mt-3 text-sm font-semibold">From (name)<input aria-label="Sender name" {...FIELDS.createInboxMessage.fromName} value={recv.fromName} onChange={e => setRecv({ ...recv, fromName: e.target.value })} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
            <label className="block mt-3 text-sm font-semibold">From (email)<input aria-label="Sender email" {...FIELDS.createInboxMessage.fromEmail} value={recv.fromEmail} onChange={e => setRecv({ ...recv, fromEmail: e.target.value })} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
            <label className="block mt-3 text-sm font-semibold">Subject<input aria-label="Received subject" {...FIELDS.createInboxMessage.subject} value={recv.subject} onChange={e => setRecv({ ...recv, subject: e.target.value })} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
            <label className="block mt-3 text-sm font-semibold">Message<textarea aria-label="Received body" {...FIELDS.createInboxMessage.body} value={recv.body} onChange={e => setRecv({ ...recv, body: e.target.value })} rows={6} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
            <div className="flex gap-2 mt-3">{(["work", "personal"] as Cat[]).map(c => <button key={c} aria-label={`Received category ${c}`} onClick={() => setRecv({ ...recv, category: c })} className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${recv.category === c ? "bg-[var(--text)] text-[var(--bg)]" : "border-[var(--border)]"}`}>{c}</button>)}</div>
            <button aria-label="Save received message" disabled={!recv.fromName.trim()} onClick={() => recvMut.mutate()} className="mt-4 px-5 py-2.5 rounded-full bg-[#EA580C] text-white font-bold text-sm disabled:opacity-50">Add to Inbox</button>
          </div>
        </div>
      )}

      
      
      {/* NOTIFICATIONS */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-label="Notifications">
          <button aria-label="Close notifications background" onClick={() => setNotifOpen(false)} className="flex-1 bg-black/40" />
          <div className="w-full max-w-[400px] bg-[var(--surface)] h-full flex flex-col shadow-2xl">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between"><p className="font-bold">🔔 {tr("notifications")}{notifQ.data?.unread ? ` (${notifQ.data.unread})` : ""}</p><div className="flex gap-2"><button aria-label="Mark all notifications read" onClick={() => markAllReadMut.mutate()} className="text-[13px] font-semibold text-[#EA580C]">{tr("markAllRead")}</button><button aria-label="Close notifications" onClick={() => setNotifOpen(false)} className="px-2 py-1 font-bold">✕</button></div></div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {(notifQ.data?.notifications ?? []).length === 0 && <p className="text-sm text-[var(--dim)] p-2">{tr("noNotifications")}. New mail, calendar events, and auto-replies will appear here.</p>}
              {(notifQ.data?.notifications ?? []).map(n => (
                <button key={n.id} aria-label={`Notification: ${n.title}`} onClick={() => { if (n.kind === "calendar") setView("calendar"); else setView("mail"); setNotifOpen(false); }} className={`w-full text-left rounded-xl border p-3 ${n.isRead ? "border-[var(--border)] bg-[var(--surface2)]/60" : "border-orange-200 bg-[#FFF7ED]"}`}>
                  <p className="text-sm font-semibold">{n.kind === "calendar" ? "📅 " : n.kind === "system" ? "↩ " : "✉ "}{n.title}</p>
                  {n.body && <p className="text-[13px] text-[var(--dim)] mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[11px] text-[var(--dim)] mt-1">{fmtFull(n.createdAt)}{n.accountId ? ` · ${accounts.find(a=>a.id===n.accountId)?.email ?? ""}` : ""}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT EDITOR */}
      {accountEdit && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-label="Email account settings">
          <div className="bg-[var(--surface)] w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5">
            <div className="flex items-center justify-between"><h2 className="font-bold text-lg">{accountEdit.id ? "Account settings" : "Add email account"}</h2><button aria-label="Close account settings" onClick={() => setAccountEdit(null)} className="px-2 py-1 font-bold">✕</button></div>
            <p className="text-sm text-[var(--dim)] mt-1">Each account has its own Inbox, Drafts, Sent, Archive, Junk and Trash. Professional accounts link an organisation or company inbox — IMAP is the default for receiving (POP3 is also supported), with SMTP for sending.</p>
            <div className="flex gap-2 mt-4" role="group" aria-label="Account type">
              {(["work","personal","professional"] as Cat[]).map(c => <button key={c} aria-label={`Account type ${c}`} onClick={() => setAccountEdit({ ...accountEdit, type: c, incomingProtocol: c === "professional" && accountEdit.incomingProtocol === "none" ? "imap" : accountEdit.incomingProtocol })} className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${accountEdit.type === c ? "bg-[var(--text)] text-[var(--bg)]" : "border-[var(--border)]"}`}>{catLabel(c)}</button>)}
            </div>
            <div className="mt-4 rounded-xl border border-[var(--border)] p-4 flex items-center gap-4 flex-wrap">
              {(() => { const existing = accounts.find(a=>a.id===accountEdit.id); return <>
                <Avatar account={existing} name={accountEdit.displayName || accountEdit.email || "?"} size={64} />
                <div className="flex-1 min-w-[220px]">
                  <p className="font-bold text-sm">Profile picture</p>
                  <p className="text-xs text-[var(--dim)] mt-0.5">The face of this inbox — shown on the profile, in the header, and next to sent emails. You may use a different picture for each Work, Personal, and Professional account.</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <label className="px-3 py-1.5 rounded-full bg-[#EA580C] text-white text-[13px] font-bold cursor-pointer">Upload picture<input aria-label="Upload profile picture" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={e => { void handleAvatarFile(accountEdit.id, e.target.files?.[0], !accountEdit.id); e.target.value = ""; }} /></label>
                    {existing?.avatarUrl && <button aria-label="Remove profile picture" onClick={() => removeAvatarMut.mutate(existing.id)} className="px-3 py-1.5 rounded-full border border-[var(--border)] text-[13px] font-semibold">Remove</button>}
                    {avatarBusy && <span className="text-[13px] text-[var(--dim)]">Uploading…</span>}
                    {!accountEdit.id && <span className="text-[13px] text-[var(--dim)]">Save the account first, then reopen Settings to add its picture.</span>}
                  </div>
                </div>
              </>; })()}
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <label className="block text-sm font-semibold">Display name<input aria-label="Account display name" {...FIELDS.createAccount.displayName} value={accountEdit.displayName} onChange={e => setAccountEdit({ ...accountEdit, displayName: e.target.value })} placeholder="e.g. Saul — Acme Ltd" className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
              <label className="block text-sm font-semibold">Email address<input aria-label="Account email address" {...FIELDS.createAccount.email} value={accountEdit.email} onChange={e => setAccountEdit({ ...accountEdit, email: e.target.value })} placeholder="name@company.com" className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
            </div>
            {accountEdit.type === "professional" && <label className="block mt-3 text-sm font-semibold">Organisation / company<input aria-label="Organisation or company" {...FIELDS.createAccount.organization} value={accountEdit.organization} onChange={e => setAccountEdit({ ...accountEdit, organization: e.target.value })} placeholder="e.g. Acme Ltd, Northwind Traders, your university…" className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>}
            <div className="mt-5 rounded-xl border border-[var(--border)] p-4">
              <p className="font-bold text-sm">Receiving mail — {accountEdit.incomingProtocol === "pop3" ? "POP3" : accountEdit.incomingProtocol === "imap" ? "IMAP (default)" : "Not configured"}</p>
              <div className="flex gap-2 mt-2" role="group" aria-label="Incoming protocol">
                {(["imap","pop3","none"] as const).map(proto => <button key={proto} aria-label={`Incoming protocol ${proto}`} onClick={() => setAccountEdit({ ...accountEdit, incomingProtocol: proto, incomingPort: proto === "imap" ? 993 : proto === "pop3" ? 995 : accountEdit.incomingPort })} className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${accountEdit.incomingProtocol === proto ? "bg-[#EA580C] text-white border-transparent" : "border-[var(--border)]"}`}>{proto === "imap" ? "IMAP (default)" : proto.toUpperCase()}</button>)}
              </div>
              {accountEdit.incomingProtocol !== "none" && <>
                <div className="grid sm:grid-cols-[1fr_110px] gap-3 mt-3">
                  <label className="block text-sm font-semibold">Incoming server<input aria-label="Incoming mail server" {...FIELDS.createAccount.incomingServer} value={accountEdit.incomingServer} onChange={e => setAccountEdit({ ...accountEdit, incomingServer: e.target.value })} placeholder={accountEdit.incomingProtocol === "imap" ? "imap.company.com" : "pop.company.com"} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
                  <label className="block text-sm font-semibold">Port<input aria-label="Incoming port" type="number" {...FIELDS.createAccount.incomingPort} value={accountEdit.incomingPort} onChange={e => setAccountEdit({ ...accountEdit, incomingPort: Number(e.target.value) })} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  <label className="block text-sm font-semibold">Username<input aria-label="Incoming username" {...FIELDS.createAccount.incomingUsername} value={accountEdit.incomingUsername} onChange={e => setAccountEdit({ ...accountEdit, incomingUsername: e.target.value })} placeholder="Usually your full email address" className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
                  <label className="block text-sm font-semibold">Password<input aria-label="Incoming password" type="password" autoComplete="new-password" {...FIELDS.createAccount.incomingPassword} value={accountEdit.incomingPassword} onChange={e => setAccountEdit({ ...accountEdit, incomingPassword: e.target.value })} placeholder={accountEdit.id ? "Leave blank to keep saved password" : "Account password"} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
                </div>
                <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" aria-label="Incoming use TLS" checked={accountEdit.incomingUseTls} onChange={e => setAccountEdit({ ...accountEdit, incomingUseTls: e.target.checked })} className="w-5 h-5" /> Use secure connection (SSL/TLS)</label>
              </>}
            </div>
            <div className="mt-4 rounded-xl border border-[var(--border)] p-4">
              <p className="font-bold text-sm">Sending mail — SMTP</p>
              <div className="grid sm:grid-cols-[1fr_110px] gap-3 mt-3">
                <label className="block text-sm font-semibold">SMTP server<input aria-label="SMTP server" {...FIELDS.createAccount.smtpServer} value={accountEdit.smtpServer} onChange={e => setAccountEdit({ ...accountEdit, smtpServer: e.target.value })} placeholder="smtp.company.com" className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
                <label className="block text-sm font-semibold">Port<input aria-label="SMTP port" type="number" {...FIELDS.createAccount.smtpPort} value={accountEdit.smtpPort} onChange={e => setAccountEdit({ ...accountEdit, smtpPort: Number(e.target.value) })} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <label className="block text-sm font-semibold">SMTP username<input aria-label="SMTP username" {...FIELDS.createAccount.smtpUsername} value={accountEdit.smtpUsername} onChange={e => setAccountEdit({ ...accountEdit, smtpUsername: e.target.value })} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
                <label className="block text-sm font-semibold">SMTP password<input aria-label="SMTP password" type="password" autoComplete="new-password" {...FIELDS.createAccount.smtpPassword} value={accountEdit.smtpPassword} onChange={e => setAccountEdit({ ...accountEdit, smtpPassword: e.target.value })} placeholder={accountEdit.id ? "Leave blank to keep saved password" : "Often the same as incoming"} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
              </div>
              <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" aria-label="SMTP use TLS" checked={accountEdit.smtpUseTls} onChange={e => setAccountEdit({ ...accountEdit, smtpUseTls: e.target.checked })} className="w-5 h-5" /> Use secure connection (STARTTLS / TLS)</label>
              <p className="text-xs text-[var(--dim)] mt-2">Settings are stored in your FoxMail mailbox so this account keeps its own folders. FoxMail does not test the live server connection from this page — please confirm server names and ports with your organisation&apos;s IT guidance.</p>
            </div>
            <div className="mt-4 rounded-xl border border-[var(--border)] p-4">
              <p className="font-bold text-sm">Email signature — {catLabel(accountEdit.type)}</p>
              <p className="text-xs text-[var(--dim)] mt-1">A different signature for each account type. It is appended when you send from this account.</p>
              <textarea aria-label="Email signature" {...FIELDS.createAccount.signature} value={accountEdit.signature} onChange={e => setAccountEdit({ ...accountEdit, signature: e.target.value })} rows={4} placeholder={"Kind regards,\nYour name\nRole · Organisation\nPhone"} className="mt-2 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-normal bg-[var(--surface2)]" />
            </div>
            <div className="mt-4 rounded-xl border border-[var(--border)] p-4">
              <label className="flex items-center gap-2 font-bold text-sm"><input type="checkbox" aria-label="Enable auto-reply" checked={accountEdit.autoReplyEnabled} onChange={e => setAccountEdit({ ...accountEdit, autoReplyEnabled: e.target.checked })} className="w-5 h-5" /> Auto-reply / Out of office</label>
              <p className="text-xs text-[var(--dim)] mt-1">When on, FoxMail automatically sends this reply (filed in Sent) to new mail received in this account, and records a notification.</p>
              {accountEdit.autoReplyEnabled && <>
                <label className="block mt-3 text-sm font-semibold">Auto-reply subject<input aria-label="Auto-reply subject" {...FIELDS.createAccount.autoReplySubject} value={accountEdit.autoReplySubject} onChange={e => setAccountEdit({ ...accountEdit, autoReplySubject: e.target.value })} className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
                <label className="block mt-3 text-sm font-semibold">Auto-reply message<textarea aria-label="Auto-reply message" {...FIELDS.createAccount.autoReplyBody} value={accountEdit.autoReplyBody} onChange={e => setAccountEdit({ ...accountEdit, autoReplyBody: e.target.value })} rows={4} placeholder="Thank you for your message. I am currently out of office…" className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 font-normal bg-[var(--surface2)]" /></label>
              </>}
            </div>
            {accountError && <p className="text-sm text-red-700 mt-3">{accountError}</p>}
            <div className="flex gap-2 mt-4">
              <button aria-label="Save account" onClick={() => { if (!accountEdit.displayName.trim()) { setAccountError("Please add a display name for this account."); return; } if (!accountEdit.email.includes("@")) { setAccountError("Please enter a valid email address containing @."); return; } if (accountEdit.type === "professional" && !accountEdit.organization.trim()) { setAccountError("Please add the organisation or company name for a Professional account."); return; } setAccountError(""); saveAccountMut.mutate(accountEdit); }} className="px-5 py-2.5 rounded-full bg-[#EA580C] text-white font-bold text-sm">{accountEdit.id ? "Save account" : "Add account"}</button>
              <button aria-label="Cancel account editing" onClick={() => setAccountEdit(null)} className="px-4 py-2.5 rounded-full border border-[var(--border)] text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ASSISTANT */}
      {assistantOpen && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-label="Foxmail assistant">
          <button aria-label="Close assistant background" onClick={() => setAssistantOpen(false)} className="flex-1 bg-black/40" />
          <div className="w-full max-w-[420px] bg-[var(--surface)] h-full flex flex-col shadow-2xl">
            <div className="p-4 border-b border-[var(--border)] flex items-start gap-3">
              <span className="w-11 h-11 rounded-full bg-[#EA580C] text-white grid place-items-center text-xl shrink-0" aria-hidden>✦</span>
              <div className="flex-1">
                <p className="font-bold">Foxmail</p>
                <p className="text-[13px] text-[var(--dim)]">Your assistant · Formal, professional and friendly</p>
              </div>
              <button aria-label="Close Foxmail assistant" onClick={() => setAssistantOpen(false)} className="px-2 py-1 font-bold">✕</button>
            </div>
            <div className="flex gap-2 px-4 py-3 border-b border-[var(--border)] flex-wrap">
              <button aria-label="Summarise my inbox" onClick={() => summaryMut.mutate()} className="px-3 py-1.5 rounded-full border border-orange-200 bg-[#FFF7ED] text-[#9A3412] text-[13px] font-semibold">Summarise inbox</button>
              <button aria-label="Draft an email with Foxmail" onClick={() => setChatInput("Please draft a formal email to ")} className="px-3 py-1.5 rounded-full border border-[var(--border)] text-[13px] font-semibold">Draft an email</button>
              <button aria-label="Help schedule with Foxmail" onClick={() => setChatInput("Please help me schedule ")} className="px-3 py-1.5 rounded-full border border-[var(--border)] text-[13px] font-semibold">Help me schedule</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {summary && (
                <div className="rounded-xl border border-orange-200 bg-[#FFF7ED] p-3">
                  <p className="font-bold text-sm">Inbox summary{catFilter !== "all" ? ` · ${catFilter}` : ""}</p>
                  <p className="text-sm mt-1">{summary.summary}</p>
                  <ul className="list-disc pl-5 text-sm mt-2 space-y-1">{summary.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
                  {summary.urgent.length > 0 && <><p className="font-bold text-sm mt-2 text-red-800">Requiring prompt attention</p><ul className="list-disc pl-5 text-sm">{summary.urgent.map((b, i) => <li key={i}>{b}</li>)}</ul></>}
                </div>
              )}
              {summaryMut.isPending && <p className="text-sm text-[var(--dim)]">Foxmail is reviewing your inbox…</p>}
              {chat.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "bg-[#EA580C] text-white rounded-br-md" : "bg-[var(--surface2)] border border-[var(--border)] rounded-bl-md"}`}>{m.role === "assistant" && <span className="block text-[11px] font-bold text-[#EA580C] mb-1">FOXMAIL</span>}{m.content}</div>
                </div>
              ))}
              {chatMut.isPending && <p className="text-sm text-[var(--dim)]">Foxmail is composing a response…</p>}
              {pendingDraft && (
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <p className="font-bold text-sm">Draft prepared by Foxmail</p>
                  <p className="text-sm mt-1"><strong>{pendingDraft.subject}</strong></p>
                  <p className="text-[13px] text-[var(--dim)] whitespace-pre-wrap line-clamp-4 mt-1">{pendingDraft.body}</p>
                  <div className="flex gap-2 mt-2"><button aria-label="Use Foxmail draft" onClick={() => { openCompose({ subject: pendingDraft.subject, body: pendingDraft.body, category: pendingDraft.category }); setPendingDraft(null); setAssistantOpen(false); }} className="px-3 py-1.5 rounded-full bg-[#EA580C] text-white text-[13px] font-bold">Use this draft</button><button aria-label="Dismiss draft" onClick={() => setPendingDraft(null)} className="px-3 py-1.5 rounded-full border border-[var(--border)] text-[13px]">Dismiss</button></div>
                </div>
              )}
              {pendingEvent && (
                <div className="rounded-xl border border-[var(--border)] p-3">
                  <p className="font-bold text-sm">Event proposed by Foxmail</p>
                  <p className="text-sm mt-1">{pendingEvent.title}{pendingEvent.location ? ` · ${pendingEvent.location}` : ""}</p>
                  <div className="flex gap-2 mt-2"><button aria-label="Create proposed event" onClick={() => { openEvent({ title: pendingEvent.title, location: pendingEvent.location, description: pendingEvent.description }, selectedDay); setPendingEvent(null); setAssistantOpen(false); setView("calendar"); }} className="px-3 py-1.5 rounded-full bg-[#EA580C] text-white text-[13px] font-bold">Set date &amp; create</button><button aria-label="Dismiss event proposal" onClick={() => setPendingEvent(null)} className="px-3 py-1.5 rounded-full border border-[var(--border)] text-[13px]">Dismiss</button></div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-[var(--border)] flex gap-2 pb-safe">
              <input aria-label="Message Foxmail assistant" {...FIELDS.assistantChat.message} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendChat(); }} placeholder="Ask Foxmail…" className="flex-1 border border-[var(--border)] rounded-full px-4 py-2 text-sm bg-[var(--surface2)]" />
              <button aria-label="Send message to Foxmail" disabled={!chatInput.trim() || chatMut.isPending} onClick={sendChat} className="px-4 py-2 rounded-full bg-[#EA580C] text-white text-sm font-bold disabled:opacity-50">Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating assistant button (desktop) */}
      {!assistantOpen && (
        <button aria-label="Open Foxmail assistant" onClick={() => setAssistantOpen(true)} className="hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-2 pl-2 pr-4 py-2 rounded-full bg-[#1C1917] text-white shadow-xl font-semibold text-sm"><span className="w-8 h-8 rounded-full bg-[#EA580C] grid place-items-center">✦</span> Ask Foxmail</button>
      )}
    </div>
  );
}
