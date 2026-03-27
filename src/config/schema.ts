import { z } from "zod";

export const ConfigSchema = z.object({
  npm: z.array(z.string()).default([]),
  pip: z.array(z.string()).default([]),
  runtimes: z.array(z.string()).default([]),
  docker: z.array(z.string()).default([]),
  github: z.array(z.string()).default([]),
  ai_models: z.array(z.string()).default([]),
  output: z
    .object({
      file: z.string().default("versions.md"),
      include_timestamp: z.boolean().default(true),
    })
    .default({}),
  integrations: z.array(z.string()).default([]),
});

export type Config = z.infer<typeof ConfigSchema>;
