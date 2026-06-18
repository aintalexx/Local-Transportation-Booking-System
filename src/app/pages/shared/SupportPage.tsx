import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { ArrowLeft, HelpCircle, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { useUser } from "../../context/UserContext";

export default function SupportPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ issueType?: string; description?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const nextErrors: { issueType?: string; description?: string } = {};
    const trimmedDescription = description.trim();

    if (!issueType) {
      nextErrors.issueType = "Please select an issue type.";
    }

    if (!trimmedDescription) {
      nextErrors.description = "Description is required.";
    } else if (trimmedDescription.length < 10) {
      nextErrors.description = "Description must be at least 10 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await saveSupportReport({
        issueType,
        description: description.trim(),
        userId: user?.supabaseId,
        username: user?.username,
        email: user?.email,
        phone: user?.phoneNumber,
        role: user?.role,
      });

      toast.success("Your report has been submitted successfully.");
      setIssueType("");
      setDescription("");
      setErrors({});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#4B0F14] to-[#6E171D] text-white p-6">
        <div className="max-w-screen-md mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 mb-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Help & Support</h1>
          <p className="text-white/80 mt-1">We're here to help you</p>
        </div>
      </div>

      <div className="max-w-screen-md mx-auto p-4 space-y-4">
        {/* Contact Options */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Phone className="h-8 w-8 text-[#4B0F14] mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Call Us</h3>
              <p className="text-sm text-gray-600">Mon-Fri, 8AM-6PM</p>
              <Button variant="link" className="mt-2" asChild>
                <a href="tel:+63212345678">
                (02) 1234-5678
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <Mail className="h-8 w-8 text-[#4B0F14] mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Email Us</h3>
              <p className="text-sm text-gray-600">We'll respond within 24h</p>
              <Button variant="link" className="mt-2" asChild>
                <a href="mailto:arangkadastamesa@gmail.com">
                  arangkadastamesa@gmail.com
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Report Issue Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Report an Issue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="issue-type">Issue Type</Label>
                <Select
                  value={issueType}
                  onValueChange={(value) => {
                    setIssueType(value);
                    setErrors((current) => ({ ...current, issueType: undefined }));
                  }}
                >
                  <SelectTrigger aria-invalid={Boolean(errors.issueType)}>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booking">Booking Problem</SelectItem>
                    <SelectItem value="driver">Driver Issue</SelectItem>
                    <SelectItem value="payment">Payment Issue</SelectItem>
                    <SelectItem value="safety">Safety Concern</SelectItem>
                    <SelectItem value="technical">Technical Problem</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.issueType ? (
                  <p className="text-sm text-red-600">{errors.issueType}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Please describe your issue in detail..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setErrors((current) => ({ ...current, description: undefined }));
                  }}
                  rows={6}
                  aria-invalid={Boolean(errors.description)}
                />
                {errors.description ? (
                  <p className="text-sm text-red-600">{errors.description}</p>
                ) : null}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { q: "How do I book a ride?", a: "Tap the 'Book Ride' button, select pickup and destination, then confirm." },
              { q: "Can I cancel a booking?", a: "Yes, you can cancel before the driver arrives at your location." },
              { q: "How is the fare calculated?", a: "Fares are based on distance traveled using a transparent formula." },
              { q: "What payment methods are accepted?", a: "We accept cash and digital payment options." },
            ].map((faq, index) => (
              <div key={index} className="border-b pb-3 last:border-0">
                <h4 className="font-semibold mb-1">{faq.q}</h4>
                <p className="text-sm text-gray-600">{faq.a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface SupportReportPayload {
  issueType: string;
  description: string;
  userId?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: string;
}

async function saveSupportReport(report: SupportReportPayload) {
  if (!supabase) {
    return;
  }

  const payload = {
    user_id: report.userId || null,
    username: report.username || null,
    email: report.email || null,
    phone: report.phone || null,
    role: report.role || null,
    issue_type: report.issueType,
    description: report.description,
    status: "open",
    created_at: new Date().toISOString(),
  };

  const possibleTables = ["support_reports", "reports", "report_issues"];

  for (const table of possibleTables) {
    const { error } = await supabase.from(table).insert(payload);
    if (!error) {
      return;
    }

    const missingTable =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      error.message.toLowerCase().includes("could not find the table");

    if (!missingTable) {
      console.error("Support report save failed:", error.message);
      return;
    }
  }
}
