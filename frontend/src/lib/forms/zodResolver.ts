import { zodResolver } from '@hookform/resolvers/zod';
import type { Resolver, UseFormProps } from 'react-hook-form';
import type { z } from 'zod';
import { jaErrorMap } from './errorMessages';

export type InferFormValues<S extends z.ZodTypeAny> = z.infer<S>;

export function createResolver<TSchema extends z.ZodTypeAny>(
  schema: TSchema
): Resolver<z.infer<TSchema>> {
  return zodResolver(schema, { errorMap: jaErrorMap }) as Resolver<z.infer<TSchema>>;
}

export const defaultFormOptions: Pick<UseFormProps, 'mode' | 'reValidateMode' | 'criteriaMode'> = {
  mode: 'onBlur',
  reValidateMode: 'onChange',
  criteriaMode: 'firstError',
};
