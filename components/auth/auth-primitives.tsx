"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export function AuthButton({
  className,
  variant = "default",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-4 focus-visible:ring-[#156d95]/15",
        variant === "default" &&
          "bg-slate-950 text-white hover:bg-slate-900",
        variant === "outline" &&
          "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
        variant === "ghost" &&
          "bg-transparent text-slate-500 hover:bg-transparent hover:text-slate-900",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export const authInputClasses =
  "file:text-foreground placeholder:text-slate-400 selection:bg-[#156d95] selection:text-white border border-slate-200 h-12 w-full min-w-0 rounded-md bg-white px-3 py-1 text-base text-slate-950 shadow-xs transition-[color,box-shadow,transform] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-[#156d95] focus-visible:ring-[3px] focus-visible:ring-[#156d95]/12";

export const AuthInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return <input ref={ref} type={type} className={cn(authInputClasses, className)} {...props} />;
  },
);

AuthInput.displayName = "AuthInput";

export function AuthLabel({
  className,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { children: ReactNode }) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium text-slate-900",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function AuthCheckbox({
  className,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
}) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-3 text-sm text-slate-700", className)}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-[#156d95] focus:ring-[#156d95]"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
