import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { ArrowLeft, Send } from "lucide-react";

export default function PassengerChat() {
  const navigate = useNavigate();
  const { rideId } = useParams();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, sender: "driver", text: "On my way to pick you up!", time: "14:30", read: true },
    { id: 2, sender: "passenger", text: "Okay, thank you!", time: "14:31", read: true },
    { id: 3, sender: "driver", text: "I'm wearing a blue shirt", time: "14:32", read: true },
  ]);

  const driver = {
    name: "Pedro Santos",
    photo: null,
  };

  const quickReplies = ["I'm here", "On my way", "Please wait", "Thank you"];

  const handleSend = () => {
    if (!message.trim()) return;

    setMessages([
      ...messages,
      {
        id: messages.length + 1,
        sender: "passenger",
        text: message,
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        read: false,
      },
    ]);
    setMessage("");
  };

  const handleQuickReply = (reply: string) => {
    setMessage(reply);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={driver.photo || undefined} />
          <AvatarFallback>{driver.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold">{driver.name}</h2>
          <p className="text-xs text-gray-600">Your driver</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "passenger" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                msg.sender === "passenger"
                  ? "bg-[#4B0F14] text-white"
                  : "bg-white border"
              }`}
            >
              <p>{msg.text}</p>
              <div className="flex items-center gap-1 mt-1">
                <p
                  className={`text-xs ${
                    msg.sender === "passenger" ? "text-[rgba(255,248,231,0.7)]" : "text-gray-500"
                  }`}
                >
                  {msg.time}
                </p>
                {msg.sender === "passenger" && (
                  <span className="text-xs">
                    {msg.read ? "✓✓" : "✓"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Replies */}
      <div className="bg-white border-t px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {quickReplies.map((reply, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => handleQuickReply(reply)}
            >
              {reply}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-3">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
          />
          <Button onClick={handleSend} disabled={!message.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
