/**
 * Normalizes a Pakistani mobile number to canonical +92 form.
 * Accepts: 03XXXXXXXXX, 3XXXXXXXXX, 923XXXXXXXXX, +923XXXXXXXXX (spaces/dashes ok).
 * Throws for anything that isn't a plausible PK mobile number.
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/[\s-]/g, '');
  let local: string;
  if (digits.startsWith('+92')) local = digits.slice(3);
  else if (digits.startsWith('92')) local = digits.slice(2);
  else if (digits.startsWith('0')) local = digits.slice(1);
  else local = digits;

  if (!/^3\d{9}$/.test(local)) {
    throw new Error('Invalid Pakistani mobile number');
  }
  return `+92${local}`;
}
