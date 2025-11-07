import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

type AccountType = 'Free' | 'Premium';

export function Logo({
  className,
  showText = true,
  accountType,
}: {
  className?: string;
  showText?: boolean;
  accountType?: AccountType;
}) {
  const badgeClass =
    accountType === 'Premium'
      ? 'bg-blue-500 text-white'
      : 'bg-primary text-primary-foreground';

  return (
    <div className="flex items-center gap-2">
      <Wallet className={cn('h-8 w-8 text-primary', className)} />
      {showText && (
        <div className="flex items-center gap-2">
          <span className="font-headline text-2xl font-bold">FinanTrack</span>
          {accountType && (
            <Badge
              className={cn(
                'translate-y-[-8px] transform select-none px-1.5 py-0.5 text-[10px] font-bold',
                badgeClass
              )}
            >
              {accountType}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
