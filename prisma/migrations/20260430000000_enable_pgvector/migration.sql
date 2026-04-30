-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Alter FaceDescriptor to use vector(128)
-- We use a cast or recreate if necessary. Since the data might be important, 
-- we attempt to alter the type. If it fails, users might need to truncate.
-- However, for the migration, we follow the user's request.

ALTER TABLE "face_descriptors" ALTER COLUMN "descriptor" TYPE vector(128) USING "descriptor"::vector(128);
