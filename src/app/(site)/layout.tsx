import { SiteFooter } from "@/components/site/footer";
import { SiteNav } from "@/components/site/nav";
import { getUser } from "@/lib/auth/session";

/**
 * The public chrome.
 *
 * It asks who is signed in for one reason: a returning member who lands on the
 * marketing page should be offered the way in, not invited to create a second
 * account. That single check is worth more to sign-in rates than any copy on the
 * page.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const signedIn = Boolean(user);

  return (
    <>
      <SiteNav signedIn={signedIn} />
      <main id="main">{children}</main>
      <SiteFooter signedIn={signedIn} />
    </>
  );
}
