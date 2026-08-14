import type { VideoScript } from "@/lib/ai/video-script";

// Estado do formulário, num módulo próprio: um arquivo `"use server"` só pode
// exportar funções async, então a constante inicial não cabe no actions.ts.
export type ScriptState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; script: VideoScript; productName: string };

export const SCRIPT_IDLE: ScriptState = { status: "idle" };
