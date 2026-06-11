import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

export const analyzeSchema = z.object({
  packageJson: z.union([z.string(), z.object({}).catchall(z.any())]),
});

export const analyzeQueueSchema = z.object({
  packageJson: z.union([z.string(), z.object({}).catchall(z.any())]),
});

export const autonomousAgentSchema = z.object({
  query: z.string().min(1, 'Query is required'),
});

export const statusParamsSchema = z.object({
  jobId: z.string().min(1),
});

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
      });
    }
    next();
  };
}
