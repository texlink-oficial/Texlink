// Prisma configuration for migrations and schema
// In production, DATABASE_URL is injected by Railway
import { defineConfig } from "prisma/config";

// Only load dotenv in development
if (process.env.NODE_ENV !== "production") {
  require("dotenv/config");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
