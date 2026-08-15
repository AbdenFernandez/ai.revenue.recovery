import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(320),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit"),
  fullName: z.string().trim().min(1, "Name is required").max(100),
  businessName: z.string().trim().min(2, "Business name must be at least 2 characters").max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const resetPasswordRequestSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").optional(),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit"),
});

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(100).optional(),
  defaultBusinessId: z.string().uuid("Invalid business ID").nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
