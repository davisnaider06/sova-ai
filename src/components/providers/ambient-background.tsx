export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-page">
      <div className="absolute -top-32 left-[8%] h-[420px] w-[420px] rounded-full bg-brand/25 blur-[130px] dark:bg-brand/20" />
      <div className="absolute top-[15%] right-[5%] h-[380px] w-[380px] rounded-full bg-sky-400/20 blur-[130px] dark:bg-sky-500/15" />
      <div className="absolute bottom-[-10%] left-[30%] h-[460px] w-[460px] rounded-full bg-violet-400/15 blur-[140px] dark:bg-violet-500/10" />
    </div>
  );
}
