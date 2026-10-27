CREATE TABLE "User" (
 "id" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
 "role" TEXT NOT NULL DEFAULT 'CANDIDATE' CHECK ("role" IN ('CANDIDATE', 'RECRUITER', 'ADMIN')), "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" DATETIME NOT NULL,
 CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "User_email_normalized" CHECK ("email" = lower(trim("email")))
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "CandidateProfile" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "talentConsentAt" DATETIME,
 CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");
CREATE TABLE "AuthSession" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "expiresAt" DATETIME NOT NULL,
 "revokedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE TABLE "AuditLog" (
 "id" TEXT NOT NULL, "actorId" TEXT, "action" TEXT NOT NULL, "targetId" TEXT,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
