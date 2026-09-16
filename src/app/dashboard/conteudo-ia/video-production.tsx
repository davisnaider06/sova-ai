"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  Clapperboard,
  Image as ImageIcon,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import type { VideoScript } from "@/lib/ai/video-script";
import { generateCoverImage, saveCharacterPhoto, submitVideo } from "./actions";
import { COVER_IMAGE_IDLE, VIDEO_GENERATION_IDLE } from "./contract";

// ---------------------------------------------------------------------------
// A etapa depois do roteiro: transformar texto em imagem e vídeo de verdade.
//
// Dois provedores, dois ritmos diferentes. Imagem (OpenAI) responde em
// segundos — formulário comum, useActionState resolve sozinho. Vídeo
// (Runway) leva minutos — a Server Action só submete e devolve um id; o
// acompanhamento é feito por polling em /api/video-generations/[id], porque
// não dá para segurar uma requisição por minutos.
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 6000;
const MAX_POLLS = 150; // ~15 minutos

export function VideoProductionPanel({
  productId,
  script,
  imageConfigured,
  videoConfigured,
  hasCharacterPhoto,
}: {
  productId: string;
  script: VideoScript;
  imageConfigured: boolean;
  videoConfigured: boolean;
  hasCharacterPhoto: boolean;
}) {
  const [hasPhoto, setHasPhoto] = useState(hasCharacterPhoto);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CoverImageCard productId={productId} script={script} configured={imageConfigured} />
      <VideoCard
        productId={productId}
        script={script}
        configured={videoConfigured}
        hasPhoto={hasPhoto}
        onPhotoSaved={() => setHasPhoto(true)}
      />
    </div>
  );
}

function NotConfiguredNote({ envVar }: { envVar: string }) {
  return (
    <p className="mt-2 rounded-xl bg-status-warning/10 px-3 py-2 text-xs text-ink-secondary">
      Falta a variável <code className="text-ink-primary">{envVar}</code> no ambiente.
    </p>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-status-critical/10 px-3 py-2 text-xs text-ink-primary">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-critical" />
      {message}
    </p>
  );
}

function CoverImageCard({
  productId,
  script,
  configured,
}: {
  productId: string;
  script: VideoScript;
  configured: boolean;
}) {
  const [state, formAction] = useActionState(generateCoverImage, COVER_IMAGE_IDLE);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand-ink">
          <ImageIcon className="h-4 w-4" />
        </span>
        <p className="text-sm font-medium text-ink-primary">Imagem de capa</p>
      </div>

      {!configured && <NotConfiguredNote envVar="OPENAI_API_KEY" />}

      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="hook" value={script.hook} />
        <input type="hidden" name="firstSceneAction" value={script.scenes[0]?.action ?? ""} />

        {state.status === "error" && <ErrorNote message={state.message} />}

        {state.status === "done" && (
          <img
            src={`data:image/png;base64,${state.imageBase64}`}
            alt="Capa gerada por IA"
            className="w-full rounded-xl border border-border-hairline"
          />
        )}

        <SubmitButton pendingLabel="Gerando imagem..." disabled={!configured} className="w-full">
          Gerar imagem de capa
        </SubmitButton>
      </form>
    </Card>
  );
}

function PhotoUploadForm({ onSaved }: { onSaved: () => void }) {
  const [state, formAction] = useActionState(saveCharacterPhoto, { status: "idle" as const });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "done") onSaved();
  }, [state, onSaved]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <p className="text-xs text-ink-secondary">
        Para gerar o vídeo, a Runway precisa de uma foto sua — é quem aparece na tela. Fica salva
        no seu perfil, você só envia uma vez.
      </p>
      {state.status === "error" && <ErrorNote message={state.message ?? "Falha ao salvar a foto."} />}
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2 px-4 py-6 text-center text-xs text-ink-secondary transition-colors hover:border-brand">
        <UploadCloud className="h-5 w-5 text-ink-muted" />
        Escolher foto (JPG ou PNG, até 5&nbsp;MB)
        <input
          type="file"
          name="photo"
          accept="image/*"
          required
          className="hidden"
          onChange={() => formRef.current?.requestSubmit()}
        />
      </label>
      <SubmitButton pendingLabel="Enviando foto..." className="w-full">
        <Camera className="h-4 w-4" /> Salvar foto
      </SubmitButton>
    </form>
  );
}

type PollResult = {
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  outputUrl?: string;
  errorMessage?: string;
};

function VideoCard({
  productId,
  script,
  configured,
  hasPhoto,
  onPhotoSaved,
}: {
  productId: string;
  script: VideoScript;
  configured: boolean;
  hasPhoto: boolean;
  onPhotoSaved: () => void;
}) {
  const [state, formAction] = useActionState(submitVideo, VIDEO_GENERATION_IDLE);
  const [poll, setPoll] = useState<PollResult | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status !== "submitted") return;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      attempts += 1;
      try {
        const res = await fetch(`/api/video-generations/${(state as { id: string }).id}`);
        if (cancelled) return;
        if (!res.ok) {
          setPollError("Não consegui consultar o status agora. Tentando de novo...");
        } else {
          const data = (await res.json()) as PollResult;
          setPoll(data);
          setPollError(null);
          if (data.status === "SUCCEEDED" || data.status === "FAILED") return;
        }
      } catch {
        if (!cancelled) setPollError("Não consegui consultar o status agora. Tentando de novo...");
      }
      if (!cancelled && attempts < MAX_POLLS) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    }

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand-ink">
          <Clapperboard className="h-4 w-4" />
        </span>
        <p className="text-sm font-medium text-ink-primary">Vídeo gerado por IA</p>
      </div>

      {!configured && <NotConfiguredNote envVar="RUNWAYML_API_SECRET" />}

      {configured && !hasPhoto && (
        <div className="mt-3">
          <PhotoUploadForm onSaved={onPhotoSaved} />
        </div>
      )}

      {configured && hasPhoto && (
        <form action={formAction} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="script" value={JSON.stringify(script)} />

          {state.status === "error" && <ErrorNote message={state.message} />}

          <p className="text-xs text-ink-muted">
            Leva alguns minutos. O vídeo usa o roteiro acima como direção — sua foto e a foto do
            produto entram como referência.
          </p>

          <SubmitButton pendingLabel="Enviando pedido..." className="w-full">
            Gerar vídeo
          </SubmitButton>
        </form>
      )}

      {poll && (
        <div className="mt-3 rounded-xl bg-surface-2 p-3">
          {(poll.status === "PENDING" || poll.status === "RUNNING") && (
            <p className="flex items-center gap-2 text-xs text-ink-secondary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {poll.status === "PENDING" ? "Na fila da Runway..." : "Gerando o vídeo..."}
            </p>
          )}
          {poll.status === "SUCCEEDED" && poll.outputUrl && (
            <div className="flex flex-col gap-2">
              <video controls src={poll.outputUrl} className="w-full rounded-lg" />
              <p className="text-[11px] text-ink-muted">
                O link expira em 24-48h — baixe o vídeo agora e guarde por sua conta.
              </p>
              <a
                href={poll.outputUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-brand-ink underline underline-offset-2"
              >
                Abrir/baixar vídeo
              </a>
            </div>
          )}
          {poll.status === "FAILED" && (
            <ErrorNote message={poll.errorMessage ?? "A geração falhou."} />
          )}
          {pollError && <p className="mt-2 text-[11px] text-ink-muted">{pollError}</p>}
        </div>
      )}
    </Card>
  );
}
