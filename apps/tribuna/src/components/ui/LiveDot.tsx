export function LiveDot() {
  return (
    <span className="relative inline-flex size-2">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-live opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-live" />
    </span>
  );
}
