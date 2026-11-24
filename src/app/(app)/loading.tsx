export default function Loading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="در حال بارگذاری">
      <div className="skeleton h-10 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)}</div>
      <div className="skeleton h-64" />
    </div>
  );
}
