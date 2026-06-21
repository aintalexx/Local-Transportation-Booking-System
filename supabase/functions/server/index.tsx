import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

type RateLimitConfig = {
  name: string;
  maxRequests: number;
  windowMs: number;
  message: string;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_PREFIX = "rate-limit";
const SENSITIVE_RATE_LIMITS = {
  loginOtp: {
    name: "auth-send-otp",
    maxRequests: 5,
    windowMs: 10 * 60 * 1000,
    message: "Too many login or OTP requests. Please wait before trying again.",
  },
  passwordReset: {
    name: "auth-password-reset",
    maxRequests: 5,
    windowMs: 60 * 1000,
    message: "Too many forgot password requests. Please wait before trying again.",
  },
  otpVerify: {
    name: "auth-verify-otp",
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
    message: "Too many verification attempts. Please wait before trying again.",
  },
  bookingForm: {
    name: "booking-create",
    maxRequests: 12,
    windowMs: 10 * 60 * 1000,
    message: "Too many booking submissions. Please wait before trying again.",
  },
  bookingStatusForm: {
    name: "booking-status",
    maxRequests: 30,
    windowMs: 10 * 60 * 1000,
    message: "Too many booking status submissions. Please wait before trying again.",
  },
  chatForm: {
    name: "chat-message",
    maxRequests: 30,
    windowMs: 60 * 1000,
    message: "Too many message submissions. Please slow down.",
  },
} satisfies Record<string, RateLimitConfig>;

function getClientIp(c: any): string {
  const forwardedFor = c.req.header("x-forwarded-for") || "";
  const firstForwardedIp = forwardedFor.split(",")[0]?.trim();
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-real-ip") ||
    firstForwardedIp ||
    "unknown"
  );
}

function rateLimitKey(config: RateLimitConfig, ip: string): string {
  const safeIp = ip.replace(/[^a-zA-Z0-9:.:-]/g, "_");
  return `${RATE_LIMIT_PREFIX}:${config.name}:${safeIp}`;
}

async function checkRateLimit(c: any, config: RateLimitConfig) {
  const now = Date.now();
  const ip = getClientIp(c);
  const key = rateLimitKey(config, ip);
  const current = await kv.get(key) as RateLimitState | null;
  const state = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + config.windowMs };

  if (state.count >= config.maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
    c.header("Retry-After", String(retryAfterSeconds));
    c.header("X-RateLimit-Limit", String(config.maxRequests));
    c.header("X-RateLimit-Remaining", "0");
    c.header("X-RateLimit-Reset", String(Math.ceil(state.resetAt / 1000)));
    return c.json({
      success: false,
      error: config.message,
      retryAfterSeconds,
    }, 429);
  }

  const nextState = { ...state, count: state.count + 1 };
  await kv.set(key, nextState);
  c.header("X-RateLimit-Limit", String(config.maxRequests));
  c.header("X-RateLimit-Remaining", String(Math.max(0, config.maxRequests - nextState.count)));
  c.header("X-RateLimit-Reset", String(Math.ceil(nextState.resetAt / 1000)));
  return null;
}

function rateLimit(config: RateLimitConfig) {
  return async (c: any, next: () => Promise<void>) => {
    if (["GET", "HEAD", "OPTIONS"].includes(c.req.method.toUpperCase())) {
      await next();
      return;
    }

    const limitedResponse = await checkRateLimit(c, config);
    if (limitedResponse) return limitedResponse;
    await next();
  };
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.use("/make-server-2b48d7fc/auth/send-otp", rateLimit(SENSITIVE_RATE_LIMITS.loginOtp));
app.use("/make-server-2b48d7fc/auth/request-password-reset", rateLimit(SENSITIVE_RATE_LIMITS.passwordReset));
app.use("/make-server-2b48d7fc/auth/verify-otp", rateLimit(SENSITIVE_RATE_LIMITS.otpVerify));
app.use("/make-server-2b48d7fc/bookings/create", rateLimit(SENSITIVE_RATE_LIMITS.bookingForm));
app.use("/make-server-2b48d7fc/bookings/:id/status", rateLimit(SENSITIVE_RATE_LIMITS.bookingStatusForm));
app.use("/make-server-2b48d7fc/chat/:rideId/messages", rateLimit(SENSITIVE_RATE_LIMITS.chatForm));

// Health check endpoint
app.get("/make-server-2b48d7fc/health", (c) => {
  return c.json({ status: "ok" });
});

// ==================== AUTH ROUTES ====================

// Send OTP for login/registration
app.post("/make-server-2b48d7fc/auth/send-otp", async (c) => {
  try {
    const { phoneNumber, mode } = await c.req.json();

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in KV store with 5 minute expiry
    const otpKey = `otp:${phoneNumber}`;
    await kv.set(otpKey, otp);

    // TODO: In production, send OTP via SMS service (Twilio, etc.)
    console.log(`OTP for ${phoneNumber}: ${otp}`);

    return c.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return c.json({ success: false, error: "Failed to send OTP" }, 500);
  }
});

// Request a demo password reset code
app.post("/make-server-2b48d7fc/auth/request-password-reset", async (c) => {
  try {
    const { phoneNumber, role } = await c.req.json();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `password-reset-otp:${role || "passenger"}:${phoneNumber}`;
    await kv.set(otpKey, {
      otp,
      createdAt: new Date().toISOString(),
    });

    console.log(`Password reset OTP for ${role || "passenger"} ${phoneNumber}: ${otp}`);

    return c.json({
      success: true,
      message: "Password reset code sent successfully",
      generatedOtp: otp,
    });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return c.json({ success: false, error: "Failed to request password reset" }, 500);
  }
});

// Verify OTP
app.post("/make-server-2b48d7fc/auth/verify-otp", async (c) => {
  try {
    const { phoneNumber, otp, userData, mode, role } = await c.req.json();

    // Retrieve stored OTP
    const otpKey = `otp:${phoneNumber}`;
    const storedOtp = await kv.get(otpKey);

    if (!storedOtp || storedOtp !== otp) {
      return c.json({ success: false, error: "Invalid or expired OTP" }, 400);
    }

    // Delete used OTP
    await kv.del(otpKey);

    // Get or create user
    let user = await kv.get(`user:${phoneNumber}`);

    if (!user && mode === "register") {
      // Create new user
      user = {
        phoneNumber,
        name: userData?.fullName || "",
        email: userData?.email || "",
        role: role || "passenger",
        createdAt: new Date().toISOString(),
        rating: 5.0,
        totalTrips: 0,
      };
      await kv.set(`user:${phoneNumber}`, user);
    }

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    // Generate session token (simple approach for demo)
    const sessionToken = crypto.randomUUID();
    await kv.set(`session:${sessionToken}`, { phoneNumber, role: user.role });

    return c.json({
      success: true,
      user,
      token: sessionToken
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return c.json({ success: false, error: "Verification failed" }, 500);
  }
});

// ==================== BOOKING ROUTES ====================

// Create new booking
app.post("/make-server-2b48d7fc/bookings/create", async (c) => {
  try {
    const booking = await c.req.json();
    const bookingId = crypto.randomUUID();

    const newBooking = {
      ...booking,
      id: bookingId,
      status: "searching", // searching | driver_assigned | driver_arriving | ongoing | completed | cancelled
      createdAt: new Date().toISOString(),
    };

    await kv.set(`booking:${bookingId}`, newBooking);

    // Add to active bookings list
    const activeBookings = await kv.get("bookings:active") || [];
    activeBookings.push(bookingId);
    await kv.set("bookings:active", activeBookings);

    return c.json({ success: true, booking: newBooking });
  } catch (error) {
    console.error("Error creating booking:", error);
    return c.json({ success: false, error: "Failed to create booking" }, 500);
  }
});

// Get booking by ID
app.get("/make-server-2b48d7fc/bookings/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const booking = await kv.get(`booking:${id}`);

    if (!booking) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }

    return c.json({ success: true, booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return c.json({ success: false, error: "Failed to fetch booking" }, 500);
  }
});

// Update booking status
app.put("/make-server-2b48d7fc/bookings/:id/status", async (c) => {
  try {
    const id = c.req.param("id");
    const { status } = await c.req.json();

    const booking = await kv.get(`booking:${id}`);
    if (!booking) {
      return c.json({ success: false, error: "Booking not found" }, 404);
    }

    booking.status = status;
    booking.updatedAt = new Date().toISOString();

    await kv.set(`booking:${id}`, booking);

    return c.json({ success: true, booking });
  } catch (error) {
    console.error("Error updating booking:", error);
    return c.json({ success: false, error: "Failed to update booking" }, 500);
  }
});

// ==================== DRIVER ROUTES ====================

// Get available drivers
app.get("/make-server-2b48d7fc/drivers/available", async (c) => {
  try {
    const drivers = await kv.getByPrefix("driver:") || [];
    const availableDrivers = drivers.filter((d: any) => d.online && d.status === "available");

    return c.json({ success: true, drivers: availableDrivers });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return c.json({ success: false, error: "Failed to fetch drivers" }, 500);
  }
});

// Update driver location
app.post("/make-server-2b48d7fc/drivers/:id/location", async (c) => {
  try {
    const id = c.req.param("id");
    const { latitude, longitude } = await c.req.json();

    const locationData = {
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    };

    await kv.set(`driver:${id}:location`, locationData);

    return c.json({ success: true, location: locationData });
  } catch (error) {
    console.error("Error updating location:", error);
    return c.json({ success: false, error: "Failed to update location" }, 500);
  }
});

// ==================== CHAT ROUTES ====================

// Send message
app.post("/make-server-2b48d7fc/chat/:rideId/messages", async (c) => {
  try {
    const rideId = c.req.param("rideId");
    const message = await c.req.json();

    const messageId = crypto.randomUUID();
    const newMessage = {
      ...message,
      id: messageId,
      timestamp: new Date().toISOString(),
    };

    // Get existing messages
    const messages = await kv.get(`chat:${rideId}`) || [];
    messages.push(newMessage);

    await kv.set(`chat:${rideId}`, messages);

    return c.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    return c.json({ success: false, error: "Failed to send message" }, 500);
  }
});

// Get messages for a ride
app.get("/make-server-2b48d7fc/chat/:rideId/messages", async (c) => {
  try {
    const rideId = c.req.param("rideId");
    const messages = await kv.get(`chat:${rideId}`) || [];

    return c.json({ success: true, messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return c.json({ success: false, error: "Failed to fetch messages" }, 500);
  }
});

Deno.serve(app.fetch);
