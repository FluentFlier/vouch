export function Skeleton({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <div
      className={`bg-vouch-line rounded animate-pulse ${className}`}
    />
  );
}
