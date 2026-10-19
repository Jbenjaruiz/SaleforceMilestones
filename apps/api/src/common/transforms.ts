import { Transform } from 'class-transformer';

/** Trims strings before validation so "  " counts as empty. Non-strings pass through to the validators. */
export const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
