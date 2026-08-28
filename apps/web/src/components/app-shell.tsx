'use client';

import { usePathname } from 'next/navigation';
import { MobileNav } from '@/components/mobile-nav';
import { MobileTopBar } from '@/components/mobile-top-bar';

/** Top + bottom mobile chrome; desktop uses DesktopNav only. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname.includes('/chat');

  return (
    <>
      {!isChat && <MobileTopBar />}
      <div
        className={
          isChat
            ? 'flex min-h-0 flex-1 flex-col'
            : 'flex min-h-0 flex-1 flex-col pb-[4.25rem] md:pb-0'
        }
      >
        {children}
      </div>
      <MobileNav />
    </>
  );
}
