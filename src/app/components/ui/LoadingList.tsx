

interface LoadingListProps {
  items?: number;
  height?: string;
}

export function LoadingList({ items = 3, height = 'h-16' }: LoadingListProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className={`${height} rounded-xl shimmer`} />
      ))}
    </div>
  );
}