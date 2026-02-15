'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

interface ProfileDisplay {
  avatar_url: string | null;
  display_name: string | null;
  full_name: string | null;
}

interface AppHeaderProps {
  user: User;
  profileDisplay: ProfileDisplay | null;
}

function getInitials(user: User, profileDisplay: ProfileDisplay | null): string {
  const name = profileDisplay?.display_name || profileDisplay?.full_name;
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const email = user.email;
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
}

function getAvatarUrl(user: User, profileDisplay: ProfileDisplay | null): string | undefined {
  const url = profileDisplay?.avatar_url;
  if (url) return url;
  return user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
}

export default function AppHeader({ user, profileDisplay }: AppHeaderProps) {
  const pathname = usePathname();
  const avatarUrl = getAvatarUrl(user, profileDisplay);
  const initials = getInitials(user, profileDisplay);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <nav className="flex items-center gap-6">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt="" />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
