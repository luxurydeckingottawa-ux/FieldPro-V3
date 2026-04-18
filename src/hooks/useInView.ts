import { useEffect, useRef, useState } from 'react';

/**
 * IntersectionObserver hook — returns a ref + boolean that flips true the first
 * time the element scrolls into view. Used for scroll-triggered CSS reveal
 * animations on the customer portal without pulling in framer-motion.
 *
 * @param rootMargin  Offsets the IO rect. Default '-10% 0px -10% 0px' fires
 *                    slightly before/after the element is fully visible.
 * @param once        When true, stops observing after the first intersection.
 */
export function useInView<T extends Element = HTMLDivElement>(
  rootMargin: string = '-10% 0px -10% 0px',
  once: boolean = true,
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      // Server-side fallback: show content immediately.
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        });
      },
      { rootMargin, threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, once]);

  return [ref, inView];
}

/**
 * Tracks the currently-active section index based on which section scroll-owns
 * the middle ~5% band of the viewport. Used for sticky-nav highlighting.
 */
export function useCurrentSection(
  sectionIds: string[],
  rootMargin: string = '-40% 0px -55% 0px',
): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const visibility = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibility.set(entry.target.id, entry.isIntersecting);
        });
        // Pick the first section in order that is currently intersecting.
        for (const id of sectionIds) {
          if (visibility.get(id)) {
            setActive(id);
            return;
          }
        }
      },
      { rootMargin, threshold: 0 },
    );
    for (const id of sectionIds) {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [sectionIds.join(','), rootMargin]); // eslint-disable-line react-hooks/exhaustive-deps

  return active;
}

/**
 * Tweens a number from 0 to target value over `duration` ms, but only after
 * the return-ref element is in view. Used for the Payment Schedule dollar
 * count-up. Uses requestAnimationFrame for 60fps.
 */
export function useCountUp(target: number, duration: number = 1400): [React.RefObject<HTMLSpanElement>, number] {
  const [ref, inView] = useInView<HTMLSpanElement>('-20% 0px -20% 0px', true);
  const [value, setValue] = useState(0);
  const prevTarget = useRef<number>(0);

  useEffect(() => {
    if (!inView) return;
    const from = prevTarget.current;
    const to = target;
    if (from === to) return;
    prevTarget.current = to;

    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  return [ref, value];
}
