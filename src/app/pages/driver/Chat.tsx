import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { ArrowLeft, Send } from "lucide-react";

export default function DriverChat() {
  const navigate = useNavigate();
  const { rideId } = useParams();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, sender: "driver", text: "On my way to pick you up!", time: "14:30", read: true },
    { id: 2, sender: "passenger", text: "Okay, thank you!", time: "14:31", read: true },
    { id: 3, sender: "driver", text: "I'm wearing a blue shirt", time: "14:32", read: true },
  ]);

  const passenger = {
    name: "Juan Dela Cruz",
  };

  const quickReplies = ["On my way", "I'm here", "5 minutes away", "Thank you"];

  const handleSend = () => {
    if (!message.trim()) return;

    setMessages([
      ...messages,
      {
        id: messages.length + 1,
        sender: "driver",
        text: message,
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        read: false,
      },
    ]);
    setMessage("");
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarFallback>{passenger.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold">{passenger.name}</h2>
          <p className="text-xs text-gray-600">Passenger</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "driver" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                msg.sender === "driver"
                  ? "bg-green-600 text-white"
                  : "bg-white border"
              }`}
            >
              <p>{msg.text}</p>
              <p className={`text-xs mt-1 ${msg.sender === "driver" ? "text-green-100" : "text-gray-500"}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border-t px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {quickReplies.map((reply, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setMessage(reply)}
            >
              {reply}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-white border-t px-4 py-3">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
          />
          <Button onClick={handleSend} disabled={!message.trim()} className="bg-green-600 hover:bg-green-700">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
