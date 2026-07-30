import { auth } from "@/lib/auth"; // We will fix the import if @/ is not mapped, better use relative
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
