import { createFileRoute } from '@tanstack/react-router'
import LegalPage, { LegalSection } from '@/components/LegalPage'
import { siteUrl } from '@/lib/site'

const contactEmail = 'mr.joshua.ansah@gmail.com'

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [
      { title: 'Terms and Conditions — DayKindle' },
      {
        name: 'description',
        content: 'The terms for using the DayKindle app and website.',
      },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
    links: siteUrl ? [{ rel: 'canonical', href: siteUrl + '/terms' }] : [],
  }),
  component: TermsPage,
})

function TermsPage() {
  return (
    <LegalPage
      title="Terms and Conditions"
      intro="DayKindle is built for community use. These terms cover the official app and website; source-code reuse follows the license that applies to each part of the project."
    >
      <p className="legal-updated">Last updated: 8 October 2026</p>

      <LegalSection title="1. Who provides DayKindle">
        <p>
          These terms cover the official DayKindle mobile app, public website, and hosted service operated by Joshua Ansah (“we”, “us”, or “our”). The source code is shared for community use. Applicable source-code licenses govern reuse of the code. These terms govern the official hosted service and do not take away rights those licenses grant. Our postal address is{' '}
          <strong>[Add the operator’s postal address before publication]</strong>. You can contact us at{' '}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
        <p>
          These terms do not cover a fork or self-hosted copy run by another person or organization. That operator may set different terms and privacy practices.
        </p>
      </LegalSection>

      <LegalSection title="2. Who can use DayKindle">
        <p>
          You must be at least 13 to use DayKindle. If you are under 18, or under the age of legal majority where you live, you may use it only when any permission required by local law has been given by your parent or legal guardian. By using DayKindle, you confirm that you meet these requirements.
        </p>
        <p>
          DayKindle is not designed for children under 13. If you believe a child under 13 has created an account, contact us so we can review and remove the account and associated data where appropriate.
        </p>
      </LegalSection>

      <LegalSection title="3. What DayKindle does">
        <p>
          DayKindle helps you organize goals, habits, routines, tasks, check-ins, and reflections. You can use a guest workspace on your device. If you create an account, you can choose to sync planner information to your account. Signing in by itself does not give us permission to sync your planner; you choose whether to start sync in the app.
        </p>
        <p>
          Reminders depend on the settings and permissions on your device. You can change or turn them off in the app or your device settings.
        </p>
      </LegalSection>

      <LegalSection title="4. Your account and your planner content">
        <p>
          Keep your sign-in details secure and tell us promptly if you think someone else has accessed your account. You are responsible for activity carried out through your account, except where applicable law says otherwise.
        </p>
        <p>
          You keep your rights to the goals, notes, reflections, and other material you enter. The open-source code does not include or publish your planner content. You give us permission to process your content only as needed to run the app, provide sync you choose, maintain security, and respond to support requests. We do not make your entries public, read them to measure individual users, or use them for advertising.
        </p>
        <p>
          Signing in does not start sync. If you choose cloud sync, your records are stored in the official Supabase project and protected by account access policies. They are not end-to-end encrypted, so a technically privileged service operator could access them. The Privacy Policy explains what the official service collects and how I use aggregate product metrics. I do not review individual plans, goals, routines, tasks, check-ins, reflections, or commitments.
        </p>
        <p>
          You are responsible for what you record. Do not use DayKindle to store information that you are not entitled to provide, or to upload harmful, unlawful, or infringing material.
        </p>
      </LegalSection>

      <LegalSection title="5. Use the app with your own judgment">
        <p>
          DayKindle is an organizing tool. It is not medical care, mental-health treatment, counselling, crisis support, or professional advice, and it does not promise a particular result. If you need professional or urgent help, contact a qualified person or service in your area.
        </p>
      </LegalSection>

      <LegalSection title="6. Changes and availability">
        <p>
          We may update, suspend, or discontinue parts of DayKindle to maintain or improve the service, comply with law, or address security issues. We will take reasonable steps to give notice of material changes when practical. We cannot promise that every feature will always be available or that data can never be lost, so keep any separate copy you need.
        </p>
      </LegalSection>

      <LegalSection title="7. Ending your use">
        <p>
          You can stop using the app at any time. You can request account deletion from the app’s Profile area or by emailing us. Deleting an account may not remove a guest workspace stored separately on your device. We may suspend or close an account if it is used in a way that creates a serious security, legal, or service risk. We will explain the reason where the law allows us to do so.
        </p>
      </LegalSection>

      <LegalSection title="8. DayKindle’s name and software">
        <p>
          The license that applies to each part of the source code governs whether and how you may use, modify, share, or self-host it. These terms do not narrow rights granted by a source-code license or grant additional code rights. DayKindle’s name, logo, and other brand marks are separate and are not licensed by these terms unless a separate license says otherwise.
        </p>
        <p>
          The source code license does not make the official hosted service, its database, or users’ planner content public. If you run a community fork or your own hosted copy, you are responsible for its operation and for explaining its data practices to its users.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimers and limits">
        <p>
          We provide DayKindle with reasonable care, but the service is offered as available and may have interruptions or errors. Nothing in these terms removes a consumer right, remedy, or liability that cannot be excluded under the law that applies to you.
        </p>
        <p>
          To the extent the law allows, we are not responsible for indirect or consequential loss arising from your use of DayKindle. Any other limit on our liability applies only to the extent permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="10. Which law applies">
        <p>
          Ghanaian law governs these terms, subject to any mandatory consumer protections that apply where you live. Any dispute will be handled by a court with proper jurisdiction under those rules.
        </p>
      </LegalSection>

      <LegalSection title="11. Updates and contact">
        <p>
          If we change these terms, we will update the date at the top of this page and provide notice where required. Questions about these terms can be sent to{' '}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
