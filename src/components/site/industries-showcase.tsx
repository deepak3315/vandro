import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import technologyImage from "@/assets/team.jpg";
import financeImage from "@/assets/industry-finance.jpg";
import educationImage from "@/assets/industry-education.jpg";
import retailImage from "@/assets/industry-retail.jpg";

const industries = [
  {
    title: "Technology",
    description: "Software, IT talent, and technology solutions.",
    image: technologyImage,
    alt: "Technology professionals collaborating around a laptop",
  },
  {
    title: "Finance",
    description:
      "Technology talent and solutions for finance-related businesses.",
    image: financeImage,
    alt: "Modern financial district towers viewed from below",
  },
  {
    title: "Education & Training",
    description:
      "Practical, industry-focused technology training and skill development.",
    image: educationImage,
    alt: "Students collaborating in a university library",
  },
  {
    title: "Retail & E-commerce",
    description: "Digital commerce, retail technology, and related talent.",
    image: retailImage,
    alt: "Retail customer making a contactless purchase",
  },
];

export function IndustriesShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const pausedRef = useRef(false);
  const [desktop, setDesktop] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeIndex, setActiveIndex] = useState(1);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updatePosition = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const startOffset =
      Number.parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const scrollRange = Math.max(0, maxScroll - startOffset);
    const progress = scrollRange
      ? Math.max(0, (viewport.scrollLeft - startOffset) / scrollRange)
      : 0;
    const atEnd = maxScroll === 0 || maxScroll - viewport.scrollLeft <= 1;
    const index =
      atEnd && maxScroll
        ? industries.length
        : scrollRange
          ? Math.min(
              industries.length,
              Math.floor(progress * (industries.length - 1)) + 1,
            )
          : 1;

    setAtStart(viewport.scrollLeft <= startOffset + 1);
    setAtEnd(atEnd);
    setActiveIndex((current) => (current === index ? current : index));
    if (progressRef.current) {
      progressRef.current.style.transform = `scaleX(${progress})`;
    }
  }, []);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 768px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreferences = () => {
      setDesktop(desktopQuery.matches);
      setViewportWidth(window.innerWidth);
      setReducedMotion(motionQuery.matches);
      if (motionQuery.matches) pausedRef.current = true;
      else if (
        !sectionRef.current?.matches(":hover") &&
        !sectionRef.current?.contains(document.activeElement)
      )
        pausedRef.current = false;
    };

    syncPreferences();
    desktopQuery.addEventListener("change", syncPreferences);
    motionQuery.addEventListener("change", syncPreferences);
    window.addEventListener("resize", syncPreferences);
    return () => {
      desktopQuery.removeEventListener("change", syncPreferences);
      motionQuery.removeEventListener("change", syncPreferences);
      window.removeEventListener("resize", syncPreferences);
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollLeft = 0;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [updatePosition]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!desktop || reducedMotion || !viewport || !track) return;
    if (viewport.scrollWidth <= viewport.clientWidth) return;

    let frame = 0;
    let previousTime = 0;
    const animate = (time: number) => {
      if (previousTime && !pausedRef.current) {
        const maxScroll = Math.max(
          0,
          viewport.scrollWidth - viewport.clientWidth,
        );
        viewport.scrollLeft = Math.min(
          maxScroll,
          viewport.scrollLeft + (time - previousTime) * 0.012,
        );
      }
      previousTime = time;
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [desktop, reducedMotion, viewportWidth]);

  const move = (direction: -1 | 1) => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const card = track?.querySelector<HTMLElement>(".industry-card");
    if (!viewport || !track || !card) return;
    if ((direction < 0 && atStart) || (direction > 0 && atEnd)) return;

    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = card.offsetWidth + gap;
    viewport.scrollBy({
      left: direction * step,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  const pause = () => {
    pausedRef.current = true;
  };

  const resumeIfUnfocused = (target: EventTarget | null) => {
    const section = sectionRef.current;
    if (
      reducedMotion ||
      section?.matches(":hover") ||
      section?.contains(document.activeElement) ||
      (target instanceof Node && section?.contains(target))
    )
      return;
    pausedRef.current = false;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    }
  };

  return (
    <section
      className="industry-showcase"
      ref={sectionRef}
      onPointerEnter={pause}
      onPointerLeave={() => {
        if (
          !reducedMotion &&
          !sectionRef.current?.contains(document.activeElement)
        ) {
          pausedRef.current = false;
        }
      }}
      onFocusCapture={pause}
      onBlurCapture={(event) => resumeIfUnfocused(event.relatedTarget)}
    >
      <div className="shell">
        <div className="industry-showcase-heading">
          <div className="industry-showcase-title">
            <div className="section-label">
              <span />
              INDUSTRIES WE SERVE
            </div>
            <h2>
              Different industries.
              <br />
              <span>Shared ambition.</span>
            </h2>
          </div>
          <div className="industry-showcase-intro">
            <p>
              A thoughtful approach to the unique challenges of every sector. We
              connect talent, build capabilities, and enable technology that
              drives real progress.
            </p>
            <div
              className="industry-showcase-controls"
              aria-label="Industry carousel controls"
            >
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Previous industries"
                disabled={atStart}
              >
                <ArrowLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="Next industries"
                disabled={atEnd}
              >
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="industry-carousel"
        ref={viewportRef}
        role="region"
        aria-label="Industries, horizontally scrolling"
        tabIndex={0}
        onScroll={updatePosition}
        onKeyDown={handleKeyDown}
      >
        <div className="industry-track" ref={trackRef}>
          {industries.map((industry, index) => {
            const number = String(index + 1).padStart(2, "0");
            return (
              <Link
                to="/industries"
                className="industry-card"
                key={industry.title}
                aria-label={`${industry.title}: ${industry.description}`}
              >
                <img
                  src={industry.image}
                  alt=""
                  aria-hidden="true"
                  loading="eager"
                />
                <span className="industry-card-shade" aria-hidden="true" />
                <span className="industry-card-content">
                  <span className="industry-card-number" aria-hidden="true">
                    <span>{number}</span>
                    <span />
                  </span>
                  <span className="industry-card-title">
                    <span>{industry.title}</span>
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                  <span className="industry-card-description">
                    {industry.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="shell industry-showcase-footer">
        <div
          className="industry-progress"
          role="progressbar"
          aria-label="Industry carousel position"
          aria-valuemin={1}
          aria-valuemax={industries.length}
          aria-valuenow={activeIndex}
        >
          <span ref={progressRef} />
        </div>
        <span className="industry-position">
          {String(activeIndex).padStart(2, "0")} /{" "}
          {String(industries.length).padStart(2, "0")}
        </span>
      </div>
    </section>
  );
}
