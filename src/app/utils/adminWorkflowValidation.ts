export type AdminDriverAction = "approve" | "reject" | "block" | "reinstate" | "archive" | "restore";
export type AdminDriverStatus = "Pending" | "Active" | "Blocked" | "Archived";

export type WorkflowValidationResult = {
  valid: boolean;
  message?: string;
};

const DRIVER_ACTION_TRANSITIONS: Record<AdminDriverAction, {
  from: AdminDriverStatus[];
  to: AdminDriverStatus;
  label: string;
}> = {
  approve: { from: ["Pending"], to: "Active", label: "approve" },
  reject: { from: ["Pending"], to: "Blocked", label: "reject" },
  block: { from: ["Active"], to: "Blocked", label: "block" },
  reinstate: { from: ["Blocked"], to: "Active", label: "reinstate" },
  archive: { from: ["Pending", "Active", "Blocked"], to: "Archived", label: "archive" },
  restore: { from: ["Archived"], to: "Active", label: "restore" },
};

export function validateDriverWorkflowTransition(
  currentStatus: AdminDriverStatus,
  action: AdminDriverAction
): WorkflowValidationResult {
  const rule = DRIVER_ACTION_TRANSITIONS[action];
  if (rule.from.includes(currentStatus)) {
    return { valid: true };
  }

  return {
    valid: false,
    message: `Cannot ${rule.label} a driver while status is ${currentStatus}. Allowed: ${rule.from.join(" or ")} -> ${rule.to}.`,
  };
}

type BookingStage =
  | "pending"
  | "accepted"
  | "ongoing"
  | "arrived_at_pickup"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "draft";

const BOOKING_STAGE_LABEL: Record<BookingStage, string> = {
  draft: "Draft",
  pending: "Pending",
  accepted: "Accepted",
  ongoing: "Ongoing",
  arrived_at_pickup: "Arrived at Pickup",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const BOOKING_STATUS_STAGE: Record<string, BookingStage> = {
  idle: "draft",
  selecting_location: "draft",
  route_preview: "draft",
  pending: "pending",
  finding_driver: "pending",
  searching: "pending",
  available: "pending",
  accepted: "accepted",
  driver_found: "accepted",
  driver_arriving: "ongoing",
  en_route: "ongoing",
  driver_to_pickup: "ongoing",
  Ongoing: "ongoing",
  arrived: "arrived_at_pickup",
  driver_arrived: "arrived_at_pickup",
  passenger_picked_up: "in_progress",
  ride_started: "in_progress",
  in_progress: "in_progress",
  ride_ongoing: "in_progress",
  completed: "completed",
  ride_completed: "completed",
  Completed: "completed",
  cancelled: "cancelled",
  rejected: "cancelled",
  Cancelled: "cancelled",
  Pending: "pending",
};

const BOOKING_ALLOWED_NEXT: Record<BookingStage, BookingStage[]> = {
  draft: ["pending"],
  pending: ["accepted", "cancelled"],
  accepted: ["ongoing", "cancelled"],
  ongoing: ["arrived_at_pickup", "cancelled"],
  arrived_at_pickup: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function validateBookingStatusTransition(
  currentStatus: string,
  nextStatus: string
): WorkflowValidationResult {
  if (currentStatus === nextStatus) return { valid: true };

  const currentStage = BOOKING_STATUS_STAGE[currentStatus];
  const nextStage = BOOKING_STATUS_STAGE[nextStatus];

  if (!currentStage || !nextStage) {
    return {
      valid: false,
      message: `Unknown booking transition: ${currentStatus} -> ${nextStatus}.`,
    };
  }

  if (currentStage === nextStage) return { valid: true };

  const allowedStages = BOOKING_ALLOWED_NEXT[currentStage] || [];
  if (allowedStages.includes(nextStage)) {
    return { valid: true };
  }

  return {
    valid: false,
    message: `Invalid booking transition: ${BOOKING_STAGE_LABEL[currentStage]} -> ${BOOKING_STAGE_LABEL[nextStage]}.`,
  };
}
