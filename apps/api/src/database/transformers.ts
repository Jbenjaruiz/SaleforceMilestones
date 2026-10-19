import { ValueTransformer } from 'typeorm';

/**
 * Calendar days travel as `YYYY-MM-DD` strings, with no time or time zone (F01 §5).
 * The driver returns DATE columns as Date objects at UTC midnight, so the UTC parts are the day.
 */
export const dateOnly: ValueTransformer = {
  to: (value?: string | null) => value ?? null,
  from: (value?: Date | string | null) => {
    if (value === null || value === undefined) return null;
    return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
  },
};
