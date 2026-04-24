import { useEffect, useRef, type ComponentType, type SVGProps } from "react";
import gsap from "gsap";

type IconProps = SVGProps<SVGSVGElement>;

type MemberCardProps = {
  name: string;
  role: string;
  bio: string;
  Icon: ComponentType<IconProps>;
};

export function MemberCard({ bio, Icon, name, role }: MemberCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const glowRef = useRef<HTMLSpanElement | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const bioRef = useRef<HTMLParagraphElement | null>(null);
  const iconRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const card = cardRef.current;
    const glow = glowRef.current;
    const details = detailsRef.current;
    const bioElement = bioRef.current;
    const icon = iconRef.current;

    if (!card || !glow || !details || !bioElement || !icon) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const supportsHover = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;

    const setCollapsedState = () => {
      gsap.set(card, {
        y: 0,
        scale: 1,
        opacity: 1,
        clearProps: "boxShadow",
      });
      gsap.set(glow, { opacity: 0, scale: 0.94 });
      gsap.set(details, { height: supportsHover ? 0 : "auto" });
      gsap.set(bioElement, {
        autoAlpha: supportsHover ? 0 : 1,
        y: supportsHover ? 14 : 0,
      });
      gsap.set(icon, { scale: 1, rotate: 0, y: 0 });
    };

    setCollapsedState();

    if (!prefersReducedMotion) {
      gsap.set(card, { autoAlpha: 0, y: 28 });
    }

    const hoverIn = () => {
      if (!supportsHover) {
        return;
      }

      if (prefersReducedMotion) {
        gsap.set(details, { height: "auto" });
        gsap.set(bioElement, { autoAlpha: 1, y: 0 });
        return;
      }

      gsap.killTweensOf([card, glow, details, bioElement, icon]);

      gsap.to(card, {
        y: -10,
        scale: 1.03,
        boxShadow:
          "0 30px 90px rgba(0, 0, 0, 0.34), 0 0 30px rgba(245, 192, 83, 0.14)",
        duration: 0.36,
        ease: "power2.out",
      });

      gsap.to(glow, {
        opacity: 1,
        scale: 1,
        duration: 0.34,
        ease: "power2.out",
      });

      gsap.to(details, {
        height: details.scrollHeight,
        duration: 0.34,
        ease: "power2.out",
      });

      gsap.to(bioElement, {
        autoAlpha: 1,
        y: 0,
        duration: 0.3,
        ease: "power2.out",
      });

      gsap.to(icon, {
        scale: 1.08,
        rotate: -4,
        y: -2,
        duration: 0.34,
        ease: "back.out(2.2)",
      });
    };

    const hoverOut = () => {
      if (!supportsHover) {
        return;
      }

      if (prefersReducedMotion) {
        setCollapsedState();
        return;
      }

      gsap.killTweensOf([card, glow, details, bioElement, icon]);

      gsap.to(card, {
        y: 0,
        scale: 1,
        boxShadow: "0 18px 54px rgba(0, 0, 0, 0.18)",
        duration: 0.32,
        ease: "power2.out",
      });

      gsap.to(glow, {
        opacity: 0,
        scale: 0.94,
        duration: 0.28,
        ease: "power2.out",
      });

      gsap.to(details, {
        height: 0,
        duration: 0.3,
        ease: "power2.inOut",
      });

      gsap.to(bioElement, {
        autoAlpha: 0,
        y: 14,
        duration: 0.24,
        ease: "power2.out",
      });

      gsap.to(icon, {
        scale: 1,
        rotate: 0,
        y: 0,
        duration: 0.28,
        ease: "power2.out",
      });
    };

    const animateIn = () => {
      if (prefersReducedMotion) {
        gsap.set(card, { autoAlpha: 1, y: 0 });
        return;
      }

      gsap.to(card, {
        autoAlpha: 1,
        y: 0,
        duration: 0.62,
        ease: "power3.out",
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          animateIn();
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.28 }
    );

    observer.observe(card);

    card.addEventListener("mouseenter", hoverIn);
    card.addEventListener("mouseleave", hoverOut);
    card.addEventListener("focusin", hoverIn);
    card.addEventListener("focusout", hoverOut);

    return () => {
      observer.disconnect();
      card.removeEventListener("mouseenter", hoverIn);
      card.removeEventListener("mouseleave", hoverOut);
      card.removeEventListener("focusin", hoverIn);
      card.removeEventListener("focusout", hoverOut);
      gsap.killTweensOf([card, glow, details, bioElement, icon]);
    };
  }, []);

  return (
    <article className="member-card" ref={cardRef} tabIndex={0}>
      <span className="member-card-glow" ref={glowRef} aria-hidden="true" />
      <div className="member-card-main">
        <div className="member-copy">
          <span>{role}</span>
          <h3>{name}</h3>
          <p className="member-teaser">{bio}</p>
        </div>

        <span className="member-icon-shell" ref={iconRef} aria-hidden="true">
          <Icon className="member-icon" />
        </span>
      </div>

      <div className="member-card-details-wrap" ref={detailsRef}>
        <div className="member-card-details">
          <p ref={bioRef}>{bio}</p>
        </div>
      </div>
    </article>
  );
}
