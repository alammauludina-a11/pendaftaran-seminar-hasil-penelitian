import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";

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
  }
});
