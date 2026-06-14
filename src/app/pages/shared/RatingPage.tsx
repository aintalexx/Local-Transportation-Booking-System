import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";

export default function RatingPage() {
  const navigate = useNavigate();
  const { rideId } = useParams();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    toast.success("Thank you for your feedback!");
    navigate("/passenger");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Rate Your Ride</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">How was your experience?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
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
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/passenger")} className="flex-1">
              Skip
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              Submit Rating
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
