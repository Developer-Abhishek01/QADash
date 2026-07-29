'use client';

import { TextField, TextFieldProps } from '@mui/material';
import { UseFormRegister, FieldError } from 'react-hook-form';

interface FormTextFieldProps extends Omit<TextFieldProps, 'name' | 'error'> {
  name: string;
  register: UseFormRegister<Record<string, unknown>>;
  error?: FieldError;
}

export function FormTextField({
  name,
  register,
  error,
  ...props
}: FormTextFieldProps) {
  const { onChange, onBlur, name: registerName, ref } = register(name);

  return (
    <TextField
      {...props}
      name={registerName}
      onChange={(e) => {
        onChange(e);
        props.onChange?.(e);
      }}
      onBlur={onBlur}
      ref={ref}
      error={!!error}
      helperText={error?.message}
    />
  );
}

type FormSelectProps = TextFieldProps & {
  name: string;
  register: UseFormRegister<Record<string, unknown>>;
  error?: FieldError;
  options: { value: string | number; label: string }[];
}

export function FormSelect({
  name,
  register,
  error,
  options,
  ...props
}: FormSelectProps) {
  const { onChange, onBlur, name: registerName, ref } = register(name);

  return (
    <TextField
      {...props}
      select
      SelectProps={{ native: true }}
      name={registerName}
      onChange={onChange}
      onBlur={onBlur}
      ref={ref}
      error={!!error}
      helperText={error?.message}
      inputProps={{
        ...props.inputProps,
        children: (
          <option value="">
            {props.label}
          </option>
        ),
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </TextField>
  );
}

interface FormCheckboxProps {
  name: string;
  register: UseFormRegister<Record<string, unknown>>;
  label: string;
  error?: FieldError;
}

export function FormCheckbox({ name, register, label, error }: FormCheckboxProps) {
  const { onChange, onBlur, ref } = register(name);

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="checkbox"
        onChange={(e) => onChange(e)}
        onBlur={onBlur}
        ref={ref}
      />
      <span>{label}</span>
      {error && <span style={{ color: 'red' }}>{error.message}</span>}
    </label>
  );
}