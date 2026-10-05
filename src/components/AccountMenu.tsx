'use client';

import { SignInButton, UserButton, useAuth } from '@clerk/nextjs';
import { LogInIcon, MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Header account control: "Sign in" when signed out, Clerk's account menu (plus "My trips") when signed in. */
export function AccountMenu() {
  const { isLoaded, isSignedIn } = useAuth();

  // Reserve the space while Clerk loads so the header doesn't jump.
  if (!isLoaded) return <span className="size-8" aria-hidden="true" />;

  if (!isSignedIn) {
    return (
      <SignInButton mode="redirect">
        <Button variant="ghost" className="text-navy-foreground hover:text-gold hover:bg-white/10 dark:hover:bg-white/10">
          <LogInIcon />
          <span className="hidden sm:inline">Sign in</span>
        </Button>
      </SignInButton>
    );
  }

  return (
    <div className="grid size-8 place-items-center">
      <UserButton>
        <UserButton.MenuItems>
          <UserButton.Link label="My trips" labelIcon={<MapIcon className="size-4" />} href="/my-meds" />
        </UserButton.MenuItems>
      </UserButton>
    </div>
  );
}
