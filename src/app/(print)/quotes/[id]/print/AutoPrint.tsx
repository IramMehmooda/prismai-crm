"use client";

import { useEffect } from "react";

export default function AutoPrint() {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      window.print();
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return null;
}