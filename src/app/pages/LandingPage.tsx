import { useNavigate, Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { MapPin, Clock, Shield, Star, Bike, Navigation } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8E7] to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Navigation className="h-8 w-8 text-[#4B0F14]" />
            <h1 className="text-2xl font-bold text-[#4B0F14]">Arangkada</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Login
            </Button>
            <Button onClick={() => navigate("/register")}>
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Your Ride in Sta. Mesa,<br />Just a Tap Away
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Fast, safe, and reliable tricycle transportation services across Sta. Mesa, Manila
          </p>
          <div className="flex justify-center">
            <Button size="lg" className="text-xl px-12 py-6 h-auto shadow-lg" onClick={() => navigate("/register")}>
              Book a Ride Now
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 bg-white rounded-lg shadow-sm mb-16">
        <h3 className="text-3xl font-bold text-center mb-12">Why Choose Arangkada?</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <div className="h-12 w-12 bg-[rgba(75,15,20,0.08)] rounded-full flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-[#4B0F14]" />
              </div>
              <CardTitle>Real-Time Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track your driver's location in real-time and know exactly when they'll arrive
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Fast Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Book a tricycle in seconds and get matched with nearby drivers instantly
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Verified Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                All drivers are verified and approved. Your safety is our top priority
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle>Quality Service</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Rate your ride and help us maintain high-quality service standards
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Service Area */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-[rgba(75,15,20,0.05)] rounded-lg p-8">
          <h3 className="text-3xl font-bold text-center mb-8">Service Coverage</h3>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h4 className="text-xl font-semibold mb-4">Area Coverage: Sta. Mesa, Manila</h4>
              <p className="text-gray-600 mb-4">
                We serve key locations throughout Sta. Mesa including:
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#4B0F14]" />
                  <span>PUP Sta. Mesa</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#4B0F14]" />
                  <span>V. Mapa LRT Station</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#4B0F14]" />
                  <span>Pureza LRT Station</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#4B0F14]" />
                  <span>Sta. Mesa Market and SM City Sta. Mesa</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-4">Available Vehicles</h4>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Bike className="h-8 w-8 text-[#4B0F14]" />
                      <div>
                        <CardTitle className="text-lg">Tricycles</CardTitle>
                        <CardDescription>Comfortable rides for 1-3 passengers</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fare Information */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-8">Transparent Pricing</h3>
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-8">
          <p className="text-gray-600 mb-4">
            Our fares are calculated based on distance traveled, ensuring fair and transparent pricing for every ride.
          </p>
          <ul className="space-y-2 text-gray-600">
            <li>✓ Distance-based fare calculation</li>
            <li>✓ No hidden fees</li>
            <li>✓ Fare estimate shown before booking</li>
            <li>✓ Digital payment options available</li>
            <li>✓ Cash payment accepted</li>
          </ul>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-[#4B0F14] rounded-lg p-12 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-xl mb-8 text-[rgba(255,248,231,0.7)]">
            Join thousands of commuters in Sta. Mesa who trust Arangkada for their daily transportation
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8" onClick={() => navigate("/register")}>
            Create Your Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="text-lg font-semibold mb-4">Arangkada</h4>
              <p className="text-gray-400">
                Making local transportation accessible and convenient for everyone in Sta. Mesa, Manila.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-3 text-gray-400">
                <li><button onClick={() => navigate("/support")} className="hover:text-white transition-colors">Help &amp; Support</button></li>
                <li><button onClick={() => navigate("/terms")} className="hover:text-white transition-colors">Terms &amp; Conditions</button></li>
                <li><button onClick={() => navigate("/privacy")} className="hover:text-white transition-colors">Privacy Policy</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Safety</h4>
              <p className="text-gray-400">
                All drivers are verified and approved. Emergency support available 24/7.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Arangkada. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
