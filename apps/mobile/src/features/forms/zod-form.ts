import { zodResolver } from '@hookform/resolvers/zod';
import {
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormSetError,
  useForm,
} from 'react-hook-form';
import type { z } from 'zod';
import { isApiError } from '@/services/api-error';

// A form validated by one of the shared schemas, the same ones the API uses, so the app and
// the server agree on what's valid. Errors show after a field is left ("touched"), then update
// as the user types. handleSubmit hands over the *parsed* values (email trimmed + lowercased).
export function useZodForm<In extends FieldValues, Out extends FieldValues>(
  schema: z.ZodType<Out, In>,
  defaultValues: DefaultValues<In>,
) {
  return useForm<In, unknown, Out>({
    resolver: zodResolver<In, unknown, Out>(schema),
    defaultValues,
    mode: 'onTouched',
  });
}

const FALLBACK = 'Something went wrong. Please try again.';

// Puts an API error where the user will look: per-field details on their fields, anything else
// on the form as a whole (`errors.root.server`). Returns the error code for screens that react
// to specific ones (e.g. EMAIL_TAKEN).
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | undefined {
  if (!isApiError(error)) {
    setError('root.server', { message: FALLBACK });
    return undefined;
  }
  const byField = error.fieldErrors();
  let placed = 0;
  for (const field of fields) {
    const message = byField[field];
    if (message) {
      setError(field, { message });
      placed += 1;
    }
  }
  if (placed === 0) setError('root.server', { message: error.message || FALLBACK });
  return error.code;
}
