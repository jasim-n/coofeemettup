import {
  LegalPageShell,
  LegalReviewNotice,
  LegalSection,
} from '@/components/legal/legal-page';

export const metadata = {
  title: 'Privacy Policy — 9 Circles',
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" eyebrow="Legal" current="privacy">
      <p>
        This Privacy Policy explains how 9 Circles collects, uses, stores, shares, and protects
        personal information.
      </p>

      <LegalSection title="1. Information we may collect">
        <p>
          Account information may include name, username, email, phone number, profile photo,
          authentication information, and information you provide.
        </p>
        <p>
          Profile information may include age, interests, bio, profession, education,
          preferences, photos, and social links.
        </p>
      </LegalSection>

      <LegalSection title="2. Location">
        <p>
          Because 9 Circles includes Nearby and meetup features, we may process approximate or
          precise location depending on the feature and permissions you use. Where possible, we
          recommend approximate location for discovery.
        </p>
      </LegalSection>

      <LegalSection title="3. Messages">
        <p>
          We may store and process messages and related metadata to provide messaging, prevent
          abuse, respond to reports, maintain security, and comply with law. Messages on 9 Circles
          are not end-to-end encrypted.
        </p>
      </LegalSection>

      <LegalSection title="4. Device and technical data">
        <p>
          We may collect IP address, device type, operating system, browser or app version, crash
          information, security information, and similar technical data.
        </p>
      </LegalSection>

      <LegalSection title="5. Usage data">
        <p>
          We may collect information about searches, features used, interactions, meetup
          participation, performance, and other activity needed to operate and improve the
          Platform.
        </p>
      </LegalSection>

      <LegalSection title="6. Use of information">
        <p>
          We may use information to provide the Platform, enable messaging and meetups, provide
          discovery, improve services, prevent fraud and abuse, enforce policies, provide
          support, send service communications, and comply with legal obligations.
        </p>
      </LegalSection>

      <LegalSection title="7. Sharing">
        <p>
          We may share information with service providers needed to operate the Platform,
          including hosting, databases, authentication, email, OTP, analytics, push
          notifications, maps, storage, moderation, customer support, and payment providers
          where applicable. We may also disclose information when required or permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="8. Retention">
        <p>
          We retain information as reasonably necessary to provide the Platform, comply with
          legal obligations, resolve disputes, prevent fraud, enforce agreements, and maintain
          security. Specific retention periods should be added to the final version.
        </p>
      </LegalSection>

      <LegalSection title="9. Account deletion">
        <p>
          You may request account deletion through available settings or by contacting us. Some
          information may be retained where legally or operationally necessary.
        </p>
      </LegalSection>

      <LegalSection title="10. Security">
        <p>
          We use reasonable technical and organizational safeguards. No method of transmission or
          storage is completely secure.
        </p>
      </LegalSection>

      <LegalSection title="11. Children">
        <p>
          9 Circles is intended for people aged 18 and older. We do not knowingly permit accounts
          belonging to people under 18.
        </p>
      </LegalSection>

      <LegalSection title="12. International processing">
        <p>
          Information may be processed in countries where 9 Circles or its service providers
          operate. Applicable safeguards will be used where required.
        </p>
      </LegalSection>

      <LegalSection title="13. User rights">
        <p>
          Depending on applicable law, you may have rights concerning access, correction,
          deletion, objection, restriction, portability, or withdrawal of consent.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>Contact email: 9circles.pk@gmail.com</p>
        <p>Address: Islamabad, Pakistan</p>
      </LegalSection>

      <LegalReviewNotice />
    </LegalPageShell>
  );
}
