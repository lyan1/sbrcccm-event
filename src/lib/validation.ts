import { z } from "zod";

export const createMemberSchema = z
  .object({
    displayName: z.string().min(1).max(200),
    phone: z.string().max(50).optional(),
    email: z.string().email().optional().or(z.literal("")),
    notes: z.string().max(1000).optional(),
    familyId: z.string().min(1).optional(),
    newFamilyDisplayName: z.string().min(1).max(200).optional(),
  })
  .refine((data) => !(data.familyId && data.newFamilyDisplayName), {
    message: "Provide either familyId or newFamilyDisplayName, not both",
  });

export const createFamilySchema = z.object({
  displayName: z.string().min(1).max(200),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

export const updateFamilySchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  notes: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const bulkRegistrationSchema = z.object({
  memberAccountId: z.string().min(1),
  items: z
    .array(
      z.object({
        eventId: z.string().min(1),
        participantCount: z.number().int().positive(),
      })
    )
    .min(1),
});

export const updateRegistrationSchema = z.object({
  registeredParticipantCount: z.number().int().positive(),
});

export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const eventLocationSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
});

export const createEventSchema = z.object({
  title: z.string().max(200).optional(),
  eventDate: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  locationName: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
});

export const bulkEventsSchema = z.object({
  events: z.array(createEventSchema).min(1),
});

export const paymentSchema = z.object({
  amountCents: z.number().int().positive(),
  paymentMethod: z.enum(["ZELLE", "VENMO", "CASH", "CHECK", "OTHER"]),
  description: z.string().max(500).optional(),
});

export const adjustmentSchema = z.object({
  amountCents: z.number().int(),
  description: z.string().min(1).max(500),
});

export const settlementSchema = z.object({
  totalCostCents: z.number().int().min(0),
  items: z.array(
    z.object({
      registrationId: z.string().min(1),
      actualParticipantCount: z.number().int().min(0),
      overrideDeductionCents: z.number().int().min(0).nullable().optional(),
    })
  ),
});

export const actualCountSchema = z.object({
  actualParticipantCount: z.number().int().min(0),
  adminNote: z.string().max(500).optional(),
});

export const promotionalCardSchema = z.object({
  titleZh: z.string().min(1).max(200),
  titleEn: z.string().max(200).optional().nullable(),
  descriptionZh: z.string().max(2000).optional().nullable(),
  descriptionEn: z.string().max(2000).optional().nullable(),
  linkUrl: z.string().url().optional().nullable().or(z.literal("")),
  linkLabelZh: z.string().max(100).optional().nullable(),
  linkLabelEn: z.string().max(100).optional().nullable(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  isVisible: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export const singleRegistrationSchema = z.object({
  memberAccountId: z.string().min(1),
  eventId: z.string().min(1),
  participantCount: z.number().int().positive(),
});

export const siteContentBlockSchema = z.object({
  key: z.enum(["PICKLEBALL_PURPOSE", "USAGE_INSTRUCTIONS"]),
  contentZh: z.string().min(1).max(5000),
  contentEn: z.string().min(1).max(5000),
});

export const siteContentUpdateSchema = z.object({
  blocks: z.array(siteContentBlockSchema).min(1),
});

export const updateMemberSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  notes: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
  familyId: z.string().min(1).nullable().optional(),
});
