"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Measures a container so charts can render at real pixels — no
 * `preserveAspectRatio="none"` distortion, and correct pointer→data math for
 * hover layers. SSR-safe: starts at `fallback`, snaps to the measured width on
 * mount, tracks resize.
 */
export function useChartSize(fallback = 640) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [width, setWidth] = useState(fallback);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => {
            const w = el.clientWidth;
            if (w > 0) setWidth(w);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return { ref, width };
}
