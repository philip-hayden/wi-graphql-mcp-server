import { z } from "zod";

export const GqlArgsSchema = z.object({
  query: z.string(),
  variables: z.record(z.string(), z.any()).default({}),
  operationName: z.string().optional(),
  bearerToken: z.string().optional(),
});

export const GetDeploymentsArgsSchema = z.object({
  projectId: z.number(),
  nameFilter: z.string().default(""),
  pageSize: z.number().default(500),
});
