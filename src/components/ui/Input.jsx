import React, { useState, useRef, useEffect, useId } from 'react';

export default function Input({
  label,
  error,
  type = 'text',
  icon,
  className = '',
  id,
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  disabled = false,
  required = false,
  placeholder,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const inputRef = useRef(null);

  const [isFocused, setIsFocused] = useState(false);
  const [internalVal, setInternalVal] = useState(value ?? defaultValue ?? '');

  useEffect(() => {
    if (value !== undefined) {
      setInternalVal(value);
    }
  }, [value]);

  const hasValue = internalVal !== undefined && internalVal !== null && String(internalVal).length > 0;
  const isFloating = isFocused || hasValue || Boolean(placeholder);

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    // Sync with DOM ref in case value changed without onChange
    if (inputRef.current) {
      setInternalVal(inputRef.current.value);
    }
    onBlur?.(e);
  };

  const handleChange = (e) => {
    if (value === undefined) {
      setInternalVal(e.target.value);
    }
    onChange?.(e);
  };

  const borderColor = error
    ? 'border-wine-light focus-within:border-wine-light focus-within:ring-1 focus-within:ring-wine-light/40'
    : 'border-gold/25 focus-within:border-gold focus-within:ring-1 focus-within:ring-gold/40';

  const labelColor = error
    ? 'text-wine-light'
    : isFocused
    ? 'text-gold'
    : 'text-cream/60';

  return (
    <div className={`w-full font-sans ${className}`}>
      <div
        className={`relative flex items-center rounded-lg bg-midnight-light transition-all ${borderColor} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {icon ? (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-cream/50">
            {icon}
          </div>
        ) : null}

        <input
          ref={inputRef}
          id={inputId}
          type={type}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          placeholder={isFloating ? placeholder : ''}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`w-full bg-transparent py-3 px-3.5 text-sm text-cream placeholder-cream/20 outline-none rounded-lg font-sans ${
            icon ? 'pl-10' : 'pl-3.5'
          }`}
          {...props}
        />

        {label ? (
          <label
            htmlFor={inputId}
            className={`absolute transition-all duration-200 select-none pointer-events-none ${
              isFloating
                ? `-top-2.5 left-3 text-xs px-1.5 bg-midnight-light rounded font-medium ${labelColor}`
                : `top-1/2 -translate-y-1/2 text-sm text-cream/40 ${icon ? 'left-10' : 'left-3.5'}`
            }`}
          >
            {label}
            {required ? <span className="text-wine-light ml-0.5">*</span> : null}
          </label>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-wine-light font-sans" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { Input };
