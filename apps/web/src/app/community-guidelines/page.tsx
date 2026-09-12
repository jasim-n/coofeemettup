import {
  LegalPageShell,
  LegalSection,
} from '@/components/legal/legal-page';

export const metadata = {
  title: 'Community Guidelines — 9 Circles',
};

export default function CommunityGuidelinesPage() {
  return (
    <LegalPageShell
      title="Community Guidelines"
      eyebrow="Legal"
      current="community-guidelines"
    >
      <p>
        9 Circles is built around discovering people, conversations, experiences, and meetups.
        Treat everyone with respect.
      </p>

      <LegalSection title="1. Respect">
        <p>
          Be polite, honest, and respectful. Respect boundaries, opinions, identities, and
          decisions to end conversations.
        </p>
      </LegalSection>

      <LegalSection title="2. Harassment">
        <p>
          No repeated unwanted contact, threats, intimidation, humiliation, stalking, or
          coordinated harassment.
        </p>
      </LegalSection>

      <LegalSection title="3. Hate and discrimination">
        <p>
          No hateful, dehumanizing, or discriminatory content targeting people based on race,
          ethnicity, nationality, religion, gender, gender identity, sexual orientation,
          disability, age, appearance, medical condition, or other protected characteristics.
        </p>
      </LegalSection>

      <LegalSection title="4. Boundaries">
        <p>
          Nobody owes you attention, friendship, personal information, physical contact, or a
          meetup. Respect &ldquo;no.&rdquo;
        </p>
      </LegalSection>

      <LegalSection title="5. Sexual harassment">
        <p>
          No unsolicited sexual messages or explicit images, unwanted sexual comments, pressure
          for sexual activity or intimate content, or sharing intimate material without
          appropriate consent.
        </p>
      </LegalSection>

      <LegalSection title="6. Minors">
        <p>
          9 Circles is 18+. Do not exploit, groom, sexually target, or arrange inappropriate
          meetings with minors.
        </p>
      </LegalSection>

      <LegalSection title="7. Impersonation">
        <p>Do not impersonate people or use stolen photos or deceptive profiles.</p>
      </LegalSection>

      <LegalSection title="8. Authenticity">
        <p>
          Do not intentionally misrepresent important identity, age, location, relationship,
          professional, or meetup information in a way that deceives or endangers others.
        </p>
      </LegalSection>

      <LegalSection title="9. Privacy">
        <p>
          Do not publish another person&apos;s phone number, address, private messages, intimate
          images, precise location, identification documents, or other sensitive information
          without authorization.
        </p>
      </LegalSection>

      <LegalSection title="10. Doxxing and stalking">
        <p>
          Do not use Nearby or other features to track, follow, monitor, intimidate, or determine
          another person&apos;s home or routine.
        </p>
      </LegalSection>

      <LegalSection title="11. Violence">
        <p>
          No threats, encouragement of violence, intimidation, or organizing violence.
        </p>
      </LegalSection>

      <LegalSection title="12. Illegal activity">
        <p>
          Do not use 9 Circles to facilitate or promote criminal activity, trafficking, illegal
          drug transactions, fraud, stolen goods, or other unlawful activity.
        </p>
      </LegalSection>

      <LegalSection title="13. Scams">
        <p>
          No romance scams, investment scams, fake jobs, phishing, fake giveaways, fraudulent
          fundraising, or pressure for money.
        </p>
      </LegalSection>

      <LegalSection title="14. Spam">
        <p>
          No bulk messages, repetitive promotional content, automated spam, referral spam, or
          unwanted advertising.
        </p>
      </LegalSection>

      <LegalSection title="15. Fake engagement">
        <p>
          No fake accounts or manipulation of likes, reviews, rankings, attendance, reports, or
          other engagement signals.
        </p>
      </LegalSection>

      <LegalSection title="16. Commercial solicitation">
        <p>
          Do not treat members as a customer list without permission. Commercial activity must
          remain within expressly permitted areas.
        </p>
      </LegalSection>

      <LegalSection title="17. Meetups">
        <p>
          Attendees should follow meetup rules and respect organizers and participants.
          Organizers must provide accurate information and maintain a respectful environment.
        </p>
      </LegalSection>

      <LegalSection title="18. Dangerous activities">
        <p>
          Do not organize or promote activities creating unreasonable danger. Significant risks
          should be disclosed.
        </p>
      </LegalSection>

      <LegalSection title="19. Off-platform contact">
        <p>
          Do not pressure anyone to provide phone numbers, WhatsApp, social media, email, home
          address, workplace information, or other personal information.
        </p>
      </LegalSection>

      <LegalSection title="20. Content">
        <p>
          Content must not be abusive, hateful, threatening, exploitative, fraudulent, illegal,
          or intentionally designed to shock or harass.
        </p>
      </LegalSection>

      <LegalSection title="21. Reporting">
        <p>
          Report violating profiles, messages, meetups, or content. Do not retaliate.
        </p>
      </LegalSection>

      <LegalSection title="22. False reports">
        <p>
          Do not knowingly submit false reports or coordinate reports to harass another user.
        </p>
      </LegalSection>

      <LegalSection title="23. Enforcement">
        <p>
          Actions may include warnings, content removal, feature restrictions, meetup removal,
          suspension, or permanent bans.
        </p>
      </LegalSection>

      <LegalSection title="24. Ban evasion">
        <p>Do not create new accounts to evade enforcement.</p>
      </LegalSection>

      <LegalSection title="25. Be a good member">
        <p>
          Welcome newcomers, communicate clearly, respect different comfort levels, and help make
          9 Circles a community people want to return to.
        </p>
      </LegalSection>

      <p className="border-t pt-6 italic">
        When in doubt: &ldquo;Would I be comfortable if this happened to me?&rdquo;
      </p>
    </LegalPageShell>
  );
}
