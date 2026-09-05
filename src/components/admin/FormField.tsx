"use client";

import { useState } from "react";
import { FaExclamationCircle, FaCheckCircle } from "react-icons/fa";

interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "tel" | "number" | "url" | "date" | "textarea";
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  touched?: boolean;
  success?: string;
  helperText?: string;
  className?: string;
  autoComplete?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
}

export function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  error,
  touched = false,
  success,
  helperText,
  className = "",
  autoComplete,
  min,
  max,
  step,
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  const showError = touched && error;
  const showSuccess = touched && !error && success;
  const isValid = touched && !error && value;

  const getBorderColor = () => {
    if (showError) return "border-red-400 focus:border-red-500";
    if (showSuccess || isValid) return "border-green-400 focus:border-green-500";
    if (focused) return "border-primary focus:border-primary";
    return "border-gray-200 focus:border-primary";
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {type === "textarea" ? (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            onFocus={() => setFocused(true)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            rows={4}
            className={`w-full px-4 py-3 rounded-xl border bg-white transition-colors outline-none resize-none ${getBorderColor()} ${
              disabled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""
            }`}
          />
        ) : (
          <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            onFocus={() => setFocused(true)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete={autoComplete}
            min={min}
            max={max}
            step={step}
            className={`w-full px-4 py-3 rounded-xl border bg-white transition-colors outline-none ${getBorderColor()} ${
              disabled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""
            }`}
          />
        )}

        {/* Status Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {showError && <FaExclamationCircle className="text-red-500 w-5 h-5 animate-shake" />}
          {isValid && <FaCheckCircle className="text-green-500 w-5 h-5" />}
        </div>
      </div>

      {/* Helper Text / Error Message */}
      <div className="min-h-[1.25rem]">
        {showError && (
          <p className="text-sm text-red-500 flex items-center gap-1 animate-slide-in">
            {error}
          </p>
        )}
        {!showError && showSuccess && (
          <p className="text-sm text-green-600 flex items-center gap-1">
            {success}
          </p>
        )}
        {!showError && !showSuccess && helperText && (
          <p className="text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    </div>
  );
}

// Select Field with validation
interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  touched?: boolean;
  helperText?: string;
  className?: string;
}

export function SelectField({
  label,
  name,
  value,
  onChange,
  onBlur,
  options,
  placeholder = "Select an option",
  required = false,
  disabled = false,
  error,
  touched = false,
  helperText,
  className = "",
}: SelectFieldProps) {
  const [focused, setFocused] = useState(false);

  const showError = touched && error;
  const showSuccess = touched && !error;

  const getBorderColor = () => {
    if (showError) return "border-red-400 focus:border-red-500";
    if (showSuccess) return "border-green-400 focus:border-green-500";
    if (focused) return "border-primary focus:border-primary";
    return "border-gray-200 focus:border-primary";
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          onFocus={() => setFocused(true)}
          disabled={disabled}
          required={required}
          className={`w-full px-4 py-3 rounded-xl border bg-white transition-colors outline-none appearance-none cursor-pointer ${getBorderColor()} ${
            disabled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""
          }`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Chevron */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Status Icons */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          {showError && <FaExclamationCircle className="text-red-500 w-5 h-5" />}
          {showSuccess && !showError && <FaCheckCircle className="text-green-500 w-5 h-5" />}
        </div>
      </div>

      {/* Helper Text / Error Message */}
      <div className="min-h-[1.25rem]">
        {showError && (
          <p className="text-sm text-red-500 flex items-center gap-1">{error}</p>
        )}
        {!showError && helperText && (
          <p className="text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    </div>
  );
}

// Validation helper functions
export function validateEmail(email: string): string | undefined {
  if (!email) return undefined;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  return undefined;
}

export function validateRequired(value: string, fieldName: string): string | undefined {
  if (!value || value.trim() === "") {
    return `${fieldName} is required`;
  }
  return undefined;
}

export function validatePhone(phone: string): string | undefined {
  if (!phone) return undefined;
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
  if (!phoneRegex.test(phone)) {
    return "Please enter a valid phone number";
  }
  return undefined;
}

export function validateMinLength(value: string, minLength: number, fieldName: string): string | undefined {
  if (value && value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  return undefined;
}

export function validateMaxLength(value: string, maxLength: number, fieldName: string): string | undefined {
  if (value && value.length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters`;
  }
  return undefined;
}