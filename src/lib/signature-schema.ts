import { z } from "zod";

export const signatureSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80, "Name must be 80 characters or less."),
  company: z.string().trim().min(2, "Company must be at least 2 characters.").max(120, "Company must be 120 characters or less."),
  role: z.string().trim().min(2, "Role must be at least 2 characters.").max(120, "Role must be 120 characters or less."),
  email: z.string().trim().email("Enter a valid email address.").max(254, "Email must be 254 characters or less.")
});

export type SignatureInput = z.infer<typeof signatureSchema>;

export interface SignatureRecord extends SignatureInput {
  id: string;
  createdAt: string;
}