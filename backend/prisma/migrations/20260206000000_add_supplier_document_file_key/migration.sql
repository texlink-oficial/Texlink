-- AlterTable
ALTER TABLE "supplier_documents" ADD COLUMN "fileKey" TEXT;

-- Backfill fileKey from existing fileUrl values
-- Extract key from S3 URLs: https://bucket.s3.region.amazonaws.com/path/to/file → path/to/file
-- Extract key from CloudFront URLs: https://cdn.example.com/path/to/file → path/to/file
-- Extract key from local URLs: http://localhost:3000/uploads/path/to/file → path/to/file
UPDATE "supplier_documents"
SET "fileKey" = CASE
  -- Local storage URL pattern: /uploads/...
  WHEN "fileUrl" LIKE '%/uploads/%' THEN
    SUBSTRING("fileUrl" FROM '/uploads/(.+)$')
  -- S3 URL pattern: https://bucket.s3.region.amazonaws.com/...
  WHEN "fileUrl" LIKE 'https://%.s3.%.amazonaws.com/%' THEN
    SUBSTRING("fileUrl" FROM 'https://[^/]+/(.+)$')
  -- CloudFront or other CDN URL pattern
  WHEN "fileUrl" LIKE 'https://%' THEN
    SUBSTRING("fileUrl" FROM 'https://[^/]+/(.+)$')
  ELSE NULL
END
WHERE "fileUrl" IS NOT NULL AND "fileKey" IS NULL;
