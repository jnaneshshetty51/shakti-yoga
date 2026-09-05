"use client";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ 
  className = "", 
  variant = "rectangular",
  width,
  height 
}: SkeletonProps) {
  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={`bg-gray-200 animate-pulse ${variantClasses[variant]} ${className}`}
      style={{
        width: width,
        height: height,
      }}
    />
  );
}

// Preset loading skeletons for common components
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton variant="text" height={16} className="w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <Skeleton variant="text" height={12} width="30%" className="mb-4" />
      <Skeleton variant="text" height={28} width="60%" className="mb-2" />
      <Skeleton variant="text" height={14} width="40%" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <Skeleton variant="text" height={12} width="50%" />
        <Skeleton variant="circular" width={40} height={40} />
      </div>
      <Skeleton variant="text" height={32} width="40%" />
      <Skeleton variant="text" height={14} width="60%" className="mt-2" />
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1">
        <Skeleton variant="text" height={16} width="40%" className="mb-2" />
        <Skeleton variant="text" height={14} width="60%" />
      </div>
    </div>
  );
}

export function AvatarSkeleton({ size = 40 }: { size?: number }) {
  return <Skeleton variant="circular" width={size} height={size} />;
}

// Page skeleton for full page loading
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton variant="text" height={32} width={200} className="mb-2" />
          <Skeleton variant="text" height={16} width={300} />
        </div>
        <Skeleton variant="rectangular" height={40} width={120} />
      </div>
      
      <div className="grid grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Skeleton variant="text" height={20} width={150} className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <Skeleton variant="text" height={20} width={150} className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
