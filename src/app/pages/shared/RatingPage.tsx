import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { ArrowLeft, Star } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "../../context/UserContext";
import type { BookingData } from "../../utils/bookingDatabase";
import { getSupabaseBooking } from "../../utils/supabaseBookings";
import { getBookingRating, submitDriverRating } from "../../utils/supabaseRatings";

export default function RatingPage() {
  const navigate = useNavigate();
  const { rideId } = useParams();
  const { user } = useUser();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!rideId) {
      navigate("/passenger/history");
      return;
    }

    let cancelled = false;

    const loadRatingContext = async () => {
      setLoading(true);
      const [ride, existingRating] = await Promise.all([
        getSupabaseBooking(rideId),
        getBookingRating(rideId),
      ]);

      if (cancelled) return;

      if (!ride) {
        toast.error("Ride not found.");
        navigate("/passenger/history", { replace: true });
        return;
      }

      const userId = user.supabaseId;
      if (userId && ride.passengerUsername !== userId) {
        toast.error("You can only rate your own completed ride.");
        navigate("/passenger/history", { replace: true });
        return;
      }

      if (ride.status !== "completed" && ride.status !== "ride_completed") {
        toast.error("You can only rate completed rides.");
        navigate("/passenger/history", { replace: true });
        return;
      }

      setBooking(ride);
      setAlreadyRated(Boolean(existingRating));
      if (existingRating) {
        setRating(existingRating.rating);
        setReview(existingRating.feedback || "");
      }
      setLoading(false);
    };

    void loadRatingContext();

    return () => {
      cancelled = true;
    };
  }, [navigate, rideId, user]);

  const handleSubmit = async () => {
    if (!booking || !user || alreadyRated) return;

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    const result = await submitDriverRating({
      booking,
      passenger: user,
      rating,
      feedback: review,
    });
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.message);
      if (result.message.includes("already rated")) setAlreadyRated(true);
      return;
    }

    toast.success(result.message);
    navigate("/passenger/history");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center text-gray-600">
            Loading completed ride...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <button
            type="button"
            onClick={() => navigate("/passenger/history")}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#4B0F14]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </button>
          <CardTitle className="text-center">Rate Your Ride</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {booking?.driverName && (
            <div className="rounded-2xl bg-[#FFF8E7] p-4 text-center">
              <p className="text-sm text-gray-600">Driver</p>
              <p className="text-lg font-bold text-[#4B0F14]">{booking.driverName}</p>
              <p className="mt-1 text-xs text-gray-600">{booking.pickupLocation.address} to {booking.destination.address}</p>
            </div>
          )}

          {alreadyRated && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center text-sm font-semibold text-green-700">
              You already rated this completed ride.
            </div>
          )}

          <div className="text-center">
            <p className="text-gray-600 mb-4">How was your experience?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  disabled={alreadyRated}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-12 w-12 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="mt-2 text-sm font-semibold">
                {rating === 5 && "Excellent!"}
                {rating === 4 && "Great!"}
                {rating === 3 && "Good"}
                {rating === 2 && "Fair"}
                {rating === 1 && "Poor"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Comments (Optional)</label>
            <Textarea
              placeholder="Tell us more about your experience..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              disabled={alreadyRated}
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/passenger/history")} className="flex-1">
              {alreadyRated ? "Back" : "Later"}
            </Button>
            <Button onClick={handleSubmit} disabled={alreadyRated || submitting} className="flex-1">
              {submitting ? "Submitting..." : "Submit Rating"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
