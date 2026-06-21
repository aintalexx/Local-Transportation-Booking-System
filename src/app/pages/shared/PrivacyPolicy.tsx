import { useLocation, useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { returnTo?: string; returnLabel?: string; restoreLoginDraft?: boolean; restoreRegistrationDraft?: boolean } | null;

  const handleReturn = () => {
    if (routeState?.returnTo) {
      navigate(routeState.returnTo, {
        replace: true,
        state: {
          ...(routeState.restoreLoginDraft ? { restoreLoginDraft: true } : {}),
          ...(routeState.restoreRegistrationDraft ? { restoreRegistrationDraft: true } : {}),
        },
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
            <Shield className="h-5 w-5 text-[#4B0F14]" />
            <h1 className="font-bold text-lg">Privacy Policy</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-20 space-y-6">
        <div className="text-sm text-gray-500">Last updated: June 13, 2026</div>

        <p className="text-gray-700 leading-relaxed">
          <strong>Arangkada</strong> is committed to protecting your privacy. This Privacy Policy
          explains how we collect, use, store, and share your personal information when you use
          our platform. By using Arangkada, you consent to the practices described in this policy.
        </p>

        <Section title="1. Information We Collect">
          <p className="mb-2">We collect the following types of personal information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account details:</strong> Your name, phone number, email address, date of birth, and password.</li>
            <li><strong>Driver documents:</strong> Driver's license photo, vehicle plate number, and vehicle color.</li>
            <li><strong>Location data:</strong> Your GPS location when you use the app, including during rides.</li>
            <li><strong>Ride history:</strong> Records of your bookings, fares, pickup and drop-off locations.</li>
            <li><strong>Payment information:</strong> Payment method selected (cash or e-payment). We do not store card details.</li>
            <li><strong>Device data:</strong> Device type, operating system, and app version for troubleshooting.</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Information">
          <ul className="list-disc pl-5 space-y-1">
            <li>To match passengers with available drivers in real time.</li>
            <li>To calculate and display fare estimates accurately.</li>
            <li>To process and record ride bookings and payments.</li>
            <li>To verify driver identity and manage driver approval.</li>
            <li>To send ride confirmations, receipts, and important notifications.</li>
            <li>To investigate safety incidents or disputes between users.</li>
            <li>To improve the app's features, reliability, and performance.</li>
            <li>To comply with legal obligations under Philippine law.</li>
          </ul>
        </Section>

        <Section title="3. Location Data">
          Arangkada requires access to your device's location to provide core services. Location
          is collected continuously during an active ride and periodically when the app is open.
          Passenger location is shared with the assigned driver solely for pickup purposes. Driver
          location is shared with matched passengers for tracking. We do not share precise location
          data with third parties for advertising purposes. You may disable location access in your
          device settings, but this will prevent the app from functioning correctly.
        </Section>

        <Section title="4. Sharing Your Information">
          <p className="mb-2">We do not sell your personal information. We share it only in the following situations:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>With matched users:</strong> Passengers see the driver's name, plate number, and rating. Drivers see the passenger's name and pickup point.</li>
            <li><strong>With our administrators:</strong> For driver verification, approval, and account management.</li>
            <li><strong>With service providers:</strong> Trusted third parties that help us operate the platform, under confidentiality agreements.</li>
            <li><strong>For legal compliance:</strong> When required by Philippine law, court order, or government authority.</li>
            <li><strong>For safety:</strong> To protect users or the public from harm.</li>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          We retain your account information for as long as your account is active. Ride history
          and transaction records are kept for at least 3 years for legal compliance. After account
          deletion, most personal data is removed within 30 days. Certain records may be retained
          longer as required by law or for dispute resolution.
        </Section>

        <Section title="6. Data Security">
          We use industry-standard security measures including encrypted data transmission (HTTPS)
          and secure storage practices to protect your information. However, no digital system is
          completely secure. We encourage you to use a strong password and to log out when using
          shared devices. Report any suspected unauthorized access to your account immediately
          through Help &amp; Support.
        </Section>

        <Section title="7. Your Rights">
          Under the Data Privacy Act of 2012 (Republic Act No. 10173), you have the right to:
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Access</strong> — Request a copy of the personal data we hold about you.</li>
            <li><strong>Correction</strong> — Update inaccurate information via Edit Profile in the app.</li>
            <li><strong>Deletion</strong> — Delete your account and associated data through app settings.</li>
            <li><strong>Portability</strong> — Request your data in a readable format.</li>
            <li><strong>Objection</strong> — Object to certain types of data processing.</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us at{" "}
            <span className="text-[#4B0F14]">privacy@ridestamesa.ph</span> or through Help &amp; Support.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          Arangkada is not directed at children under 13. Users aged 13–17 require verified
          guardian consent. We do not knowingly collect data from children under 13. If we
          discover such data has been collected, we will delete it promptly.
        </Section>

        <Section title="9. Changes to This Policy">
          We may update this Privacy Policy from time to time. Material changes will be communicated
          via in-app notification or email. Your continued use of Arangkada after changes are
          posted constitutes acceptance of the updated policy.
        </Section>

        <Section title="10. Contact Us">
          If you have questions or concerns about this Privacy Policy, please contact:
          <div className="mt-2 p-3 bg-gray-100 rounded-lg text-sm">
            <p><strong>Arangkada Data Privacy Office</strong></p>
            <p>Email: <span className="text-[#4B0F14]">privacy@ridestamesa.ph</span></p>
            <p>Address: Sta. Mesa, Manila, Philippines</p>
          </div>
        </Section>

        <p className="text-center text-xs text-gray-400 pt-4">
          © 2026 Arangkada. All rights reserved.
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
