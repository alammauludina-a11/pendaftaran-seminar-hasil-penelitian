import { db } from "../../../../db";
import { requireAdmin } from "@/lib/admin-auth";
import { users, loginLog, loginGagal, periode, pengumuman, pendaftaran } from "../../../../db/schema";
import { labelPerangkat } from "@/lib/user-agent";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const DAY_MS = 24 * 60 * 60 * 1000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAILY_RANGE_DAYS = 30;
// Consecutive failed attempts (since the last successful login) that flag an account
const BATAS_GAGAL_BERUNTUN = 3;
// Day login_log went live; earlier logins only survive if the user never logged out
const LOGIN_LOG_SINCE = "2026-10-02";

/** better-auth error messages are English; show the common ones in Indonesian. */
function terjemahkanAlasan(alasan: string | null): string | null {
  if (!alasan) return null;
  if (/invalid (username|email) or password/i.test(alasan)) return "Username atau password salah";
  if (/too many requests/i.test(alasan)) return "Terlalu banyak percobaan";
  if (/invalid username/i.test(alasan)) return "Format username tidak valid";
  return alasan;
}

/** All-zero addresses are what the proxy sends when the client IP is unknown. */
const bersihkanIp = (ip: string | null) => (ip && !/^[0:.]+$/.test(ip) ? ip : null);

/** Calendar day (YYYY-MM-DD) in WIB, so logins just after midnight land on the right day. */
const wibDay = (d: Date) => new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);

export async function GET() {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const [allUsers, logs, periodes, pengumumanRows, pendaftarRows, gagalRows] = await Promise.all([
      db.select({ id: users.id, nama: users.nama, nipNim: users.nipNim, role: users.role, angkatan: users.angkatan }).from(users),
      db.select({ userId: loginLog.userId, createdAt: loginLog.createdAt, ipAddress: loginLog.ipAddress, userAgent: loginLog.userAgent }).from(loginLog),
      db.select({ jenisSeminar: periode.jenisSeminar, angkatan: periode.angkatan, startDate: periode.startDate, registrationEndDate: periode.registrationEndDate, isDraft: periode.isDraft }).from(periode),
      db.select({ dirilisPada: pengumuman.dirilisPada }).from(pengumuman).where(eq(pengumuman.aktif, true)),
      db.selectDistinct({ userId: pendaftaran.userId }).from(pendaftaran),
      db.select().from(loginGagal),
    ]);
    // Anyone who has submitted a pendaftaran must have logged in, even if that login predates login_log
    const pernahMendaftar = new Set(pendaftarRows.map(p => p.userId));

    const now = new Date();
    const today = wibDay(now);
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const roleById = new Map(allUsers.map(u => [u.id, u.role]));

    // Per-user login history (newest first)
    type Riwayat = { waktu: Date; ip: string | null; perangkat: string };
    const historyByUser = new Map<string, Riwayat[]>();
    for (const log of logs) {
      const list = historyByUser.get(log.userId) ?? [];
      list.push({ waktu: log.createdAt, ip: bersihkanIp(log.ipAddress), perangkat: labelPerangkat(log.userAgent) });
      historyByUser.set(log.userId, list);
    }
    historyByUser.forEach(list => list.sort((a, b) => b.waktu.getTime() - a.waktu.getTime()));

    // KPI and charts only cover mahasiswa + dosen; admin logins are left out
    const nonAdminLogs = logs.filter(l => {
      const role = roleById.get(l.userId);
      return role === "mahasiswa" || role === "dosen";
    });

    const aktif7Hari = new Set(nonAdminLogs.filter(l => l.createdAt >= sevenDaysAgo).map(l => l.userId)).size;
    const loginHariIni = nonAdminLogs.filter(l => wibDay(l.createdAt) === today).length;

    // Logins per day for the last DAILY_RANGE_DAYS days
    const dailyMap = new Map<string, { mahasiswa: number; dosen: number }>();
    for (let i = DAILY_RANGE_DAYS - 1; i >= 0; i--) {
      dailyMap.set(wibDay(new Date(now.getTime() - i * DAY_MS)), { mahasiswa: 0, dosen: 0 });
    }
    for (const log of nonAdminLogs) {
      const bucket = dailyMap.get(wibDay(log.createdAt));
      if (bucket) bucket[roleById.get(log.userId) as "mahasiswa" | "dosen"]++;
    }
    const daily = Array.from(dailyMap, ([date, counts]) => ({ date, ...counts }));

    // Key dates drawn on the daily chart
    const rangeStart = daily[0].date;
    const markers: { date: string; label: string }[] = [];
    for (const p of periodes) {
      if (p.isDraft) continue;
      const jenis = p.jenisSeminar === "kolokium" ? "Kolokium" : "Seminar Hasil";
      if (p.startDate) markers.push({ date: p.startDate, label: `Buka ${jenis} ${p.angkatan}` });
      if (p.registrationEndDate) markers.push({ date: p.registrationEndDate, label: `Tutup ${jenis} ${p.angkatan}` });
    }
    for (const p of pengumumanRows) {
      if (p.dirilisPada) markers.push({ date: wibDay(p.dirilisPada), label: "Rilis jadwal" });
    }
    const visibleMarkers = markers.filter(m => m.date >= rangeStart && m.date <= today);

    // Adoption: mahasiswa who have logged in (or registered) at least once, per angkatan
    const mahasiswa = allUsers.filter(u => u.role === "mahasiswa");
    const adopsiMap = new Map<string, { total: number; sudahLogin: number }>();
    const belumLogin: { nama: string; nipNim: string; angkatan: string | null }[] = [];
    for (const m of mahasiswa) {
      const key = m.angkatan || "Tanpa angkatan";
      const entry = adopsiMap.get(key) ?? { total: 0, sudahLogin: 0 };
      entry.total++;
      if (historyByUser.has(m.id) || pernahMendaftar.has(m.id)) entry.sudahLogin++;
      else belumLogin.push({ nama: m.nama, nipNim: m.nipNim, angkatan: m.angkatan });
      adopsiMap.set(key, entry);
    }
    const adopsi = Array.from(adopsiMap, ([angkatan, v]) => ({ angkatan, ...v })).sort((a, b) => a.angkatan.localeCompare(b.angkatan));
    belumLogin.sort((a, b) => a.nipNim.localeCompare(b.nipNim));

    const userLogins = allUsers
      .map(u => {
        const history = historyByUser.get(u.id) ?? [];
        return { id: u.id, nama: u.nama, nipNim: u.nipNim, role: u.role, loginCount: history.length, lastLogin: history[0]?.waktu ?? null, history };
      })
      .sort((a, b) => (b.lastLogin?.getTime() ?? 0) - (a.lastLogin?.getTime() ?? 0));

    // ---- Keamanan ----
    const userById = new Map(allUsers.map(u => [u.id, u]));
    const oneDayAgo = new Date(now.getTime() - DAY_MS);
    const loginGagal24Jam = gagalRows.filter(g => g.createdAt >= oneDayAgo).length;

    // Failed attempts per identifier since that account's last successful login
    const gagalPerIdentifier = new Map<string, typeof gagalRows>();
    for (const g of gagalRows) {
      const list = gagalPerIdentifier.get(g.identifier) ?? [];
      list.push(g);
      gagalPerIdentifier.set(g.identifier, list);
    }
    const gagalBeruntun = Array.from(gagalPerIdentifier, ([identifier, list]) => {
      const userId = list.find(g => g.userId)?.userId ?? null;
      const lastSuccess = userId ? historyByUser.get(userId)?.[0]?.waktu : undefined;
      const sejakSukses = list.filter(g => !lastSuccess || g.createdAt > lastSuccess);
      const terakhir = sejakSukses.reduce<Date | null>((max, g) => (!max || g.createdAt > max ? g.createdAt : max), null);
      const user = userId ? userById.get(userId) : undefined;
      return {
        identifier,
        nama: user?.nama ?? null,
        role: user?.role ?? null,
        akunDitemukan: !!user,
        jumlah: sejakSukses.length,
        jumlahIp: new Set(sejakSukses.map(g => g.ipAddress).filter(Boolean)).size,
        terakhir,
      };
    })
      .filter(g => g.jumlah >= BATAS_GAGAL_BERUNTUN)
      .sort((a, b) => b.jumlah - a.jumlah);

    const loginGagalTerbaru = [...gagalRows]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 50)
      .map(g => {
        const user = g.userId ? userById.get(g.userId) : undefined;
        return { identifier: g.identifier, nama: user?.nama ?? null, alasan: terjemahkanAlasan(g.alasan), ip: bersihkanIp(g.ipAddress), perangkat: labelPerangkat(g.userAgent), waktu: g.createdAt };
      });

    // Admin logins in the last 30 days from a device (browser + OS) that admin had not used before.
    // A new IP alone is not flagged: mobile and campus networks change IPs all the time.
    const thirtyDaysAgo = new Date(now.getTime() - DAILY_RANGE_DAYS * DAY_MS);
    const adminPerangkatBaru: { nama: string; waktu: Date; ip: string | null; perangkat: string; alasan: string[] }[] = [];
    for (const admin of allUsers.filter(u => u.role === "admin")) {
      const oldestFirst = [...(historyByUser.get(admin.id) ?? [])].reverse();
      const seenIp = new Set<string>();
      const seenDevice = new Set<string>();
      oldestFirst.forEach((h, i) => {
        const alasan: string[] = [];
        if (i > 0 && !seenDevice.has(h.perangkat)) {
          alasan.push("Perangkat baru");
          if (h.ip && !seenIp.has(h.ip)) alasan.push("IP baru");
        }
        if (alasan.length && h.waktu >= thirtyDaysAgo) adminPerangkatBaru.push({ nama: admin.nama, waktu: h.waktu, ip: h.ip, perangkat: h.perangkat, alasan });
        if (h.ip) seenIp.add(h.ip);
        seenDevice.add(h.perangkat);
      });
    }
    adminPerangkatBaru.sort((a, b) => b.waktu.getTime() - a.waktu.getTime());

    return NextResponse.json({
      pencatatanSejak: LOGIN_LOG_SINCE,
      kpi: {
        aktif7Hari,
        loginHariIni,
        belumPernahLogin: belumLogin.length,
        totalMahasiswa: mahasiswa.length,
        loginGagal24Jam,
      },
      keamanan: {
        batasGagalBeruntun: BATAS_GAGAL_BERUNTUN,
        gagalBeruntun,
        loginGagalTerbaru,
        adminPerangkatBaru,
      },
      daily,
      markers: visibleMarkers,
      adopsi,
      belumLogin,
      userLogins,
    });
  } catch (error: any) {
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch logs" }, { status: 500 });
  }
}
