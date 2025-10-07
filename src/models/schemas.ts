/**
 * Zod validation schemas for Education Data API requests
 *
 * These schemas enforce all validation rules from data-model.md:
 * - Required fields
 * - Type validation
 * - Range constraints
 * - Pattern matching (regex)
 * - String length limits
 */

import { z } from 'zod';
import { API_LIMITS, VALIDATION } from '../config/constants.js';

/**
 * Schema for education data requests (get_education_data tool)
 */
export const EducationDataRequestSchema = z.object({
  level: z
    .string()
    .min(1, 'Level is required')
    .max(VALIDATION.MAX_STRING_LENGTH, `Level must not exceed ${VALIDATION.MAX_STRING_LENGTH} characters`)
    .regex(
      VALIDATION.LEVEL_PATTERN,
      'Level must contain only lowercase letters and hyphens',
    ),

  source: z
    .string()
    .min(1, 'Source is required')
    .max(
      VALIDATION.MAX_STRING_LENGTH,
      `Source must not exceed ${VALIDATION.MAX_STRING_LENGTH} characters`,
    )
    .regex(
      VALIDATION.SOURCE_PATTERN,
      'Source must contain only lowercase letters',
    ),

  topic: z
    .string()
    .min(1, 'Topic is required')
    .max(VALIDATION.MAX_STRING_LENGTH, `Topic must not exceed ${VALIDATION.MAX_STRING_LENGTH} characters`)
    .regex(
      VALIDATION.TOPIC_PATTERN,
      'Topic must contain only lowercase letters and hyphens',
    ),

  subtopic: z
    .array(
      z
        .string()
        .min(1)
        .max(
          VALIDATION.MAX_STRING_LENGTH,
          `Subtopic must not exceed ${VALIDATION.MAX_STRING_LENGTH} characters`,
        ),
    )
    .optional(),

  filters: z
    .record(
      z.string(),
      z.union([
        z.string().max(VALIDATION.MAX_STRING_LENGTH),
        z.number(),
        z.array(z.string().max(VALIDATION.MAX_STRING_LENGTH)),
        z.array(z.number()),
      ]),
    )
    .optional(),

  add_labels: z.boolean().optional().default(false),

  limit: z
    .number()
    .int('Limit must be an integer')
    .positive('Limit must be positive')
    .max(API_LIMITS.MAX_LIMIT, `Limit must not exceed ${API_LIMITS.MAX_LIMIT}`)
    .optional()
    .default(API_LIMITS.DEFAULT_LIMIT),
});

/**
 * Schema for summary data requests (get_education_data_summary tool)
 */
export const SummaryDataRequestSchema = z.object({
  level: z
    .string()
    .min(1, 'Level is required')
    .max(VALIDATION.MAX_STRING_LENGTH, `Level must not exceed ${VALIDATION.MAX_STRING_LENGTH} characters`)
    .regex(
      VALIDATION.LEVEL_PATTERN,
      'Level must contain only lowercase letters and hyphens',
    ),

  source: z
    .string()
    .min(1, 'Source is required')
    .max(
      VALIDATION.MAX_STRING_LENGTH,
      `Source must not exceed ${VALIDATION.MAX_STRING_LENGTH} characters`,
    )
    .regex(
      VALIDATION.SOURCE_PATTERN,
      'Source must contain only lowercase letters',
    ),

  topic: z
    .string()
    .min(1, 'Topic is required')
    .max(VALIDATION.MAX_STRING_LENGTH, `Topic must not exceed ${VALIDATION.MAX_STRING_LENGTH} characters`)
    .regex(
      VALIDATION.TOPIC_PATTERN,
      'Topic must contain only lowercase letters and hyphens',
    ),

  subtopic: z
    .string()
    .min(1)
    .max(
      VALIDATION.MAX_STRING_LENGTH,
      `Subtopic must not exceed ${VALIDATION.MAX_STRING_LENGTH} characters`,
    )
    .optional(),

  stat: z
    .string()
    .min(1, 'Stat is required')
    .max(VALIDATION.MAX_STRING_LENGTH, `Stat must not exceed ${VALIDATION.MAX_STRING_LENGTH} characters`),

  var: z
    .string()
    .min(1, 'Var is required')
    .max(VALIDATION.MAX_STRING_LENGTH, `Var must not exceed ${VALIDATION.MAX_STRING_LENGTH} characters`),

  by: z
    .array(
      z
        .string()
        .min(1)
        .max(
          VALIDATION.MAX_STRING_LENGTH,
          `By field must not exceed ${VALIDATION.MAX_STRING_LENGTH} characters`,
        ),
    )
    .min(1, 'At least one grouping field (by) is required'),

  filters: z
    .record(
      z.string(),
      z.union([
        z.string().max(VALIDATION.MAX_STRING_LENGTH),
        z.number(),
        z.array(z.string().max(VALIDATION.MAX_STRING_LENGTH)),
        z.array(z.number()),
      ]),
    )
    .optional(),
});

/**
 * Infer TypeScript types from schemas
 */
export type ValidatedEducationDataRequest = z.infer<typeof EducationDataRequestSchema>;
export type ValidatedSummaryDataRequest = z.infer<typeof SummaryDataRequestSchema>;
