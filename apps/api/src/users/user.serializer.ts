import type { User } from '../../generated/prisma/client';

/**
 * Whitelist the client-safe profile fields. Never leak internal/sensitive
 * columns (cnicImagePath, blockedUserIds, referralCode, referredByCode) to the
 * client. Shape matches the shared `PublicUser` DTO. Date fields are returned
 * as-is; Nest serializes them to ISO strings.
 */
export function toPublicUser(u: User) {
  return {
    id: u.id,
    phone: u.phone,
    role: u.role,
    canHost: u.canHost,
    verificationStatus: u.verificationStatus,
    reliabilityScore: u.reliabilityScore,
    firstName: u.firstName,
    lastInitial: u.lastInitial,
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
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/**
 * Public-profile view — omits all private/sensitive fields.
 * Safe to return to any authenticated viewer.
 */
export function toPublicProfile(u: User) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastInitial: u.lastInitial,
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
