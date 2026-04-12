import { Button } from "@/components/ui/button";
import { InboxIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            {icon || <InboxIcon size={32} className="text-gray-400" />}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600 text-sm mt-1">{description}</p>
        </div>

        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            className="mt-4 bg-primary hover:bg-primary/90 text-white"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
