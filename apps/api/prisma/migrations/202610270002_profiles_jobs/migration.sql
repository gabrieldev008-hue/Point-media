CREATE TABLE "CandidateProfile_next" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "talentConsentAt" DATETIME, "phone" TEXT, "location" TEXT, "linkedIn" TEXT, "portfolio" TEXT,
 "seniority" TEXT CHECK ("seniority" IN ('INTERN','JUNIOR','MID','SENIOR','LEAD')),
 "salaryCents" INTEGER CHECK ("salaryCents" >= 0), "summary" TEXT, "updatedAt" DATETIME NOT NULL,
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "CandidateProfile_next" ("id","userId","name","talentConsentAt","updatedAt")
 SELECT "id","userId","name","talentConsentAt",CURRENT_TIMESTAMP FROM "CandidateProfile";
DROP TABLE "CandidateProfile";
ALTER TABLE "CandidateProfile_next" RENAME TO "CandidateProfile";
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");
CREATE TABLE "Skill" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL);
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");
CREATE TABLE "CandidateSkill" (
 "candidateId" TEXT NOT NULL, "skillId" TEXT NOT NULL,
 PRIMARY KEY ("candidateId","skillId"),
 FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CandidateSkill_skillId_idx" ON "CandidateSkill"("skillId");
CREATE TABLE "Experience" (
 "id" TEXT NOT NULL PRIMARY KEY, "candidateId" TEXT NOT NULL, "company" TEXT NOT NULL,
 "title" TEXT NOT NULL, "startsAt" DATETIME NOT NULL, "endsAt" DATETIME, "description" TEXT,
 CHECK ("endsAt" IS NULL OR "endsAt" >= "startsAt"),
 FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Experience_candidateId_idx" ON "Experience"("candidateId");
CREATE TABLE "Education" (
 "id" TEXT NOT NULL PRIMARY KEY, "candidateId" TEXT NOT NULL, "institution" TEXT NOT NULL,
 "course" TEXT NOT NULL, "startsAt" DATETIME NOT NULL, "endsAt" DATETIME,
 CHECK ("endsAt" IS NULL OR "endsAt" >= "startsAt"),
 FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Education_candidateId_idx" ON "Education"("candidateId");
CREATE TABLE "ResumeFile" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "storageKey" TEXT NOT NULL,
 "mimeType" TEXT NOT NULL, "size" INTEGER NOT NULL CHECK ("size" > 0 AND "size" <= 5242880),
 "sha256" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ResumeFile_userId_key" ON "ResumeFile"("userId");
CREATE UNIQUE INDEX "ResumeFile_storageKey_key" ON "ResumeFile"("storageKey");
CREATE TABLE "Department" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL);
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE TABLE "JobOpening" (
 "id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
 "departmentId" TEXT NOT NULL, "seniority" TEXT NOT NULL CHECK ("seniority" IN ('INTERN','JUNIOR','MID','SENIOR','LEAD')),
 "workMode" TEXT NOT NULL CHECK ("workMode" IN ('REMOTE','HYBRID','ONSITE')),
 "salaryMinCents" INTEGER, "salaryMaxCents" INTEGER, "opensAt" DATETIME NOT NULL, "closesAt" DATETIME NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT','PUBLISHED','CLOSED','CANCELLED')),
 "technologyWeight" INTEGER NOT NULL DEFAULT 50 CHECK ("technologyWeight" BETWEEN 0 AND 100),
 "seniorityWeight" INTEGER NOT NULL DEFAULT 30 CHECK ("seniorityWeight" BETWEEN 0 AND 100),
 "salaryWeight" INTEGER NOT NULL DEFAULT 20 CHECK ("salaryWeight" BETWEEN 0 AND 100),
 "criteriaVersion" INTEGER NOT NULL DEFAULT 1, "revision" INTEGER NOT NULL DEFAULT 1,
 "createdById" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
 CHECK ("technologyWeight" + "seniorityWeight" + "salaryWeight" = 100),
 CHECK ("salaryMinCents" IS NULL OR "salaryMinCents" >= 0),
 CHECK ("salaryMaxCents" IS NULL OR "salaryMaxCents" >= 0),
 CHECK ("salaryMinCents" IS NULL OR "salaryMaxCents" IS NULL OR "salaryMaxCents" >= "salaryMinCents"),
 CHECK ("closesAt" > "opensAt"),
 FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "JobOpening_status_opensAt_closesAt_idx" ON "JobOpening"("status","opensAt","closesAt");
CREATE INDEX "JobOpening_departmentId_idx" ON "JobOpening"("departmentId");
CREATE TABLE "JobRequirement" (
 "id" TEXT NOT NULL PRIMARY KEY, "jobId" TEXT NOT NULL, "skillId" TEXT, "text" TEXT NOT NULL,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('ESSENTIAL','DESIRABLE')),
 FOREIGN KEY ("jobId") REFERENCES "JobOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "JobRequirement_jobId_idx" ON "JobRequirement"("jobId");
CREATE INDEX "JobRequirement_skillId_idx" ON "JobRequirement"("skillId");
