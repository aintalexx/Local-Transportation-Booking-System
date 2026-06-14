import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

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