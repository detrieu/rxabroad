'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogInIcon, LogOutIcon, MapIcon, SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth/client';

export function AccountMenu() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const user = data?.user;

  // Reserve the space while the session loads so the header doesn't jump.
  if (isPending) return <span className="size-8" aria-hidden="true" />;

  if (!user) {
    return (
      <Button asChild variant="ghost" className="text-navy-foreground hover:text-gold hover:bg-white/10 dark:hover:bg-white/10">
        <Link href="/auth/sign-in">
          <LogInIcon />
          <span className="hidden sm:inline">Sign in</span>
        </Link>
      </Button>
    );
  }

  const label = user.name || user.email;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Account: ${label}`}
          className="hover:bg-white/10 dark:hover:bg-white/10"
        >
          <span className="bg-gold text-navy grid size-7 place-items-center rounded-full font-heading text-sm font-bold uppercase">
            {label.trim().charAt(0)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel className="font-normal">
          {user.name && <span className="block font-medium">{user.name}</span>}
          <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/my-meds"><MapIcon /> My trips</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/settings"><SettingsIcon /> Account settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await authClient.signOut();
            router.refresh();
          }}
        >
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
