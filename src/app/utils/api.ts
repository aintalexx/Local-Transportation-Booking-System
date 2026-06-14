import { projectId, publicAnonKey } from "/utils/supabase/info";

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-2b48d7fc`;

// Helper function for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

// ==================== AUTH API ====================

export const authAPI = {
  async sendOTP(phoneNumber: string, mode: "login" | "register") {
    return apiCall("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, mode }),
    });
  },

  async verifyOTP(phoneNumber: string, otp: string, userData?: any, mode?: string, role?: string) {
    return apiCall("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, otp, userData, mode, role }),
    });
  },
};

// ==================== BOOKING API ====================

export const bookingAPI = {
  async create(bookingData: {
    passengerPhone: string;
    pickup: string;
    destination: string;
    vehicleType: string;
    fare: number;
    distance: string;
  }) {
    return apiCall("/bookings/create", {
      method: "POST",
      body: JSON.stringify(bookingData),
    });
  },

  async getById(id: string) {
    return apiCall(`/bookings/${id}`);
  },

  async updateStatus(id: string, status: string) {
    return apiCall(`/bookings/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },
};

// ==================== DRIVER API ====================

export const driverAPI = {
  async getAvailable() {
    return apiCall("/drivers/available");
  },

  async updateLocation(driverId: string, latitude: number, longitude: number) {
    return apiCall(`/drivers/${driverId}/location`, {
      method: "POST",
      body: JSON.stringify({ latitude, longitude }),
    });
  },
};

// ==================== CHAT API ====================

export const chatAPI = {
  async sendMessage(rideId: string, sender: string, text: string) {
    return apiCall(`/chat/${rideId}/messages`, {
      method: "POST",
      body: JSON.stringify({ sender, text }),
    });
  },

  async getMessages(rideId: string) {
    return apiCall(`/chat/${rideId}/messages`);
  },
};
