import { AppNav } from "@/components/app/app-nav";
import { requireMember } from "@/lib/auth/session";
import { countUnreadNotifications } from "@/lib/data/players";

/**
 * The member area.
 *
 * `requireMember()` here is the gate for everything beneath it: signed in and
 * onboarded, or redirected. The proxy already turned away signed-out requests
 * optimistically, but this is the check that counts — and each page and action
 * re-checks as well, because a Server Action is reachable by direct POST
 * regardless of which layout rendered the button.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile } = await requireMember();
  const unread = await countUnreadNotifications(userId);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppNav person={profile} unread={unread} isModerator={profile.is_moderator} />
      <main id="main" className="flex-1 pb-20">
        {children}
      </main>
    </div>
  );
}
