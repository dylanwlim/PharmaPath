"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motionEase, motionTiming } from "@/lib/motion";

export function PageEntry({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <motion.main
      key={`page:${pathname}`}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 0.46, ease: [0.22, 1, 0.36, 1] }
      }
      className={cn("will-change-transform", className)}
    >
      {children}
    </motion.main>
  );
}

export function FooterEntry({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [shouldAnimateOnScroll, setShouldAnimateOnScroll] = useState(false);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(true);

  useEffect(() => {
    const node = footerRef.current;
    if (!node || typeof window === "undefined") {
      return () => undefined;
    }

    let observer: IntersectionObserver | null = null;
    const frameId = window.requestAnimationFrame(() => {
      const prefersReducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        setShouldAnimateOnScroll(false);
        setHasEnteredViewport(true);
        return;
      }

      const rect = node.getBoundingClientRect();
      const isVisibleOnLoad =
        rect.bottom > 0 && rect.top < window.innerHeight * 1.05;

      if (isVisibleOnLoad) {
        setShouldAnimateOnScroll(false);
        setHasEnteredViewport(true);
        return;
      }

      setShouldAnimateOnScroll(true);
      setHasEnteredViewport(false);

      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) {
            return;
          }

          setHasEnteredViewport(true);
          observer?.disconnect();
        },
        {
          threshold: 0.18,
          rootMargin: "0px 0px -6% 0px",
        },
      );

      observer.observe(node);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, [pathname]);

  const animateFooterIn = shouldAnimateOnScroll && !hasEnteredViewport;

  return (
    <motion.div
      ref={footerRef}
      key={`footer:${pathname}`}
      initial={false}
      animate={animateFooterIn ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
      transition={
        shouldAnimateOnScroll
          ? {
              duration: motionTiming.reveal * 0.82,
              ease: motionEase.reveal,
            }
          : undefined
      }
      className={cn("site-footer-static will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
}
