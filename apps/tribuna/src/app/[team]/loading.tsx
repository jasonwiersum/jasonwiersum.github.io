export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy aria-label="Cargando">
      <div className="h-8 w-48 rounded-xl bg-fill" />
      <div className="h-72 rounded-[28px] bg-fill" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-64 rounded-3xl bg-fill" />
        <div className="h-64 rounded-3xl bg-fill" />
      </div>
    </div>
  );
}
