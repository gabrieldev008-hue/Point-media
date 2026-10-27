CREATE TYPE "Role" AS ENUM ('CANDIDATE', 'RECRUITER', 'ADMIN');
CREATE TABLE "User" (
 "id" UUID NOT NULL, "email" VARCHAR(254) NOT NULL, "passwordHash" TEXT NOT NULL,
 "role" "Role" NOT NULL DEFAULT 'CANDIDATE', "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "User_email_normalized" CHECK ("email" = lower(btrim("email")))
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "CandidateProfile" (
 "id" UUID NOT NULL, "userId" UUID NOT NULL, "name" VARCHAR(120) NOT NULL,
 "talentConsentAt" TIMESTAMPTZ(3),
 CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");
CREATE TABLE "AuthSession" (
 "id" UUID NOT NULL, "userId" UUID NOT NULL, "expiresAt" TIMESTAMPTZ(3) NOT NULL,
 "revokedAt" TIMESTAMPTZ(3), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE TABLE "AuditLog" (
 "id" UUID NOT NULL, "actorId" UUID, "action" VARCHAR(80) NOT NULL, "targetId" UUID,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
