import { PrismaClient } from "@prisma/client";

const ADJECTIVES = [
  "GOLDEN",
  "SILK",
  "ETERNAL",
  "RADIANT",
  "VELVET",
  "CELESTIAL",
];

const NOUNS = [
  "MEMORIES",
  "GLANCE",
  "HEARTS",
  "JOURNEY",
  "LEGACY",
  "VISION",
];

/**
 * Generates a human-readable access code in the format ADJECTIVE-NOUN-2026
 */
export function generateAccessCode(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective}-${noun}-2026`.toUpperCase();
}

/**
 * Generates a unique access code by checking against the database.
 * Retries up to 10 times if collisions occur.
 */
export async function generateUniqueAccessCode(prisma: PrismaClient): Promise<string> {
  const maxRetries = 10;
  
  for (let i = 0; i < maxRetries; i++) {
    const code = generateAccessCode();
    
    const existing = await prisma.event.findUnique({
      where: { accessCode: code },
    });
    
    if (!existing) {
      return code;
    }
  }
  
  // Fallback to adding a random suffix if 10 retries fail (extremely unlikely)
  return `${generateAccessCode()}-${Math.floor(Math.random() * 1000)}`;
}
