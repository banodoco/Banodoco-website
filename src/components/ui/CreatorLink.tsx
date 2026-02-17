import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CreatorLinkProps {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeConfig = {
  sm: { avatar: 'w-5 h-5', text: 'text-xs' },
  md: { avatar: 'w-8 h-8', text: 'text-sm' },
} as const;

export const CreatorLink = ({
  username,
  displayName,
  avatarUrl,
  size = 'sm',
  className,
}: CreatorLinkProps) => {
  const { avatar, text } = sizeConfig[size];
  const label = displayName || username || 'Unknown';
  const initial = label.charAt(0).toUpperCase();

  const content = (
    <span className={cn('inline-flex items-center gap-1.5 min-w-0', className)}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={label}
          className={cn(avatar, 'rounded-full flex-shrink-0 object-cover')}
          loading="lazy"
        />
      ) : (
        <span
          className={cn(
            avatar,
            'rounded-full flex-shrink-0 bg-white/10 flex items-center justify-center',
          )}
        >
          <span className="text-[10px] text-white/40 font-medium">{initial}</span>
        </span>
      )}
      <span className={cn(text, 'text-zinc-300 truncate')}>{label}</span>
    </span>
  );

  if (!username) {
    return content;
  }

  return (
    <Link
      to={`/u/${username}`}
      className="hover:opacity-80 transition-opacity"
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </Link>
  );
};
