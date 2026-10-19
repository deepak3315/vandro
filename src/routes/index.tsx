import video from "@/assets/vandro-hero.webm";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowDown, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteLayout, SectionLabel } from "@/components/site/layout";
import { ServicesOverview } from "@/components/site/services";
import { ApproachSection } from "@/components/site/approach";
import { IndustriesShowcase } from "@/components/site/industries-showcase";
import { HowWeWork } from "@/components/site/how-we-work";
import { HomeContact } from "@/components/site/home-contact";
import { pageHead, articles } from "@/lib/site-content";
import poster from "@/assets/hero-poster.jpg";
import team from "@/assets/team.jpg";
import cloud from "@/assets/cloud.jpg";
export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "Talent. Technology. Transformation.",
      "VANDRO brings IT staffing, practical training, career development, and cloud solutions together to help people and businesses move forward.",
    ),
  component: Home,
});
function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      videoRef.current?.play().catch(() => setPlaying(false));
  }, []);
  function toggleVideo() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => setPlaying(false));
    else el.pause();
  }
  return (
    <SiteLayout>
      <section className="hero">
        <img
          className="hero-media"
          src={poster}
          alt="Technology professionals collaborating in a modern office"
          width={1920}
          height={1024}
        />
        <video
          ref={videoRef}
          className="hero-media"
          src={video.url}
          poster={poster}
          muted
          loop
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label="VANDRO technology and talent brand film"
        />
        <div className="hero-shade" />
        <div className="shell hero-content">
          <SectionLabel>PEOPLE. TECHNOLOGY. POSSIBILITY.</SectionLabel>
          <h1>
            <span>
              Talent. Technology.
              <br />
              <em>Transformation.</em>
            </span>
          </h1>
          <p>
            Connecting ambitious people and forward-thinking
            <br className="desktop-break" /> businesses to what comes next.
          </p>
          <Button asChild size="lg">
            <Link to="/services">
              Discover our solutions <ArrowUpRight />
            </Link>
          </Button>
        </div>
        <div className="shell hero-bottom">
          <a href="#what-we-do" className="scroll-link">
            <ArrowDown size={16} /> Explore VANDRO
          </a>
          <span>YOUR AMBITION. OUR COMMITMENT.</span>
          <Button
            size="icon"
            variant="ghost"
            className="video-control"
            onClick={toggleVideo}
            aria-label={
              playing ? "Pause background video" : "Play background video"
            }
          >
            {playing ? <Pause /> : <Play />}
          </Button>
        </div>
      </section>
      <ServicesOverview />
      <ApproachSection />
      <IndustriesShowcase />
      <HowWeWork />
      <section className="insights-section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <SectionLabel>IDEAS & PERSPECTIVES</SectionLabel>
              <h2>
                A little perspective.
                <br />
                <span>A lot of possibility.</span>
              </h2>
            </div>
            <Link className="text-link" to="/resources">
              Explore resources <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="insights-grid">
            {articles.map((a, i) => (
              <Link
                to="/resources"
                hash={`article-${i}`}
                key={a.title}
                className="insight-card"
              >
                <img
                  src={a.image === "team" ? team : cloud}
                  alt=""
                  aria-hidden="true"
                  width={1536}
                  height={1024}
                  loading="lazy"
                />
                <div className="insight-card-copy">
                  <span className="insight-category">{a.category}</span>
                  <h3>{a.title}</h3>
                  <span className="insight-card-arrow" aria-hidden="true">
                    <ArrowUpRight />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <HomeContact />
    </SiteLayout>
  );
}
