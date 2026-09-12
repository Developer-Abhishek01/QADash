-- CreateTable
CREATE TABLE "test_versions" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT,
    "config" JSONB,
    "changes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_versions_testId_version_key" ON "test_versions"("testId", "version");

-- AddForeignKey
ALTER TABLE "test_versions" ADD CONSTRAINT "test_versions_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
