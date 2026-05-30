export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string) {
  return USERNAME_PATTERN.test(value);
}

export function defaultUsernameForUserId(userId: string) {
  return `user_${userId.replace(/-/g, "").slice(0, 8)}`;
}
