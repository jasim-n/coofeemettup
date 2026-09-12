import {
  LegalPageShell,
  LegalReviewNotice,
  LegalSection,
} from '@/components/legal/legal-page';

export const metadata = {
  title: 'Terms of Service — 9 Circles',
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" eyebrow="Legal" current="terms">
      <p>
        Welcome to 9 Circles. These Terms of Service (&ldquo;Terms&rdquo;) govern your use of
        the 9 Circles website, mobile applications, messaging, discovery features, meetup
        features, and related services (&ldquo;Platform&rdquo;).
      </p>
      <p>By creating an account or using the Platform, you agree to these Terms.</p>

      <LegalSection title="1. Eligibility">
        <p>
          9 Circles is intended for adults aged 18 and older. You must provide accurate
          information and comply with applicable law.
        </p>
      </LegalSection>

      <LegalSection title="2. Your account">
        <p>
          You are responsible for keeping your account credentials secure and for activity
          conducted through your account. Notify us promptly of unauthorized access.
        </p>
      </LegalSection>

      <LegalSection title="3. Our services">
        <p>
          9 Circles may provide profiles, discovery, Nearby, messaging, meetups, and related
          community features. Features may change, be suspended, or be discontinued.
        </p>
      </LegalSection>

      <LegalSection title="4. User content">
        <p>
          You retain ownership of content you submit. You grant 9 Circles a limited,
          non-exclusive license to host, store, reproduce, display, and distribute your content
          as reasonably necessary to operate, secure, and improve the Platform. You must have
          the rights necessary to submit your content.
        </p>
      </LegalSection>

      <LegalSection title="5. Prohibited conduct">
        <p>
          You may not harass, threaten, stalk, impersonate, scam, spam, exploit minors, share
          private information without authorization, upload malware, scrape data without
          authorization, circumvent security or bans, manipulate engagement, or use the Platform
          for illegal activity.
        </p>
      </LegalSection>

      <LegalSection title="6. Real-world interactions">
        <p>
          9 Circles does not guarantee the identity, intentions, background, conduct, or safety
          of any user. You are responsible for decisions concerning conversations and in-person
          interactions.
        </p>
      </LegalSection>

      <LegalSection title="7. Meetups">
        <p>
          Organizers and attendees are responsible for their conduct and safety. Meetups must
          comply with applicable law and venue rules.
        </p>
      </LegalSection>

      <LegalSection title="8. Payments">
        <p>
          If paid services are introduced, prices, taxes, refunds, and payment terms will be
          shown before purchase. Third-party payment providers may process transactions.
        </p>
      </LegalSection>

      <LegalSection title="9. Moderation">
        <p>
          We may remove content, restrict features, suspend accounts, or permanently ban accounts
          for violations of these Terms, Community Guidelines, or safety requirements.
        </p>
      </LegalSection>

      <LegalSection title="10. Disclaimer">
        <p>
          To the maximum extent permitted by law, the Platform is provided on an &ldquo;as
          available&rdquo; basis. We do not guarantee uninterrupted availability, user identity,
          user behavior, content accuracy, meetup attendance, or offline safety.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitation of liability">
        <p>
          To the maximum extent permitted by applicable law, 9 Circles and its operators will not
          be liable for indirect, incidental, consequential, special, or punitive damages arising
          from use of the Platform. Nothing excludes liability that cannot legally be excluded.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes">
        <p>
          We may update these Terms and will provide appropriate notice of material changes.
        </p>
      </LegalSection>

      <LegalSection title="13. Governing law">
        <p>
          These Terms are governed by the laws of Pakistan, subject to applicable mandatory law.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>9 Circles</p>
        <p>Contact email: 9circles.pk@gmail.com</p>
        <p>Address: Islamabad, Pakistan</p>
      </LegalSection>

      <LegalReviewNotice />
    </LegalPageShell>
  );
}
