-- CreateTable
CREATE TABLE "AdminSavedView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSavedView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminSavedView_userId_path_idx" ON "AdminSavedView"("userId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSavedView_userId_path_name_key" ON "AdminSavedView"("userId", "path", "name");

-- AddForeignKey
ALTER TABLE "AdminSavedView" ADD CONSTRAINT "AdminSavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
