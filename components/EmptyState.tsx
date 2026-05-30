export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface-soft border-dashed p-8 text-center">
      <div className="mx-auto mb-4 grid size-11 place-items-center rounded-full border border-line bg-white text-sm font-black text-action">
        CD
      </div>
      <h2 className="text-base font-black text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}
