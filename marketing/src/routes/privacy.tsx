import { createFileRoute } from '@tanstack/react-router'
import LegalPage, { LegalSection } from '@/components/LegalPage'
import { createPageSeo } from '@/lib/seo'

const contactEmail = 'mr.joshua.ansah@gmail.com'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    ...createPageSeo({
      title: 'Privacy policy | DayKindle',
      description:
        'Read how DayKindle handles local planner data, optional account sync, analytics, and support requests.',
      pathname: '/privacy',
      noIndex: true,
    }),
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="DayKindle's code is open to the community. Your planner data is not. This policy explains how the official app and website handle it."
    >
      <p className="legal-updated">Last updated: 8 October 2026</p>

      <LegalSection title="1. Who is responsible for your information">
        <p>
          DayKindle is an open-source project operated by Joshua Ansah. This policy covers the official mobile app, public website, hosted service, and private dashboard. It does not cover a community fork or a copy hosted by someone else. That operator sets their own data practices, so review their privacy notice before entering information. Publishing the source code does not make your account or planner data public. Our postal address is{' '}
          <strong>[Add the operator’s postal address before publication]</strong>. For privacy questions or requests, email{' '}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
        <p>
          DayKindle is launching in Ghana and may be used elsewhere. We will apply the privacy rights that are required by the laws that apply to you.
        </p>
      </LegalSection>

      <LegalSection title="2. Information you give us">
        <ul>
          <li><strong>Account details:</strong> email address, name, and sign-in information handled through Supabase Auth or the sign-in provider you choose.</li>
          <li><strong>Planner information:</strong> goals, habits, tasks, routines, progress events, check-ins, reflections, commitments, reminder settings, and related preferences you enter.</li>
          <li><strong>Messages to us:</strong> the email address and contents of support or privacy requests you send.</li>
        </ul>
        <p>
          Planner entries are yours to write and may include sensitive details, such as information about religion or health. Please avoid adding information you do not want stored. The open-source project does not publish these entries.
        </p>
      </LegalSection>

      <LegalSection title="3. Guest use, accounts, and sync">
        <p>
          You can use a Guest workspace without creating an account. Its planner information is stored on your device. The app may still send product analytics or technical error reports when analytics is configured for that build; these reports are separate from cloud sync.
        </p>
        <p>
          If you create an account, Supabase processes your account and sign-in details. Signing in does not turn on planner sync. Your entries stay on your device unless you choose to start sync. After you opt in, the official service stores the planner records needed to sync your account. Account access policies limit ordinary users to their own records. Synced records are not end-to-end encrypted, so a technically privileged service operator could access them. Joshua does not read or review individual users’ plans, goals, routines, tasks, check-ins, reflections, or commitments. You can keep using the local workspace without syncing.
        </p>
      </LegalSection>

      <LegalSection title="4. Analytics and error reports">
        <p>
          When analytics is configured, the app sends PostHog event names and limited details such as an item type, completion status, check-in period, or a count. The app’s event calls do not send the text of your goals, tasks, plans, or reflections. The SDK also sends app lifecycle events, such as installs, opens, and returns to the foreground, along with standard app and device details. Guest events use a device identifier. Signed-in events use the account’s Supabase ID, so they are not anonymous. Geo-IP lookup is disabled, and session replay is not enabled. The app removes automatically captured app-opening URLs before sending events.
        </p>
        <p>
          The private dashboard shows aggregate counts, trends, and grouped event totals. It does not list individual users or display planner entries. I use those summaries to understand general product usage and improve DayKindle, not to inspect anyone’s plan. The app also sends limited sync status logs, uncaught errors, and unhandled promise rejections for troubleshooting. Logs report sync outcomes and network status, not planner text. Error messages or stack traces may occasionally contain information involved in an error.
        </p>
        <p>
          The marketing website records page views and page paths. Automatic click capture and session recording are disabled. The website currently starts page-view analytics without an in-site consent choice. Before using analytics in a place that requires prior consent, we must add a consent choice or disable that tracking there.
        </p>
        <p>
          We use analytics to maintain and improve DayKindle. We do not use planner content for advertising or sell it.
        </p>
      </LegalSection>

      <LegalSection title="5. Why we use information">
        <ul>
          <li>To save and organize planner information on your device.</li>
          <li>To create and secure accounts and provide sync that you choose.</li>
          <li>To schedule reminders on your device when you enable them.</li>
          <li>To review aggregate feature usage, fix technical errors, and improve the app and website.</li>
          <li>To reply to support requests, protect the service, and meet legal obligations.</li>
        </ul>
        <p>
          I do not read individual planner entries or use their contents to evaluate users, personalize advertising, or make decisions about them. DayKindle does not make decisions about you that have legal or similarly significant effects.
        </p>
      </LegalSection>

      <LegalSection title="6. Who helps us provide DayKindle">
        <p>
          We use service providers to operate the product. Depending on the feature you use, they may process information on our behalf:
        </p>
        <ul>
          <li><strong>Supabase:</strong> account authentication, cloud database, and server functions for users who choose an account or sync.</li>
          <li><strong>PostHog:</strong> app and website usage analytics and mobile error reports.</li>
          <li><strong>Apple or Google:</strong> if you choose their sign-in option, to authenticate your account.</li>
          <li><strong>Google/Gmail:</strong> to receive and reply to messages sent to our contact email.</li>
          <li><strong>Your device and operating system:</strong> to store a Guest workspace and schedule local reminders.</li>
        </ul>
        <p>
          The dashboard uses aggregate database counts and grouped analytics. It does not show written planner entries. The app’s source code is public, but the official Supabase database and PostHog project are separate services and are not published with that code. We may disclose information when needed to comply with law, protect people or the service, or respond to a valid legal request.
        </p>
      </LegalSection>

      <LegalSection title="7. Where information is stored">
        <p>
          Guest planner information stays on your device. Account and synced planner information is stored by Supabase. PostHog and our other providers may process information in the countries where their services are hosted. The exact Supabase and PostHog project regions and the applicable transfer safeguards still need to be confirmed before this policy is published.
        </p>
        <p>
          Where local law requires a safeguard for an international transfer, we will put that safeguard in place and make information about it available.
        </p>
      </LegalSection>

      <LegalSection title="8. How long we keep information">
        <p>
          Guest planner information remains on your device until you remove it or it is removed through your device’s storage management. We keep account and synced planner information while your account is active and as needed to provide the service. If you request deletion, we remove or de-identify information we no longer need, subject to legal, security, and dispute-resolution requirements.
        </p>
        <p>
          Analytics and error-report retention depends on the settings of our PostHog project. We need to confirm that retention period, as well as the backup deletion window for Supabase, before publication. We do not keep information longer than needed for the purpose for which it was collected, unless law allows or requires a longer period.
        </p>
      </LegalSection>

      <LegalSection title="9. Your choices and requests">
        <p>
          You can use the app as a Guest and keep planner information on your device. You choose whether to start cloud sync. You can change information available in your profile and request account deletion from the Profile area. If an in-app request does not work, or if you want to ask for access, correction, or deletion, email{' '}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. If you have an account, include the email address linked to it so we can locate the right records and confirm your identity.
        </p>
        <p>
          People in Ghana may ask about information we hold, request correction or deletion, or raise a complaint with the{' '}
          <a href="https://dpc.gov.gh/" target="_blank" rel="noreferrer">Data Protection Commission</a>. If you live elsewhere, your local law may give you additional rights. We will handle requests under the law that applies to you and may need to confirm your identity before acting.
        </p>
      </LegalSection>

      <LegalSection title="10. Children and young people">
        <p>
          DayKindle is not for children under 13. If you are 13 or older but below the age of legal majority where you live, you may use the service only when any parent or guardian permission required by law has been obtained. We will review and remove an under-13 account and associated personal information when we learn it exists, unless law requires us to retain something.
        </p>
      </LegalSection>

      <LegalSection title="11. Security and changes to this policy">
        <p>
          We use reasonable technical and organizational safeguards to protect information. No internet-connected service can promise perfect security. We will update this page when our data practices change and change the date above. Where required, we will give you notice before a material change takes effect.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          For privacy questions, data requests, or concerns, contact Joshua Ansah at{' '}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Postal address: <strong>[Add the operator’s postal address before publication]</strong>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
