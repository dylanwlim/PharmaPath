"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { motionEase, motionTiming } from "@/lib/motion";

let hasCompletedInitialPageHydration = false;

export function PageTransitionShell({
  children,
}: {
  children: ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimateOnMount =
    !prefersReducedMotion && hasCompletedInitialPageHydration;

  useEffect(() => {
    hasCompletedInitialPageHydration = true;
  }, []);

  return (
    <motion.main
      initial={shouldAnimateOnMount ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={
        !shouldAnimateOnMount
          ? { duration: 0 }
          : {
              duration: motionTiming.base + 0.1,
              ease: motionEase.standard,
            }
      }
      style={shouldAnimateOnMount ? { willChange: "transform, opacity" } : undefined}
    >
      {children}
    </motion.main>
  );
}
