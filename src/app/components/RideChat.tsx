import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useBooking } from "../context/BookingContext";
import { useUser } from "../context/UserContext";
import { getBooking, type BookingData } from "../utils/bookingDatabase";
import {
  canUseRideChat,
  getChatMessages,
  sendChatMessage,
  subscribeToChatMessages,
  type ChatMessage,
  type ChatSenderRole,
} from "../utils/chatDatabase";
import { formatPersonName } from "../utils/nameFormatting";
import { getSupabaseBooking } from "../utils/supabaseBookings";

type RideChatProps = {
  currentRole: ChatSenderRole;
};

export default function RideChat({ currentRole }: RideChatProps) {
  const navigate = useNavigate();
  const { rideId } = useParams();
  const { user } = useUser();
  const { activeBooking, setActiveBooking } = useBooking();
  const [booking, setBooking] = useState<BookingData | null>(
    activeBooking?.id === rideId ? activeBooking : null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const roleColor = currentRole === "driver" ? "#16A34A" : "#4B0F14";
  const otherRole = currentRole === "driver" ? "passenger" : "driver";

  const chatEnabled = Boolean(booking && canUseRideChat(booking.status));

  const otherPerson = useMemo(() => {
    if (!booking) {
      return {
        name: otherRole === "driver" ? "Driver" : "Passenger",
        description: otherRole === "driver" ? "Your driver" : "Passenger",
      };
    }

    if (currentRole === "passenger") {
      return {
        name: booking.driverName || "Assigned Driver",
        description: booking.driverPlateNumber
          ? `${booking.driverVehicleType || "Tricycle"} - ${booking.driverPlateNumber}`
          : booking.driverVehicleType || "Your driver",
      };
    }

    return {
      name: booking.passengerName || "Passenger",
      description: booking.passengerPhone || "Passenger",
    };
  }, [booking, currentRole, otherRole]);

  const quickReplies = currentRole === "driver"
    ? ["On my way", "I am here", "5 minutes away", "Thank you"]
    : ["I am here", "Please wait", "Okay, thank you", "Where are you?"];

  const upsertMessage = useCallback((nextMessage: ChatMessage) => {
    setMessages((currentMessages) => {
      if (currentMessages.some((item) => item.id === nextMessage.id)) return currentMessages;
      return [...currentMessages, nextMessage].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, []);

  useEffect(() => {
    if (activeBooking?.id === rideId) {
      setBooking(activeBooking);
    }
  }, [activeBooking, rideId]);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    if (!rideId) {
      navigate(currentRole === "driver" ? "/driver" : "/passenger", { replace: true });
      return;
    }

    let cancelled = false;

    const loadChat = async () => {
      setIsLoading(true);

      const matchedActiveBooking = activeBooking?.id === rideId ? activeBooking : null;
      const supabaseBooking = matchedActiveBooking ? null : await getSupabaseBooking(rideId);
      const localBooking = matchedActiveBooking || supabaseBooking || getBooking(rideId);

      if (cancelled) return;

      if (!localBooking) {
        toast.error("Ride chat was not found.");
        navigate(currentRole === "driver" ? "/driver" : "/passenger", { replace: true });
        return;
      }

      setBooking(localBooking);
      setActiveBooking(localBooking);
      setMessages(await getChatMessages(localBooking.id));
      setIsLoading(false);
    };

    void loadChat();

    return () => {
      cancelled = true;
    };
  }, [activeBooking?.id, currentRole, navigate, rideId, setActiveBooking, user]);

  useEffect(() => {
    if (!rideId) return;
    return subscribeToChatMessages(rideId, upsertMessage);
  }, [rideId, upsertMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || !booking || !user) return;

    if (!chatEnabled) {
      toast.info("Chat becomes available after the booking is accepted.");
      return;
    }

    setMessage("");

    try {
      const sentMessage = await sendChatMessage({
        bookingId: booking.id,
        user,
        senderRole: currentRole,
        senderName: formatPersonName(user, user.username),
        text: trimmed,
      });
      upsertMessage(sentMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message.");
      setMessage(trimmed);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSend();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 px-6">
        <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-sm">
          <p className="font-semibold text-[#4B0F14]">Loading ride chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#F8FAFC]">
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback style={{ background: `${roleColor}14`, color: roleColor }}>
            {getInitials(otherPerson.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{otherPerson.name}</h2>
          <p className="truncate text-xs text-gray-600">{otherPerson.description}</p>
        </div>
        {!chatEnabled && (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <Lock className="h-4 w-4" />
          </div>
        )}
      </div>

      {!chatEnabled && (
        <div className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Chat opens after a driver accepts the booking and stays active during the ride.
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-auto p-4">
        {messages.length === 0 ? (
          <div className="mx-auto mt-10 max-w-xs rounded-2xl bg-white px-5 py-4 text-center text-sm text-gray-600 shadow-sm">
            No messages yet. Start the conversation when the ride is active.
          </div>
        ) : (
          messages.map((item) => {
            const isMine = item.senderRole === currentRole;
            return (
              <div key={item.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] break-words rounded-2xl px-4 py-2 shadow-sm sm:max-w-[70%] ${
                    isMine ? "text-white" : "border bg-white text-gray-900"
                  }`}
                  style={isMine ? { background: roleColor } : undefined}
                >
                  {!isMine && (
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {item.senderName}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{item.text}</p>
                  <p className={`mt-1 text-right text-[11px] ${isMine ? "text-white/70" : "text-gray-500"}`}>
                    {formatMessageTime(item.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t bg-white px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {quickReplies.map((reply) => (
            <Button
              key={reply}
              type="button"
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setMessage(reply)}
              disabled={!chatEnabled}
            >
              {reply}
            </Button>
          ))}
        </div>
      </div>

      <form className="border-t bg-white px-4 py-3" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <Input
            className="min-w-0"
            placeholder={chatEnabled ? "Type a message..." : "Chat is not active yet"}
            value={message}
            maxLength={500}
            disabled={!chatEnabled}
            onChange={(event) => setMessage(event.target.value)}
          />
          <Button
            type="submit"
            className="shrink-0"
            style={{ background: roleColor }}
            disabled={!chatEnabled || !message.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}
