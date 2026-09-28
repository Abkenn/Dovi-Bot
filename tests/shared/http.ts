export const getRequest = (value: unknown): Request => {
  if (!(value instanceof Request)) {
    throw new Error('Expected an HTTP Request.');
  }
  return value;
};
