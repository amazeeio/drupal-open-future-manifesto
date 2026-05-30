"use client";

import { useEffect, useState } from "react";

const trackedSections = [
  { id: "sec-opening", label: "Opening" },
  { id: "sec-conviction", label: "The conviction" },
  { id: "sec-believe", label: "We believe" },
  { id: "sec-commit", label: "We commit" },
  { id: "sec-closing", label: "In the open" },
  { id: "sign", label: "Sign" },
  { id: "signatories", label: "Signatories" }
];

export function ReadingChrome() {
  const [activeId, setActiveId] = useState(trackedSections[0].id);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isOnDark, setIsOnDark] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setIsReady(true));

    const updateProgress = () => {
      const root = document.documentElement;
      const maxScroll = root.scrollHeight - root.clientHeight;
      setProgress(maxScroll > 0 ? (root.scrollTop / maxScroll) * 100 : 0);
    };

    const updateTone = () => {
      const midpoint = window.innerHeight / 2;
      const darkSections = [document.getElementById("sign"), document.querySelector("footer.colophon")].filter(
        (section): section is Element => section !== null
      );
      const onDark = darkSections.some((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= midpoint && rect.bottom >= midpoint;
      });

      setIsOnDark(onDark);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    trackedSections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    updateProgress();
    updateTone();

    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("scroll", updateTone, { passive: true });
    window.addEventListener("resize", updateTone);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("scroll", updateTone);
      window.removeEventListener("resize", updateTone);
    };
  }, []);

  return (
    <>
      <div className="progress" id="prog" style={{ width: `${progress}%` }}></div>

      <nav className={`tracker${isReady ? " ready" : ""}${isOnDark ? " on-dark" : ""}`} id="tracker" aria-label="Section navigation">
        {trackedSections.map((section) => (
          <a className={activeId === section.id ? "active" : undefined} data-t="" href={`#${section.id}`} key={section.id}>
            <span className="lbl">{section.label}</span>
            <span className="tick"></span>
          </a>
        ))}
      </nav>
    </>
  );
}