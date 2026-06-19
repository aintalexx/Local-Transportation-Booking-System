import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(".env.local");
const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.");
}

const unique = Date.now();
const passengerEmail = `qa.passenger.${unique}@example.com`;
const passengerPassword = `QaTest${unique}!`;
const passengerPhone = `0998${String(unique).slice(-7)}`;
const driverPhone = `0997${String(unique).slice(-7)}`;
const driverPassword = `Driver${unique}!`;

function step(name, details = "") {
  console.log(`OK ${name}${details ? ` - ${details}` : ""}`);
}

function assert(value, message) {
  if (!value) throw new Error(message);
}

function normalizeRow(row) {
  return {
    id: row.id,
    passenger_id: row.passenger_id,
    driver_id: row.driver_id,
    passenger_name: row.passenger_name,
    driver_name: row.driver_name,
    pickup_address: row.pickup_address,
    destination_address: row.destination_address,
    final_price: Number(row.final_price),
    status: row.status,
  };
}

async function requestJson(url, {
  method = "GET",
  token = supabaseKey,
  body,
  headers = {},
  allowEmpty = false,
} = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || data?.hint || text || response.statusText;
    throw new Error(`${method} ${url} failed: ${message}`);
  }

  if (!data && !allowEmpty) return null;
  return data;
}

async function authSignup(email, password, metadata) {
  return requestJson(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    body: {
      email,
      password,
      data: metadata,
    },
  });
}

async function authPassword(email, password) {
  return requestJson(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    body: { email, password },
  });
}

async function restSelect(table, query, token = supabaseKey) {
  return requestJson(`${supabaseUrl}/rest/v1/${table}?${query}`, { token });
}

async function restInsert(table, row, token = supabaseKey) {
  const data = await requestJson(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    token,
    headers: { Prefer: "return=representation" },
    body: row,
  });
  return Array.isArray(data) ? data[0] : data;
}

async function restUpdate(table, query, patch, token = supabaseKey) {
  const data = await requestJson(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    token,
    headers: { Prefer: "return=representation" },
    body: patch,
  });
  return Array.isArray(data) ? data[0] : data;
}

async function rpc(name, body, token = supabaseKey) {
  return requestJson(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    token,
    body,
  });
}

async function main() {
  const signupData = await authSignup(passengerEmail, passengerPassword, {
    role: "passenger",
    username: `qa_passenger_${unique}`,
    full_name: "QA Passenger",
    phone: passengerPhone,
  });

  assert(signupData.user?.id, "Passenger auth user was not created.");
  step("passenger registration", passengerEmail);

  let passengerSession;
  try {
    passengerSession = await authPassword(passengerEmail, passengerPassword);
  } catch (error) {
    throw new Error(
      `Passenger sign-in failed. If email confirmation is enabled, disable it for this QA test or confirm the test email. ${error.message}`,
    );
  }
  const passengerToken = passengerSession.access_token;
  assert(passengerToken, "Passenger access token was not returned.");
  step("passenger login");

  await new Promise((resolve) => setTimeout(resolve, 700));

  const passengerProfiles = await restSelect("profiles", `select=*&id=eq.${signupData.user.id}&limit=1`, passengerToken);
  const passengerProfile = passengerProfiles?.[0];
  assert(passengerProfile?.role === "passenger", "Passenger profile was not synced with role passenger.");
  step("passenger profile sync", signupData.user.id);

  const driverApplication = await restInsert("drivers", {
    phone: driverPhone,
    first_name: "QA",
    middle_name: "",
    surname: "Driver",
    suffix: "",
    birthdate: "1998-01-01",
    password: driverPassword,
    profile_photo: "qa-profile-photo",
    valid_id_photo: "qa-valid-id",
    or_cr_photo: "qa-orcr",
    clearance_photo: "qa-clearance",
    vehicle_photo: "qa-vehicle",
    license_number: `QA-${String(unique).slice(-6)}`,
    plate_number: `QA${String(unique).slice(-4)}`,
    vehicle_type: "Tricycle",
    approval_status: "pending",
    account_status: "Active",
  });
  step("driver registration", driverApplication.id);

  const approvedDriver = await restUpdate(
    "drivers",
    `id=eq.${driverApplication.id}`,
    { approval_status: "approved", account_status: "Active" },
  );
  assert(approvedDriver.approval_status === "approved", "Driver approval did not persist.");
  step("driver approval");

  const createdBooking = await restInsert("bookings", {
    passenger_id: signupData.user.id,
    passenger_name: "QA Passenger",
    passenger_phone: passengerPhone,
    pickup_lat: 14.5995,
    pickup_lng: 121.0114,
    pickup_address: "PUP Sta. Mesa, Manila",
    destination_lat: 14.6024,
    destination_lng: 121.0198,
    destination_address: "SM City Sta. Mesa, Manila",
    distance_km: 1.1,
    base_price: 21,
    final_price: 21,
    payment_method: "Cash",
    vehicle_type: "Tricycle",
    ride_type: "solo",
    passenger_count: 1,
    reserve_entire: false,
    status: "pending",
    created_at: new Date().toISOString(),
  }, passengerToken);
  assert(createdBooking.status === "pending", "Passenger booking was not saved as pending.");
  step("booking creation", createdBooking.id);

  const pendingRows = await rpc("get_available_bookings_for_driver", {
    p_driver_phone: driverPhone,
    p_driver_password: driverPassword,
    p_vehicle_type: "Tricycle",
  });

  assert(
    pendingRows?.some((row) => row.id === createdBooking.id),
    "Approved driver could not fetch the new pending booking.",
  );
  step("driver pending request fetch");

  const acceptedBooking = await rpc("accept_booking_as_driver", {
    p_booking_id: createdBooking.id,
    p_driver_phone: driverPhone,
    p_driver_password: driverPassword,
  });

  assert(acceptedBooking?.status === "accepted", "Driver accept did not set status accepted.");
  assert(acceptedBooking?.driver_id, "Driver accept did not assign driver_id.");
  step("driver accept booking", acceptedBooking.driver_id);

  const passengerAcceptedRows = await restSelect("bookings", `select=*&id=eq.${createdBooking.id}&limit=1`, passengerToken);
  const passengerAccepted = passengerAcceptedRows?.[0];
  assert(passengerAccepted?.status === "accepted", "Passenger cannot see accepted status.");
  step("passenger accepted status sync");

  const activeDriverBooking = await rpc("get_active_booking_for_driver", {
    p_driver_phone: driverPhone,
    p_driver_password: driverPassword,
  });

  assert(activeDriverBooking?.id === createdBooking.id, "Driver cannot reload active accepted booking.");
  step("driver active booking reload");

  const driverMessage = await rpc("send_chat_message_as_driver", {
    p_booking_id: createdBooking.id,
    p_driver_phone: driverPhone,
    p_driver_password: driverPassword,
    p_sender_name: "QA Driver",
    p_sender_username: "qa_driver",
    p_message: "QA driver message",
  });

  assert(driverMessage?.booking_id === createdBooking.id, "Driver chat message was not linked to booking.");
  step("driver chat message");

  const passengerMessage = await restInsert("chat_messages", {
    booking_id: createdBooking.id,
    sender_id: signupData.user.id,
    sender_role: "passenger",
    sender_name: "QA Passenger",
    sender_username: `qa_passenger_${unique}`,
    message: "QA passenger reply",
  }, passengerToken);
  assert(passengerMessage?.booking_id === createdBooking.id, "Passenger chat message was not linked to booking.");
  step("passenger chat message");

  for (const status of ["driver_arriving", "passenger_picked_up", "in_progress", "completed"]) {
    const updatedBooking = await rpc("update_booking_status_as_driver", {
      p_booking_id: createdBooking.id,
      p_driver_phone: driverPhone,
      p_driver_password: driverPassword,
      p_status: status,
    });

    assert(updatedBooking?.status === status, `Driver status update failed for ${status}.`);
    step("driver status update", status);
  }

  const completedRows = await restSelect("bookings", `select=*&id=eq.${createdBooking.id}&limit=1`, passengerToken);
  const completedBooking = completedRows?.[0];
  assert(completedBooking?.status === "completed", "Completed booking is not visible to passenger.");
  assert(completedBooking?.completed_at, "Completed booking has no completed_at timestamp.");
  step("ride completion visible to passenger");

  const driverHistoryRows = await rpc("get_driver_bookings_for_history", {
    p_driver_phone: driverPhone,
    p_driver_password: driverPassword,
  });
  assert(driverHistoryRows?.some((row) => row.id === createdBooking.id), "Driver completed ride history query failed.");
  step("driver ride history");

  console.log("\nQA booking lifecycle passed.");
  console.log(JSON.stringify({
    passengerEmail,
    passengerPhone,
    driverPhone,
    booking: normalizeRow(completedBooking),
  }, null, 2));
}

main().catch((error) => {
  console.error("\nQA booking lifecycle failed.");
  console.error(error?.message || error);
  process.exitCode = 1;
});
