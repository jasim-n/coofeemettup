import Link from 'next/link';
import { Wordmark } from '@/components/wordmark';

export const metadata = {
  title: 'Privacy Policy — Coffee Meetups',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-8">
        <Wordmark className="text-base" />
        <p className="eyebrow text-primary mt-6">Legal</p>
        <h1 className="display mt-1 text-4xl">Privacy Policy</h1>
        <p className="text-muted-foreground mt-2 text-sm">Last updated: 20 July 2026</p>
      </div>

      <div className="text-muted-foreground space-y-6 text-sm leading-relaxed">
        <Section title="What we collect">
          Your phone number (for sign-in), the profile details you provide (name, age band, gender,
          areas, interests, preferences), your bookings and attendance, feedback you submit, and — if
          you choose to verify — a CNIC image for review.
        </Section>
        <Section title="How we use it">
          To run meetups: authenticate you, match you into compatible groups, process bookings and
          payments, keep the community safe, and improve the experience. Feedback helps us tune
          matching and decide which events to run.
        </Section>
        <Section title="What we show others">
          Group members see only your first name, last initial, and a few interests — never your
          phone number, exact identity, or contact details.
        </Section>
        <Section title="Payments">
          Payments are handled by a payment provider. We store a payment reference and amount, not
          your full card details.
        </Section>
        <Section title="Verification data">
          CNIC images are used solely to verify identity and are access-restricted to reviewers. They
          are not shared with other members.
        </Section>
        <Section title="Your choices">
          You can edit your profile, block or report members, and cancel bookings at any time. Ask us
          to delete your account and we will remove your personal data, keeping only what the law
          requires.
        </Section>
        <Section title="Retention & security">
          We keep data only as long as needed to run the service and protect it with access controls.
          No system is perfectly secure, so please share sensitive details thoughtfully.
        </Section>

        <p className="text-muted-foreground/70 border-t pt-6 text-xs">
          This is a plain-language template for an early-stage pilot and is not legal advice. Have it
          reviewed by a qualified lawyer before public launch.
        </p>
      </div>

      <div className="mt-8 flex gap-4 text-sm font-semibold">
        <Link href="/terms" className="text-primary hover:underline">
          Terms of Service
        </Link>
        <Link href="/" className="text-muted-foreground hover:underline">
          Home
        </Link>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-foreground mb-1 text-base font-bold tracking-tight">
        {title}
      </h2>
      <p>{children}</p>
    </section>
  );
}
