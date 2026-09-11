'use client';

import Link from 'next/link';
import type { PublicUser } from '@jrst/api-client';
import { Avatar } from '@/components/avatar';

export function accountDisplayName(user: PublicUser): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    (user.username ? `@${user.username}` : 'Member')
  );
}

export function AccountMenuHeader({ user }: { user: PublicUser }) {
  const name = accountDisplayName(user);
  return (
    <div className="flex items-center gap-3 p-4">
      <Avatar name={name} src={user.photoUrl} size={48} online />
      <div className="min-w-0">
        <p className="font-heading truncate font-bold tracking-tight">{name}</p>
        <p className="text-muted-foreground truncate text-xs">
          {user.username ? `@${user.username}` : 'Set your handle'}
        </p>
        <span className="bg-secondary text-secondary-foreground mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
          <i className="fa-solid fa-star text-[0.9em]" />
          {user.verificationStatus === 'VERIFIED' ? 'Verified member' : 'Member'}
        </span>
      </div>
    </div>
  );
}

export function AccountMenuLinks({
  user,
  onNavigate,
}: {
  user: PublicUser;
  onNavigate?: () => void;
}) {
  const isAdmin = user.role === 'ADMIN' || user.role === 'ORGANIZER';
  return (
    <div className="p-2">
      <MenuItem
        href="/profile"
        icon="fa-user"
        title="View Profile"
        sub="See your public profile"
        onNavigate={onNavigate}
      />
      <MenuItem
        href="/meetups"
        icon="fa-calendar-days"
        title="My Meetups"
        sub="Manage your meetups"
        onNavigate={onNavigate}
      />
      <MenuItem
        href="/invites"
        icon="fa-user-group"
        title="Invitations"
        sub="Requests & invites"
        onNavigate={onNavigate}
      />
      <MenuItem
        href="/saved"
        icon="fa-bookmark"
        title="Saved"
        sub="Browse & saved meetups"
        onNavigate={onNavigate}
      />
      <MenuItem
        href="/profile"
        icon="fa-gear"
        title="Settings"
        sub="Account & preferences"
        onNavigate={onNavigate}
      />
      {isAdmin && (
        <MenuItem
          href="/admin"
          icon="fa-shield-halved"
          title="Admin"
          sub="Console & moderation"
          onNavigate={onNavigate}
        />
      )}
      <MenuItem
        href="/terms"
        icon="fa-circle-question"
        title="Help & Support"
        sub="Get help and support"
        onNavigate={onNavigate}
      />
    </div>
  );
}

export function AccountMenuLogout({
  onLogout,
}: {
  onLogout: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => void onLogout()}
      className="text-destructive hover:bg-destructive/5 flex w-full items-center gap-3 px-4 py-3 text-left"
    >
      <i className="fa-solid fa-right-from-bracket w-4 text-center" />
      <span>
        <span className="block text-sm font-semibold">Log Out</span>
        <span className="block text-xs opacity-80">Sign out from your account</span>
      </span>
    </button>
  );
}

function MenuItem({
  href,
  icon,
  title,
  sub,
  onNavigate,
}: {
  href: string;
  icon: string;
  title: string;
  sub: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="hover:bg-muted flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors"
    >
      <span className="bg-secondary text-primary grid size-9 shrink-0 place-items-center rounded-xl">
        <i className={`fa-solid ${icon} text-sm`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground block truncate text-xs">{sub}</span>
      </span>
      <i className="fa-solid fa-chevron-right text-muted-foreground text-xs" />
    </Link>
  );
}
