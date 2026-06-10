export function InlineSuccessMessage({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800"
      role="status"
    >
      {children}
    </p>
  );
}
