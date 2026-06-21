import { getPasswordStrength } from "../utils/validators";

type PasswordStrengthMeterProps = {
  password: string;
};

const strengthColor: Record<string, string> = {
  Weak: "#C62828",
  Fair: "#D97706",
  Strong: "#15803D",
  "Very Strong": "#047857",
};

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = getPasswordStrength(password);
  const color = strengthColor[strength.level];

  if (!password) {
    return (
      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full w-0 rounded-full transition-all" />
        </div>
        <p className="text-xs text-gray-500">
          Minimum 8 characters with uppercase, lowercase, digit, and special character.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${strength.percent}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold" style={{ color }}>
          {strength.level}
        </span>
        <span className="text-right text-gray-500">
          Use uppercase, lowercase, digit, and special character.
        </span>
      </div>
    </div>
  );
}
