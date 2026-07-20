import Link from 'next/link';
import { Wordmark } from '@/components/wordmark';

export const metadata = {
  title: 'Terms of Service — Coffee Meetups',
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-8">
        <Wordmark className="text-base" />
        <p className="eyebrow text-primary mt-6">Legal</p>
        <h1 className="display mt-1 text-4xl">Terms of Service</h1>
        <p className="text-muted-foreground mt-2 text-sm">Last updated: 20 July 2026</p>
      </div>

      <div className="text-muted-foreground space-y-6 text-sm leading-relaxed">
        <Section title="1. Who we are">
          Coffee Meetups arranges small, curated group meetups over coffee in Islamabad and Lahore.
          By creating an account or joining a meetup you agree to these terms.
        </Section>
        <Section title="2. Eligibility">
          You must be 18 or older and provide accurate profile information. We may ask you to verify
          your identity before or after attending.
        </Section>
        <Section title="3. Bookings & payment">
          A booking is confirmed once payment is received. The ticket price includes one coffee or
          chai at the venue. Prices are shown per event in PKR.
        </Section>
        <Section title="4. Cancellations & refunds">
          You may cancel a booking any time. Cancellations more than 24 hours before the event start
          receive a full refund; cancellations within 24 hours are non-refundable. If we cancel an
          event, you are always refunded in full.
        </Section>
        <Section title="5. Community conduct">
          You agree to our Community Code of Conduct: be respectful, show up on time, and keep the
          space safe for everyone. No-shows affect your reliability score. Harassment or unsafe
          behaviour can lead to removal without refund.
        </Section>
        <Section title="6. Safety">
          Meet in the public venue provided and use your own judgement. Report anyone who makes you
          uncomfortable — you can block or report members from your group at any time.
        </Section>
        <Section title="7. Changes">
          We may update these terms as the product evolves. Continued use after an update means you
          accept the revised terms.
        </Section>
        <Section title="8. Contact">
          Questions? Reach us through the app or at the contact channel shown on our social profiles.
        </Section>

        <p className="text-muted-foreground/70 border-t pt-6 text-xs">
          This is a plain-language template for an early-stage pilot and is not legal advice. Have it
          reviewed by a qualified lawyer before public launch.
        </p>
      </div>

      <div className="mt-8 flex gap-4 text-sm font-semibold">
        <Link href="/privacy" className="text-primary hover:underline">
          Privacy Policy
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
