import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";
import { createAuthMiddleware, isAPIError } from "better-auth/api";
import { eq } from "drizzle-orm";

const SIGN_IN_PATHS = ["/sign-in/username", "/sign-in/email"];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
        ...schema,
        user: schema.users
    }
  }),
  trustedProxies: true,
  rateLimit: {
    window: 60,
    max: 1000
  },
  emailAndPassword: {
    enabled: true,
    // Accounts are only created by admin (master data), never through public sign-up
    disableSignUp: true,
    minPasswordLength: 4,
    maxPasswordLength: 255,
  },
  plugins: [
    username()
  ],
  user: {
      // Profile & role fields are managed by admin only; `input: false` stops users from
      // changing them through /api/auth/update-user (e.g. promoting themselves to admin).
      additionalFields: {
          role: {
              type: "string",
              required: true,
              input: false
          },
          username: {
              type: "string",
              required: false
          },
          nama: {
              type: "string",
              required: true,
              input: false
          },
          nipNim: {
              type: "string",
              required: true,
              input: false
          },
          prodi: {
              type: "string",
              required: false,
              input: false
          },
          statusAktif: {
              type: "string",
              required: false,
              input: false
          },
          jabatan: {
              type: "string",
              required: false,
              input: false
          },
          angkatan: {
              type: "string",
              required: false,
              input: false
          }
      }
  },
  hooks: {
      // Record failed sign-in attempts for the Keamanan section of Analisis Log.
      // A logging failure must never change the sign-in response.
      after: createAuthMiddleware(async (ctx) => {
          if (!SIGN_IN_PATHS.includes(ctx.path) || !isAPIError(ctx.context.returned)) return;
          try {
              const body = (ctx.body ?? {}) as { username?: string; email?: string };
              const identifier = String(body.username ?? body.email ?? "").trim().toLowerCase().slice(0, 100);
              if (!identifier) return;

              const [match] = await db
                  .select({ id: schema.users.id })
                  .from(schema.users)
                  .where(body.username ? eq(schema.users.username, identifier) : eq(schema.users.email, identifier))
                  .limit(1);

              const headers = ctx.request?.headers ?? ctx.headers;
              const ip = headers?.get("x-forwarded-for")?.split(",")[0].trim() || headers?.get("x-real-ip") || null;

              await db.insert(schema.loginGagal).values({
                  id: crypto.randomUUID(),
                  identifier,
                  userId: match?.id ?? null,
                  alasan: ctx.context.returned.message || ctx.context.returned.status?.toString() || null,
                  ipAddress: ip,
                  userAgent: headers?.get("user-agent") ?? null,
              });
          } catch (error) {
              console.error("Failed to write login_gagal:", error);
          }
      }),
  },
  databaseHooks: {
      session: {
          create: {
              // Every new session is a successful login: keep a permanent copy for Analisis Log,
              // since session rows are deleted on logout. A logging failure must never block the login.
              after: async (newSession) => {
                  try {
                      await db.insert(schema.loginLog).values({
                          id: crypto.randomUUID(),
                          userId: newSession.userId,
                          ipAddress: newSession.ipAddress ?? null,
                          userAgent: newSession.userAgent ?? null,
                          createdAt: newSession.createdAt ?? new Date(),
                      });
                  } catch (error) {
                      console.error("Failed to write login_log:", error);
                  }
              }
          }
      }
  }
});
