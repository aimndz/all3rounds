const PURE_SECONDS_PATTERN = /^\d+(?:\.\d+)?$/;
const COLON_TIME_PATTERN = /^\d+(?::\d+){1,2}(?:\.\d+)?$/;

type ParseTimeInputSuccess = {
  ok: true;
  seconds: number;
  normalized: string;
};

type ParseTimeInputFailure = {
  ok: false;
  error: string;
};

export type ParseTimeInputResult =
  | ParseTimeInputSuccess
  | ParseTimeInputFailure;

function formatSecondSegment(value: number, includeDecimals = true): string {
  const wholeSeconds = Math.floor(value);
  const fraction = value - wholeSeconds;

  if (!includeDecimals || fraction === 0) {
    return wholeSeconds.toString().padStart(2, "0");
  }

  const decimal = fraction
    .toFixed(2)
    .slice(1)
    .replace(/0+$/, "")
    .replace(/\.$/, "");

  return `${wholeSeconds.toString().padStart(2, "0")}${decimal}`;
}

export function formatTimeInputValue(
  totalSeconds: number,
  options?: { includeDecimals?: boolean },
): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "0:00";
  }

  const includeDecimals = options?.includeDecimals ?? true;
  const hours = Math.floor(totalSeconds / 3600);
  const remainingAfterHours = totalSeconds - hours * 3600;
  const minutes = Math.floor(remainingAfterHours / 60);
  const seconds = remainingAfterHours - minutes * 60;
  const secondSegment = formatSecondSegment(seconds, includeDecimals);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secondSegment}`;
  }

  return `${minutes}:${secondSegment}`;
}

export function parseTimeInputValue(input: string | number): ParseTimeInputResult {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) {
      return { ok: false, error: "Time must be a non-negative number." };
    }

    return {
      ok: true,
      seconds: input,
      normalized: formatTimeInputValue(input),
    };
  }

  const value = input.trim();
  if (!value) {
    return { ok: false, error: "Time is required." };
  }

  if (PURE_SECONDS_PATTERN.test(value)) {
    const seconds = Number.parseFloat(value);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return { ok: false, error: "Time must be a non-negative number." };
    }

    return {
      ok: true,
      seconds,
      normalized: formatTimeInputValue(seconds),
    };
  }

  if (!COLON_TIME_PATTERN.test(value)) {
    return {
      ok: false,
      error: "Use seconds, mm:ss, or hh:mm:ss.",
    };
  }

  const parts = value.split(":");

  if (parts.length === 2) {
    const [minutesPart, secondsPart] = parts;
    const minutes = Number.parseInt(minutesPart, 10);
    const seconds = Number.parseFloat(secondsPart);

    if (minutes > 59) {
      return {
        ok: false,
        error: "Use hh:mm:ss for one hour or more.",
      };
    }

    if (!Number.isFinite(seconds) || seconds >= 60) {
      return {
        ok: false,
        error: "Seconds must stay below 60.",
      };
    }

    const totalSeconds = minutes * 60 + seconds;
    return {
      ok: true,
      seconds: totalSeconds,
      normalized: formatTimeInputValue(totalSeconds),
    };
  }

  if (parts.length === 3) {
    const [hoursPart, minutesPart, secondsPart] = parts;
    const hours = Number.parseInt(hoursPart, 10);
    const minutes = Number.parseInt(minutesPart, 10);
    const seconds = Number.parseFloat(secondsPart);

    if (minutes >= 60) {
      return {
        ok: false,
        error: "Minutes must stay below 60.",
      };
    }

    if (!Number.isFinite(seconds) || seconds >= 60) {
      return {
        ok: false,
        error: "Seconds must stay below 60.",
      };
    }

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return {
      ok: true,
      seconds: totalSeconds,
      normalized: formatTimeInputValue(totalSeconds),
    };
  }

  return {
    ok: false,
    error: "Use seconds, mm:ss, or hh:mm:ss.",
  };
}
