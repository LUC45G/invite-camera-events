"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Slide = {
  image: string;
  alt: string;
  heading: string;
  paragraphs: string[];
};

type Props = {
  slides: Slide[];
};

const rotations = [-4, 3, -2];
const offsets = [
  { x: 0, y: 0 },
  { x: 12, y: -8 },
  { x: -8, y: 6 },
];

export function Slideshow({ slides }: Props) {
  const [active, setActive] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReady(true);
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Desktop: track wrapper in viewport + scroll progress
  useEffect(() => {
    if (isMobile || !ready) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        setPinned(entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(wrapper);

    function onScroll() {
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) return;
      const progress = Math.max(0, Math.min(1, (vh - rect.bottom) / vh));
      const idx = Math.min(Math.round(progress * slides.length), slides.length - 1);
      setActive(idx);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [isMobile, ready, slides.length]);

  // Mobile: track horizontal scroll
  useEffect(() => {
    if (!isMobile || !ready) return;
    const el = carouselRef.current;
    if (!el) return;
    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const cur = carouselRef.current;
        if (!cur) { ticking = false; return; }
        const idx = Math.round(cur.scrollLeft / cur.offsetWidth);
        setActive(Math.max(0, Math.min(idx, slides.length - 1)));
        ticking = false;
      });
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isMobile, ready, slides.length]);

  function scrollTo(idx: number) {
    if (isMobile) {
      const el = carouselRef.current;
      if (!el) return;
      el.scrollTo({ left: idx * el.offsetWidth, behavior: "smooth" });
    } else {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const target = wrapper.offsetTop + (idx / slides.length) * window.innerHeight;
      window.scrollTo({ top: target, behavior: "smooth" });
    }
  }

  // Nav buttons
  const nav = (
    <div className="flex items-center gap-6">
      <button
        type="button"
        onClick={() => scrollTo(Math.max(0, active - 1))}
        disabled={active === 0}
        aria-label="Anterior"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/20 bg-ivory text-xl text-ink transition-colors hover:border-bronze hover:text-bronze disabled:opacity-30"
      >
        ←
      </button>
      <span className="font-sans text-sm text-ink/50">
        {active + 1} / {slides.length}
      </span>
      <button
        type="button"
        onClick={() => scrollTo(Math.min(slides.length - 1, active + 1))}
        disabled={active === slides.length - 1}
        aria-label="Siguiente"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/20 bg-ivory text-xl text-ink transition-colors hover:border-bronze hover:text-bronze disabled:opacity-30"
      >
        →
      </button>
    </div>
  );

  if (!ready) return <div className="h-dvh" />;

  // --- MOBILE ---
  if (isMobile) {
    return (
      <div className="relative">
        {/* Polaroid stack */}
        <div className="relative mx-auto flex h-72 w-64 items-center justify-center sm:h-80 sm:w-72">
          {slides.map((s, i) => {
            if (i > active) return null;
            const isCurrent = i === active;
            const rot = rotations[i % rotations.length];
            const off = offsets[i % offsets.length];
            return (
              <div
                key={i}
                className="polaroid absolute inset-0 transition-all duration-500"
                style={{
                  zIndex: i + 1,
                  opacity: isCurrent ? 1 : 0.5,
                  transform: isCurrent
                    ? `rotate(${rot}deg) translate(${off.x}px, ${off.y}px)`
                    : "rotate(0deg) scale(0.9)",
                }}
              >
                <div className="relative h-64 w-64 overflow-hidden sm:h-72 sm:w-72">
                  <Image
                    src={s.image}
                    alt={s.alt}
                    fill
                    sizes="18rem"
                    className="object-cover"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Text carousel */}
        <div
          ref={carouselRef}
          className="flex overflow-x-auto snap-x snap-mandatory"
          style={{ height: "40dvh", scrollbarWidth: "none" }}
        >
          {slides.map((s, i) => (
            <div
              key={i}
              className="h-full w-full flex-shrink-0 snap-center flex items-center justify-center px-6"
            >
              <div className="flex flex-col items-center text-center">
                <h2
                  className="font-serif text-4xl text-ink sm:text-5xl"
                  style={{ textWrap: "balance" }}
                >
                  {s.heading}
                </h2>
                {s.paragraphs.map((p) => (
                  <p
                    key={p.slice(0, 20)}
                    className="mt-4 text-lg leading-relaxed text-ink/75 sm:text-xl"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Nav */}
        <div className="flex justify-center py-4">{nav}</div>
      </div>
    );
  }

  // --- DESKTOP: render carousel only when wrapper in view ---
  return (
    <>
      <div ref={wrapperRef} className="h-dvh" />

      {inView && (
        <div
          className={`fixed inset-0 z-40 flex items-center justify-center transition-opacity duration-300 ${
            pinned ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {/* Polaroid stack — left */}
          <div className="absolute left-[8%] top-1/2 h-80 w-80 -translate-y-1/2 overflow-hidden xl:left-[15%]">
            {slides.map((s, i) => {
              if (i > active) return null;
              const isCurrent = i === active;
              const rot = rotations[i % rotations.length];
              const off = offsets[i % offsets.length];
              return (
                <div
                  key={i}
                  className="polaroid absolute inset-0 transition-all duration-500"
                  style={{
                    zIndex: i + 1,
                    opacity: isCurrent ? 1 : 0.5,
                    transform: isCurrent
                      ? `rotate(${rot}deg) translate(${off.x}px, ${off.y}px)`
                      : "rotate(0deg) scale(0.9)",
                  }}
                >
                  <div className="relative h-72 w-72 overflow-hidden xl:h-80 xl:w-80">
                    <Image
                      src={s.image}
                      alt={s.alt}
                      fill
                      sizes="20rem"
                      className="object-cover"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Texto — right */}
          <div className="ml-auto flex h-full w-1/2 flex-col justify-center pr-[8%] xl:pr-[15%]">
            <div className="max-w-md">
              <h2
                className="font-serif text-5xl text-ink"
                style={{ textWrap: "balance" }}
              >
                {slides[active].heading}
              </h2>
              {slides[active].paragraphs.map((p) => (
                <p
                  key={p.slice(0, 20)}
                  className="mt-4 text-xl leading-relaxed text-ink/75"
                >
                  {p}
                </p>
              ))}
            </div>
          </div>

          {/* Nav */}
          <div className="absolute inset-x-0 bottom-8 flex justify-center">
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
