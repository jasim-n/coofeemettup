import type { User } from '../../generated/prisma/client';

/**
 * Whitelist the client-safe profile fields for viewing by OTHER users. The
 * public identity is the `username` handle ONLY — never leak real-world
 * contact/identity details (phone, email, firstName, lastName, lastInitial) or
 * internal columns (cnicImagePath, blockedUserIds, referralCode). Shape matches
 * the shared `PublicUser` DTO. Date fields are returned as-is; Nest serializes
 * them to ISO strings. For the authenticated self use `toSelfUser`.
 */
export function toPublicUser(u: User) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    canHost: u.canHost,
    verificationStatus: u.verificationStatus,
    reliabilityScore: u.reliabilityScore,
    ageBand: u.ageBand,
    gender: u.gender,
    city: u.city,
    areas: u.areas,
    language: u.language,
    availability: u.availability,
    interests: u.interests,
    lifeStage: u.lifeStage,
    socialEnergy: u.socialEnergy,
    intents: u.intents,
    newcomerStatus: u.newcomerStatus,
    beveragePref: u.beveragePref,
    accessibilityNeeds: u.accessibilityNeeds,
    occupation: u.occupation,
    photoUrl: u.photoUrl,
    photoConsent: u.photoConsent,
    codeOfConductAt: u.codeOfConductAt,
    // Presence — online if seen in the last 5 minutes.
    online:
      !!u.lastSeenAt &&
      Date.now() - new Date(u.lastSeenAt).getTime() < 5 * 60_000,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/**
 * Self view — the authenticated user's own record. Adds fields private to the
 * owner (real name, phone, email) on top of the public shape. NEVER use for
 * other users.
 */
export function toSelfUser(u: User) {
  return {
    ...toPublicUser(u),
    email: u.email,
    phone: u.phone,
    firstName: u.firstName,
    lastName: u.lastName,
    lastInitial: u.lastInitial,
    surpriseMeOptIn: u.surpriseMeOptIn,
    remindBeforeMeetup: u.remindBeforeMeetup,
  };
}

/**
 * Public-profile view — omits all private/sensitive fields.
 * Safe to return to any authenticated viewer.
 */
export function toPublicProfile(u: User) {
  return {
    id: u.id,
    username: u.username,
    city: u.city,
    verificationStatus: u.verificationStatus,
    reliabilityScore: u.reliabilityScore,
    canHost: u.canHost,
    role: u.role,
    interests: u.interests,
    occupation: u.occupation,
    photoUrl: u.photoUrl,
    lifeStage: u.lifeStage,
    socialEnergy: u.socialEnergy,
    intents: u.intents,
    beveragePref: u.beveragePref,
    language: u.language,
    createdAt: u.createdAt,
  };
}
