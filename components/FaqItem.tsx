"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type Props = {
  question: string;
  answer: string;
};

export function FaqItem({ question, answer }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => setOpen(false);
    el.addEventListener("faq:close-others", handler);
    return () => el.removeEventListener("faq:close-others", handler);
  }, []);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        window.dispatchEvent(new CustomEvent("faq:close-others"));
      }
      return !prev;
    });
  }, []);

  return (
    <div ref={ref} className="border-b border-ink/10">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full cursor-pointer items-center justify-between py-4 text-left font-sans text-sm tracking-[0.2em] text-bronze uppercase"
        style={{ textWrap: "balance" }}
        aria-expanded={open}
      >
        {question}
        <span className={`ml-4 text-lg text-ink/40 transition-transform duration-200 ${open ? "rotate-45" : ""}`}>
          +
        </span>
      </button>
      <div className={`faq-content ${open ? "open" : ""}`}>
        <div className="overflow-hidden">
          <p className="pb-4 text-base leading-relaxed text-ink/70 sm:text-lg">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
