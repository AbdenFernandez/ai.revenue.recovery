import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const isoDateTimeSchema = z.string().datetime();

export const emailSchema = z.string().email().max(320);

export const nonEmptyStringSchema = z.string().trim().min(1);
