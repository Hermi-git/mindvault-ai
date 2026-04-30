/**
 * Common validation schemas using Zod
 * Used with react-hook-form for type-safe form validation
 */

import { z } from 'zod';

// Auth schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  org_slug: z.string().optional(),
});

export const RegisterSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    full_name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    organization_name: z.string().min(2, 'Organization name must be at least 2 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Document schemas
export const DocumentUploadSchema = z.object({
  title: z.string().min(1, 'Document title is required'),
  file: z.instanceof(File).refine((file) => file.size > 0, 'File is required'),
});

// Chat schemas
export const ChatQuerySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(5000, 'Query is too long'),
  sessionId: z.string().optional(),
});

// Export types
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>;
export type ChatQueryInput = z.infer<typeof ChatQuerySchema>;
