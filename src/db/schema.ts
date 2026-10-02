import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  role: text("role", { enum: ["mahasiswa", "dosen", "admin"] }).notNull(),
  name: text("name").notNull(),
  nama: text("nama").notNull(),
  nipNim: text("nip_nim").notNull().unique(),
  prodi: text("prodi"),
  statusAktif: text("status_aktif"), // "Aktif" dsb
  angkatan: text("angkatan"),
  jabatan: text("jabatan"), // "Lektor Kepala" dsb
  statusDosen: text("status_dosen"), // "Dosen Tetap", "Dosen Praktisi/Luar"
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const periode = sqliteTable("periode", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jenisSeminar: text("jenis_seminar", { enum: ["kolokium", "hasil_penelitian"] }).notNull().default("hasil_penelitian"),
  angkatan: text("angkatan").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  registrationEndDate: text("registration_end_date"),
  isOpen: integer("is_open", { mode: "boolean" }).notNull().default(false),
  batasKelas: integer("batas_kelas").notNull().default(31),
  isDraft: integer("is_draft", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const slotWaktu = sqliteTable("slot_waktu", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  waktuMulai: integer("waktu_mulai", { mode: 'timestamp' }).notNull(),
  waktuSelesai: integer("waktu_selesai", { mode: 'timestamp' }).notNull(),
  tersedia: integer("tersedia", { mode: "boolean" }).notNull().default(true),
});

export const pendaftaran = sqliteTable("pendaftaran", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jenisSeminar: text("jenis_seminar", { enum: ["kolokium", "hasil_penelitian"] }).notNull().default("hasil_penelitian"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodeId: integer("periode_id").references(() => periode.id, { onDelete: "cascade" }),
  slotWaktuId: integer("slot_waktu_id").references(() => slotWaktu.id, { onDelete: "set null" }),
  
  judulPenelitian: text("judul_penelitian"),
  konsentrasi: text("konsentrasi"),
  // Dospem identity is the user id; the name columns are a display copy (kept in sync when a dosen is renamed)
  dospem1Id: text("dospem1_id").references(() => users.id, { onDelete: "set null" }),
  dospem2Id: text("dospem2_id").references(() => users.id, { onDelete: "set null" }),
  dospem1: text("dospem1"),
  dospem2: text("dospem2"),
  tanggalKolokium: text("tanggal_kolokium"),
  
  fileBuktiKolokium: text("file_bukti_kolokium"),
  fileApprovalDospem: text("file_approval_dospem"),
  
  statusVerifikasi: text("status_verifikasi", { enum: ["menunggu", "disetujui", "ditolak"] }).notNull().default("menunggu"),
  catatanAdmin: text("catatan_admin"),
  
  ruanganDisetujui: text("ruangan_disetujui"),
  ruanganDiajukan: text("ruangan_diajukan"),
  statusRuangan: text("status_ruangan", { enum: ["menunggu", "disetujui", "ditolak"] }).notNull().default("menunggu"),
  pembahas: text("pembahas"),
  isFinalized: integer("is_finalized", { mode: "boolean" }).notNull().default(false),
  isReleased: integer("is_released", { mode: "boolean" }).notNull().default(false),
  kelasSeminarId: integer("kelas_seminar_id"), // Grouped class
  
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const kelasSeminar = sqliteTable("kelas_seminar", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  namaKelas: text("nama_kelas").notNull(),
  periodeId: integer("periode_id").references(() => periode.id, { onDelete: "cascade" }),
  slotWaktuId: integer("slot_waktu_id").references(() => slotWaktu.id, { onDelete: "set null" }), // Kept for legacy
  date: text("date"), // YYYY-MM-DD
  room: text("room"),
  kuotaTerisi: integer("kuota_terisi").notNull().default(0),
  kapasitasMax: integer("kapasitas_max").notNull().default(31),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const moderator = sqliteTable("moderator", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pendaftaranId: integer("pendaftaran_id").notNull().unique().references(() => pendaftaran.id, { onDelete: "cascade" }),
  dosenId: text("dosen_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dipilihPada: integer("dipilih_pada", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  assignedByRole: text("assigned_by_role", { enum: ["admin", "dosen"] }).notNull().default("dosen"),
  batalStatus: text("batal_status", { enum: ["menunggu", "disetujui", "ditolak"] }),
  batalReason: text("batal_reason"),
});

export const pengumuman = sqliteTable("pengumuman", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  aktif: integer("aktif", { mode: "boolean" }).notNull().default(false),
  dirilisPada: integer("dirilis_pada", { mode: 'timestamp' }),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  password: text("password"),
  plainPassword: text("plain_password"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const files = sqliteTable("files", {
  id: text("id").primaryKey(), // crypto.randomUUID()
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  data: text("data").notNull(), // Base64 encoded string
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Permanent record of every successful login. Unlike `session`, rows are not removed on logout,
// so Analisis Log can count logins and show history accurately.
export const loginLog = sqliteTable("login_log", {
  id: text("id").primaryKey(), // crypto.randomUUID()
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (t) => [index("login_log_user_id_idx").on(t.userId), index("login_log_created_at_idx").on(t.createdAt)]);

// Failed sign-in attempts. `userId` is null when the username does not match any account.
export const loginGagal = sqliteTable("login_gagal", {
  id: text("id").primaryKey(), // crypto.randomUUID()
  identifier: text("identifier").notNull(), // username as typed on the login form
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  alasan: text("alasan"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (t) => [index("login_gagal_created_at_idx").on(t.createdAt)]);

// Audit trail of admin actions. Actor name and target label are stored as text so entries stay
// readable after the admin or the target record is deleted.
export const logAktivitas = sqliteTable("log_aktivitas", {
  id: text("id").primaryKey(), // crypto.randomUUID()
  actorId: text("actor_id"),
  actorNama: text("actor_nama"),
  kategori: text("kategori", { enum: ["verifikasi", "jadwal", "kelas", "periode", "master"] }).notNull(),
  aksi: text("aksi").notNull(),
  deskripsi: text("deskripsi").notNull(),
  targetTipe: text("target_tipe"),
  targetId: text("target_id"),
  detail: text("detail"), // JSON string
  ipAddress: text("ip_address"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (t) => [index("log_aktivitas_created_at_idx").on(t.createdAt)]);
