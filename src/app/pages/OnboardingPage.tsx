import { useState } from "react";
import { useNavigate } from "react-router";
import { Bike, Navigation, MapPin, Shield, Star, Info, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";

// Static imports of developer assets from src/imports
import alegarbesImg from "../../imports/alegarbes.png";
import roblesImg from "../../imports/robles.png";
import tatelImg from "../../imports/tatel.png";
import forbesImg from "../../imports/forbes.png";
import gutierrezImg from "../../imports/gutierrez.png";

interface Developer {
  name: string;
  image: string;
  initials: string;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const developers: Developer[] = [
    {
      name: "Alegarbes, Alexander Von R.",
      image: alegarbesImg,
      initials: "AV",
    },
    {
      name: "Robles, Nick Justin",
      image: roblesImg,
      initials: "NJ",
    },
    {
      name: "Tatel, Aristotle C.",
      image: tatelImg,
      initials: "AC",
    },
    {
      name: "Forbes, Lian Symon L.",
      image: forbesImg,
      initials: "LF",
    },
    {
      name: "Gutierrez, Darl Akhen S.",
      image: gutierrezImg,
      initials: "DG",
    },
  ];

  const handleImageError = (name: string) => {
    setImageErrors((prev) => ({ ...prev, [name]: true }));
  };

  const slides = [
    {
      id: "welcome",
      title: "Welcome to Arangkada",
      subtitle: "FAST, SAFE, AND RELIABLE",
      description: "Experience the first dedicated local tricycle booking platform in Sta. Mesa, Manila. Designed to make your daily commute accessible, convenient, and completely hassle-free.",
      icon: <Bike className="h-24 w-24 text-[#D4AF37] animate-bounce" />,
      bgClass: "bg-gradient-to-b from-[#4B0F14] to-[#360a0d] text-white",
    },
    {
      id: "tracking",
      title: "Real-Time GPS Tracking",
      subtitle: "KNOW YOUR RIDE",
      description: "No more waiting in uncertainty. Track your assigned tricycle in real-time, view live driver movement on the map, and get precise ETA details directly on your phone.",
      icon: <MapPin className="h-24 w-24 text-[#D4AF37] animate-pulse" />,
      bgClass: "bg-gradient-to-b from-[#4B0F14] to-[#360a0d] text-white",
    },
    {
      id: "pricing",
      title: "Fair & Transparent Fares",
      subtitle: "NO OVERCHARGING",
      description: "Our distance-based fare calculations adhere strictly to the City of Manila tricycle guidelines. View clear, estimated prices upfront before you book any ride.",
      icon: <Shield className="h-24 w-24 text-[#D4AF37]" />,
      bgClass: "bg-gradient-to-b from-[#4B0F14] to-[#360a0d] text-white",
    },
    {
      id: "developers",
      title: "Meet the Developers",
      subtitle: "PROJECT DEVELOPMENT TEAM",
      description: "The Creative Minds Behind Arangkada",
      subText: "Meet the developers and designers who created Arangkada, a local transportation booking platform designed to make tricycle commuting in Sta. Mesa more accessible, convenient, and efficient.",
      bgClass: "bg-gradient-to-b from-[#4B0F14] to-[#3a0c10] text-white",
    },
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      goToAuthOptions();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToAuthOptions = () => {
    localStorage.setItem("arangkada_onboarding_completed", "true");
    navigate("/register");
  };

  const activeSlide = slides[currentSlide];

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-500 ${activeSlide.bgClass} px-4 py-8`}>
      {/* Top Header */}
      <div className="flex justify-between items-center max-w-6xl mx-auto w-full mb-4">
        <div className="flex items-center gap-2">
          <Navigation className="h-6 w-6 text-[#D4AF37]" />
          <span className="font-extrabold text-xl tracking-wider text-[#FFF8E7]">ARANGKADA</span>
        </div>
        {currentSlide < slides.length - 1 && (
          <button
            onClick={goToAuthOptions}
            className="text-sm font-semibold text-[#FFF8E7]/70 hover:text-[#D4AF37] transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* Main Slide Content */}
      <div className="flex-1 flex flex-col justify-center items-center max-w-6xl mx-auto w-full my-auto py-4">
        {currentSlide !== 3 ? (
          // Content Slides (1-3)
          <div className="text-center max-w-2xl px-4 flex flex-col items-center">
            <div className="mb-8 p-6 bg-white/5 rounded-full border border-white/10 shadow-2xl backdrop-blur-sm">
              {activeSlide.icon}
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2 block">
              {activeSlide.subtitle}
            </span>
            <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-[#FFF8E7]">
              {activeSlide.title}
            </h2>
            <p className="text-base md:text-lg text-[#FFF8E7]/80 leading-relaxed max-w-lg">
              {activeSlide.description}
            </p>
          </div>
        ) : (
          // Meet the Developers Slide (Slide 4)
          <div className="w-full flex flex-col items-center text-center">
            <div className="max-w-3xl mb-8 px-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-2 block">
                {activeSlide.subtitle}
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#FFF8E7] mb-3">
                {activeSlide.description}
              </h2>
              <p className="text-sm md:text-base text-[#FFF8E7]/70 max-w-2xl mx-auto leading-relaxed">
                {activeSlide.subText}
              </p>
            </div>

            {/* Responsive developer grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 w-full max-w-5xl px-2">
              {developers.map((dev) => {
                const hasError = imageErrors[dev.name];
                return (
                  <div
                    key={dev.name}
                    className="bg-white/5 rounded-2xl p-4 flex flex-col items-center justify-between border border-white/10 shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:bg-white/10"
                  >
                    {/* Circle Image Wrapper */}
                    <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-[#D4AF37] mb-4 flex items-center justify-center bg-[#4B0F14]/50 shadow-inner">
                      {!hasError ? (
                        <img
                          src={dev.image}
                          alt={dev.name}
                          onError={() => handleImageError(dev.name)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-2xl md:text-3xl font-black text-[#D4AF37] tracking-wider">
                          {dev.initials}
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="w-full">
                      <h4 className="font-bold text-[#FFF8E7] text-xs md:text-sm leading-tight line-clamp-2 min-h-[2rem] flex items-center justify-center">
                        {dev.name}
                      </h4>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="max-w-6xl mx-auto w-full flex flex-col items-center gap-6 mt-4">
        {/* Pagination Dots */}
        <div className="flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                currentSlide === index ? "w-8 bg-[#D4AF37]" : "w-2.5 bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex justify-between items-center w-full gap-4 max-w-md">
          {currentSlide > 0 ? (
            <Button
              variant="ghost"
              onClick={prevSlide}
              className="text-[#FFF8E7] hover:text-[#D4AF37] hover:bg-white/5 font-semibold transition-all h-12 px-6 rounded-xl flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <div className="w-[104px]" /> // Spacer to keep layout centered
          )}

          <Button
            onClick={nextSlide}
            className="bg-[#D4AF37] text-[#4B0F14] hover:bg-[#c29e2f] active:scale-95 font-bold tracking-wide transition-all h-12 px-8 rounded-xl flex items-center gap-2 shadow-lg"
          >
            {currentSlide === slides.length - 1 ? "Get Started" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
