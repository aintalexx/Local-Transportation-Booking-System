import { useLocation, useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsAndConditions() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { returnTo?: string; returnLabel?: string; restoreRegistrationDraft?: boolean } | null;

  const handleReturn = () => {
    if (routeState?.returnTo) {
      navigate(routeState.returnTo, {
        replace: true,
        state: routeState.restoreRegistrationDraft ? { restoreRegistrationDraft: true } : undefined,
      });
      return;
    }

    navigate(-1);
  };

  return (
    <div className="min-h-screen scroll-smooth bg-gray-50">
      <div className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleReturn} aria-label={routeState?.returnLabel || "Back"}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#4B0F14]" />
            <h1 className="font-bold text-lg">Terms &amp; Conditions</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-20 space-y-6">
        <div className="text-sm text-gray-500">Last updated: June 13, 2026</div>

        <p className="text-gray-700 leading-relaxed">
          Welcome to <strong>Arangkada</strong>. By accessing or using our mobile application and
          services, you agree to be bound by these Terms and Conditions. Please read them carefully
          before using the platform.
        </p>

        <Section title="1. Acceptance of Terms">
          By creating an account, booking a ride, or using any feature of the Arangkada platform,
          you confirm that you have read, understood, and agree to these Terms. If you do not agree,
          you must not use Arangkada. We may update these Terms at any time, and your continued
          use of the platform after updates constitutes acceptance of the revised Terms.
        </Section>

        <Section title="2. About Arangkada">
          Arangkada is a ride-hailing platform that connects passengers with registered tricycle
          drivers on designated routes within Sta. Mesa, Manila only. We are a technology intermediary - we
          do not own, operate, or employ the drivers on our platform. Transportation services are
          provided by independent drivers who use our platform to connect with passengers.
        </Section>

        <Section title="3. Eligibility">
          <ul className="list-disc pl-5 space-y-1">
            <li>You must be at least 13 years old to create an account.</li>
            <li>Users aged 17 and below must have a parent or guardian's consent.</li>
            <li>Drivers must be at least 18 years old and hold a valid driver's license.</li>
            <li>You must provide accurate, truthful, and complete information when registering.</li>
            <li>You are responsible for keeping your account credentials confidential.</li>
          </ul>
        </Section>

        <Section title="4. User Responsibilities">
          <p className="mb-2 font-medium">All users must:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Treat other users with respect and dignity.</li>
            <li>Not engage in any fraudulent, abusive, or illegal activity on the platform.</li>
            <li>Not use the platform for purposes other than legitimate transportation services.</li>
            <li>Report any safety concerns through our in-app Help &amp; Support.</li>
          </ul>
          <p className="mt-3 mb-2 font-medium">Passengers must:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Be at the designated pickup location on time.</li>
            <li>Not cause damage to the driver's vehicle.</li>
            <li>Pay the agreed fare in full.</li>
          </ul>
          <p className="mt-3 mb-2 font-medium">Drivers must:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Maintain a valid driver's license and vehicle registration at all times.</li>
            <li>Accept ride requests in good faith and complete them as agreed.</li>
            <li>Keep their vehicle clean, safe, and roadworthy.</li>
            <li>Not solicit additional payments beyond the displayed fare.</li>
          </ul>
        </Section>

        <Section title="5. Driver Approval Process">
          All driver registrations on Arangkada are subject to review and approval by our
          administration team. Drivers will not be able to accept ride requests until their
          application is approved. Arangkada reserves the right to reject any driver application
          or revoke approval at any time for reasons including but not limited to safety concerns,
          incomplete documents, or violations of these Terms.
        </Section>

        <Section title="6. Fares and Payments">
          Fares are calculated based on the distance of the ride and the applicable base rate.
          The estimated fare is shown to passengers before booking confirmation. Arangkada may
          offer promotional discounts including shared ride discounts. All fares are final once
          confirmed. Arangkada is not responsible for disputes over payment amounts that are not
          reflected in the app's fare calculation.
        </Section>

        <Section title="7. Cancellations">
          Passengers may cancel a booking before a driver is assigned at no charge. Repeated
          cancellations after a driver has been dispatched may result in temporary account
          restrictions. Drivers who frequently cancel accepted rides may face suspension or
          removal from the platform.
        </Section>

        <Section title="8. Ratings and Reviews">
          After each completed ride, both passengers and drivers may be asked to rate their
          experience. Ratings affect a driver's ability to remain active on the platform.
          Drivers who fall below the minimum rating threshold may be suspended pending review.
          Ratings must reflect genuine experiences and not be manipulated.
        </Section>

        <Section title="9. Prohibited Conduct">
          The following are strictly prohibited on the Arangkada platform:
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Harassment, intimidation, or discrimination of any kind.</li>
            <li>Providing false information during registration or booking.</li>
            <li>Attempting to circumvent the platform's fare or rating systems.</li>
            <li>Using the platform for illegal transportation of goods or persons.</li>
            <li>Creating fake accounts or impersonating other users.</li>
          </ul>
        </Section>

        <Section title="10. Limitation of Liability">
          Arangkada's liability for any claim arising from the use of our platform shall not
          exceed the fare paid for the ride in question. We are not liable for any indirect,
          incidental, or consequential damages including loss of income, personal injury, or
          property damage arising from the use of our services or the conduct of drivers or
          passengers on the platform.
        </Section>

        <Section title="11. Account Termination">
          We may suspend or permanently terminate any account that violates these Terms, without
          prior notice. You may also delete your account at any time through the app settings.
          Upon termination, any outstanding obligations (e.g., unpaid fares) remain enforceable.
        </Section>

        <Section title="12. Governing Law">
          These Terms are governed by the laws of the Republic of the Philippines. Any disputes
          shall be subject to the jurisdiction of the appropriate courts in Manila, Philippines.
        </Section>

        <Section title="13. Contact Us">
          For questions about these Terms, contact us via the Help &amp; Support section in the
          app, or email us at <span className="text-[#4B0F14]">legal@ridestamesa.ph</span>.
        </Section>

        <p className="text-center text-xs text-gray-400 pt-4">
          (c) 2026 Arangkada. All rights reserved.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-bold text-gray-900 mb-2">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
    </div>
  );
}

