import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { ArrowLeft, HelpCircle, MessageCircle, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

export default function SupportPage() {
  const navigate = useNavigate();
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Support request submitted. We'll get back to you soon!");
    navigate(-1);
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
          <p className="text-[rgba(75,15,20,0.08)] mt-1">We're here to help you</p>
        </div>
      </div>

      <div className="max-w-screen-md mx-auto p-4 space-y-4">
        {/* Contact Options */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Phone className="h-8 w-8 text-[#4B0F14] mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Call Us</h3>
              <p className="text-sm text-gray-600">Mon-Fri, 8AM-6PM</p>
              <Button variant="link" className="mt-2">
                (02) 1234-5678
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <Mail className="h-8 w-8 text-[#4B0F14] mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Email Us</h3>
              <p className="text-sm text-gray-600">We'll respond within 24h</p>
              <Button variant="link" className="mt-2">
                support@ridestamesa.ph
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <MessageCircle className="h-8 w-8 text-[#4B0F14] mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Live Chat</h3>
              <p className="text-sm text-gray-600">Available 24/7</p>
              <Button variant="link" className="mt-2">
                Start Chat
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
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Please describe your issue in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Submit Report
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
