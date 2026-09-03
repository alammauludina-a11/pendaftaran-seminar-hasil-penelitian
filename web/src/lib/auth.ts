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
    minPasswordLength: 4,
    maxPasswordLength: 255,
  },
  plugins: [
    username()
  ],
  user: {
      additionalFields: {
          role: {
              type: "string",
              required: true
          },
          username: {
              type: "string",
              required: false
          },
          nama: {
              type: "string",
              required: true
          },
          nipNim: {
              type: "string",
              required: true
          },
          prodi: {
              type: "string",
              required: false
          },
          statusAktif: {
              type: "string",
              required: false
          },
          jabatan: {
              type: "string",
              required: false
          }
      }
  }
});
