import { ValueTransformer } from 'typeorm';

/** PostgreSQL returns NUMERIC columns as strings; the API works with numbers. */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number.parseFloat(value),
};
