export const DEMO_OTP_RESEND_SECONDS = 60;
export const DEMO_OTP_LENGTH = 6;

export function createDemoOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

