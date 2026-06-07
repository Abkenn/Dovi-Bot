import type { UnknownRecord } from 'type-fest';

export const isUnknownRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

export const getNumberProperty = (value: unknown, property: string) => {
  if (!isUnknownRecord(value)) {
    return null;
  }

  const propertyValue = value[property];

  return typeof propertyValue === 'number' ? propertyValue : null;
};
