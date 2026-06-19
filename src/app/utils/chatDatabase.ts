import { supabase } from "../lib/supabase";
import type { BookingStatus } from "./bookingDatabase";
import { getCurrentSupabaseUserId } from "./supabaseProfiles";
import type { UserData } from "./userDatabase";

const CHAT_MESSAGES_KEY = "ridestamesa_chat_messages";
const MAX_MESSAGE_LENGTH = 500;

export type ChatSenderRole = "passenger" | "driver";

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderRole: ChatSenderRole;
  senderName: string;
  senderUsername?: string;
  text: string;
  createdAt: string;
}

type SupabaseChatMessageRow = {
  id: string;
  booking_id: string;
  sender_id: string | null;
  sender_role: ChatSenderRole;
  sender_name: string;
  sender_username: string | null;
  message: string;
  created_at: string;
};

type SendChatMessageInput = {
  bookingId: string;
  user: UserData;
  senderRole: ChatSenderRole;
  senderName: string;
  text: string;
};

export function canUseRideChat(status: BookingStatus): boolean {
  return [
    "accepted",
    "driver_found",
    "driver_arriving",
    "en_route",
    "driver_to_pickup",
    "passenger_picked_up",
    "arrived",
    "driver_arrived",
    "ride_started",
    "in_progress",
    "ride_ongoing",
  ].includes(status);
}

export async function getChatMessages(bookingId: string): Promise<ChatMessage[]> {
  if (supabase && isUuid(bookingId)) {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      return (data as SupabaseChatMessageRow[]).map(mapSupabaseMessage);
    }

    if (error) {
      console.info("Supabase chat load failed. Falling back to local chat:", error.message);
    }
  }

  return getLocalChatMessages(bookingId);
}

export async function getDriverChatMessages(bookingId: string, driver: UserData): Promise<ChatMessage[]> {
  if (supabase && isUuid(bookingId) && driver.phoneNumber && driver.password) {
    const { data, error } = await supabase.rpc("get_chat_messages_for_driver", {
      p_booking_id: bookingId,
      p_driver_phone: driver.phoneNumber,
      p_driver_password: driver.password,
    });

    if (!error && data) {
      return (data as SupabaseChatMessageRow[]).map(mapSupabaseMessage);
    }
  }

  return getChatMessages(bookingId);
}

export async function sendChatMessage(input: SendChatMessageInput): Promise<ChatMessage> {
  const text = sanitizeMessage(input.text);
  if (!text) {
    throw new Error("Message cannot be empty.");
  }

  if (supabase && isUuid(input.bookingId)) {
    const senderId = input.user.supabaseId || await getCurrentSupabaseUserId();

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        booking_id: input.bookingId,
        sender_id: senderId,
        sender_role: input.senderRole,
        sender_name: input.senderName,
        sender_username: input.user.username || null,
        message: text,
      })
      .select()
      .single();

    if (!error && data) {
      return mapSupabaseMessage(data as SupabaseChatMessageRow);
    }

    if (error) {
      console.info("Supabase chat send failed. Saving local chat message:", error.message);
    }
  }

  return saveLocalChatMessage({
    bookingId: input.bookingId,
    senderRole: input.senderRole,
    senderName: input.senderName,
    senderUsername: input.user.username,
    text,
  });
}

export async function sendDriverChatMessage(input: SendChatMessageInput): Promise<ChatMessage> {
  const text = sanitizeMessage(input.text);
  if (!text) {
    throw new Error("Message cannot be empty.");
  }

  if (supabase && isUuid(input.bookingId) && input.user.phoneNumber && input.user.password) {
    const { data, error } = await supabase.rpc("send_chat_message_as_driver", {
      p_booking_id: input.bookingId,
      p_driver_phone: input.user.phoneNumber,
      p_driver_password: input.user.password,
      p_sender_name: input.senderName,
      p_sender_username: input.user.username || null,
      p_message: text,
    });

    if (!error && data) {
      return mapSupabaseMessage(data as SupabaseChatMessageRow);
    }
  }

  return sendChatMessage(input);
}

export function subscribeToChatMessages(
  bookingId: string,
  onMessage: (message: ChatMessage) => void
): () => void {
  const localHandler = (event: Event) => {
    const detail = (event as CustomEvent<ChatMessage>).detail;
    if (detail?.bookingId === bookingId) onMessage(detail);
  };

  const storageHandler = (event: StorageEvent) => {
    if (event.key !== CHAT_MESSAGES_KEY) return;
    getLocalChatMessages(bookingId).forEach(onMessage);
  };

  window.addEventListener("ridestamesa-chat-message", localHandler);
  window.addEventListener("storage", storageHandler);

  let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;

  if (supabase && isUuid(bookingId)) {
    channel = supabase
      .channel(`chat:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const row = payload.new as SupabaseChatMessageRow | null;
          if (row) onMessage(mapSupabaseMessage(row));
        }
      )
      .subscribe();
  }

  return () => {
    window.removeEventListener("ridestamesa-chat-message", localHandler);
    window.removeEventListener("storage", storageHandler);
    if (channel && supabase) void supabase.removeChannel(channel);
  };
}

function mapSupabaseMessage(row: SupabaseChatMessageRow): ChatMessage {
  return {
    id: row.id,
    bookingId: row.booking_id,
    senderRole: row.sender_role,
    senderName: row.sender_name,
    senderUsername: row.sender_username || undefined,
    text: row.message,
    createdAt: row.created_at,
  };
}

function getLocalChatMessages(bookingId: string): ChatMessage[] {
  return getAllLocalMessages()
    .filter((message) => message.bookingId === bookingId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function saveLocalChatMessage(input: Omit<ChatMessage, "id" | "createdAt">): ChatMessage {
  const message: ChatMessage = {
    ...input,
    id: createLocalMessageId(),
    createdAt: new Date().toISOString(),
  };

  const messages = getAllLocalMessages();
  messages.push(message);
  localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages));
  window.dispatchEvent(new CustomEvent("ridestamesa-chat-message", { detail: message }));
  return message;
}

function getAllLocalMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_MESSAGES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

function sanitizeMessage(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_MESSAGE_LENGTH);
}

function createLocalMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `MSG${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
