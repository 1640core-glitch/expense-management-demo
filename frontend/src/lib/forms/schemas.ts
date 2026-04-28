import { z } from 'zod';
import { formatLabel } from './errorMessages';

interface StringOpts {
  min?: number;
  max?: number;
}

export function requiredString(label: string, opts?: StringOpts): z.ZodString {
  let s = z.string({ required_error: formatLabel(label, 'required') });
  s = s.min(1, formatLabel(label, 'required'));
  if (opts?.min !== undefined) {
    s = s.min(opts.min, formatLabel(label, 'minLength', { min: opts.min }));
  }
  if (opts?.max !== undefined) {
    s = s.max(opts.max, formatLabel(label, 'maxLength', { max: opts.max }));
  }
  return s;
}

export function optionalString(opts?: { max?: number }): z.ZodOptional<z.ZodString> {
  let s = z.string();
  if (opts?.max !== undefined) {
    s = s.max(opts.max, `${opts.max}文字以内で入力してください`);
  }
  return s.optional();
}

interface NumberOpts {
  min?: number;
  max?: number;
  positive?: boolean;
  integer?: boolean;
}

function buildNumber(label: string, base: z.ZodNumber, opts?: NumberOpts): z.ZodNumber {
  let n = base;
  if (opts?.integer) {
    n = n.int(formatLabel(label, 'integer'));
  }
  if (opts?.positive) {
    n = n.positive(formatLabel(label, 'positive'));
  }
  if (opts?.min !== undefined) {
    n = n.min(opts.min, `${label}は${opts.min}以上で入力してください`);
  }
  if (opts?.max !== undefined) {
    n = n.max(opts.max, `${label}は${opts.max}以下で入力してください`);
  }
  return n;
}

export function requiredNumber(label: string, opts?: NumberOpts): z.ZodNumber {
  const base = z.number({
    required_error: formatLabel(label, 'required'),
    invalid_type_error: formatLabel(label, 'required'),
  });
  return buildNumber(label, base, opts);
}

export function requiredNumberFromInput(label: string, opts?: NumberOpts): z.ZodNumber {
  const base = z.coerce.number({
    required_error: formatLabel(label, 'required'),
    invalid_type_error: formatLabel(label, 'required'),
  });
  return buildNumber(label, base, opts);
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function requiredDate(label: string): z.ZodType<string> {
  return z
    .string({ required_error: formatLabel(label, 'required') })
    .min(1, formatLabel(label, 'required'))
    .regex(DATE_PATTERN, formatLabel(label, 'invalidDate'))
    .refine((v) => !Number.isNaN(new Date(v).getTime()), {
      message: formatLabel(label, 'invalidDate'),
    });
}

export function requiredSelect<T extends number | string>(label: string): z.ZodType<T> {
  return z
    .union([z.string(), z.number()])
    .refine(
      (v) => {
        if (v === '' || v === null || v === undefined) return false;
        if (typeof v === 'number' && v === 0) return false;
        return true;
      },
      { message: formatLabel(label, 'required') }
    ) as unknown as z.ZodType<T>;
}
