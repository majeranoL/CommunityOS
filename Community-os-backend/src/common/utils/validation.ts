import { Matches } from 'class-validator';

// Philippine mobile/landline numbers: 7-15 digits, optionally starting with +.
// Accepts formats like 09171234567, +639171234567, 0281234567.
export const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
export const PHONE_MESSAGE =
  'must be a valid phone number: 7-15 digits, optionally starting with +';

export function PhoneNumber() {
  return Matches(PHONE_REGEX, { message: PHONE_MESSAGE });
}
