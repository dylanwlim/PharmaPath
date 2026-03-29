"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthButton, AuthInput } from "@/components/auth/auth-primitives";
import { cn } from "@/lib/utils";

type PasswordInputProps = React.ComponentProps<typeof AuthInput>;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <AuthInput
        type={showPassword ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      <AuthButton
        type="button"
        variant="ghost"
        className="absolute right-0 top-0 h-full px-3 py-2"
        onClick={() => setShowPassword((value) => !value)}
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </AuthButton>
    </div>
  );
}
