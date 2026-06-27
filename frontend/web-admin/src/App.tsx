import {
  type ComponentType,
  type CSSProperties,
  type FormEvent,
  type SVGProps,
  useEffect,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import {
  getUpcomingEvents,
  registerVisit,
  sendContactMessage,
  sendVisitHeartbeat,
  type ContactFormPayload,
  type PresentationEvent,
} from "./services/api";
import { AdminPanel } from "./components/AdminPanel";
import { MemberCard } from "./components/MemberCard";

type IconProps = SVGProps<SVGSVGElement>;
type VisitCounterStatus = "loading" | "ready" | "error";
type FormStatus = { tone: "success" | "error"; message: string } | null;

const HERO_PHOTO_SRC = "/images/histeria-band-official.jpg";
const BAND_PHOTO_SRC = "/images/histeria-live-original.jpg";
const VISITOR_SESSION_KEY = "histeria-visitor-session";

const LOGO_ALT = "Histeria";
const BRAND_ASSETS = {
  primary: "/brand/logo-histeria-primary.png",
  icon: "/brand/icon-histeria.png",
  heart: "/brand/logo-histeria-heart.png",
} as const;
const initialForm: ContactFormPayload = {
  nombreSolicitante: "",
  telefono: "",
  correo: "",
  nombreEvento: "",
  tipoEvento: "",
  cantidadPersonas: "",
  ubicacion: "",
  fechaEvento: "",
  horaEstimada: "",
  duracionEsperada: "",
  presupuestoAproximado: "",
  detallesImportantes: "",
};

function getVisitorSessionId() {
  const existingSessionId = window.localStorage.getItem(VISITOR_SESSION_KEY);
  if (existingSessionId) {
    return existingSessionId;
  }

  const nextSessionId = uuidv4();
  window.localStorage.setItem(VISITOR_SESSION_KEY, nextSessionId);
  return nextSessionId;
}

function App() {
  const [hashRoute, setHashRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHashRoute(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (hashRoute === "#admin") {
    return <AdminPanel />;
  }

  return <PublicLanding />;
}

function PublicLanding() {
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [animatedVisitCount, setAnimatedVisitCount] = useState(0);
  const [visitStatus, setVisitStatus] = useState<VisitCounterStatus>("loading");
  const [events, setEvents] = useState<PresentationEvent[]>([]);
  const [eventsError, setEventsError] = useState(false);
  const [form, setForm] = useState<ContactFormPayload>(initialForm);
  const [isSending, setIsSending] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  useEffect(() => {
    document.title = "Histeria | Pop • Rock • Cumbias • Reggae en vivo";

    const revealElements = document.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );

    revealElements.forEach((element) => observer.observe(element));

    const visitorSessionId = getVisitorSessionId();

    registerVisit(visitorSessionId)
      .then(({ count }) => {
        setVisitCount(count);
        setVisitStatus("ready");
      })
      .catch((error) => {
        console.error(error);
        setVisitStatus("error");
      });

    getUpcomingEvents()
      .then((nextEvents) => {
        setEvents(nextEvents);
        setEventsError(false);
      })
      .catch((error) => {
        console.error(error);
        setEvents([]);
        setEventsError(true);
      });

    const heartbeatInterval = window.setInterval(() => {
      sendVisitHeartbeat(visitorSessionId).catch((error) => {
        console.error(error);
      });
    }, 30000);

    return () => {
      observer.disconnect();
      window.clearInterval(heartbeatInterval);
    };
  }, []);

  useEffect(() => {
    if (visitStatus !== "ready" || visitCount === null) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAnimatedVisitCount(visitCount);
      return;
    }

    const startedAt = performance.now();
    const duration = 900;
    let animationFrame = 0;

    const updateCounter = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedVisitCount(Math.round(visitCount * easedProgress));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(updateCounter);
      }
    };

    animationFrame = window.requestAnimationFrame(updateCounter);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [visitCount, visitStatus]);

  const updateField = (field: keyof ContactFormPayload, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSending(true);
    setFormStatus(null);

    try {
      const response = await sendContactMessage(form);
      setFormStatus({
        tone: response.success ? "success" : "error",
        message:
          response.success && !response.emailSent
            ? "Solicitud registrada. Te contactaremos pronto."
            : response.message,
      });
      setForm(initialForm);
    } catch (error) {
      setFormStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo enviar la solicitud. Inténtalo de nuevo.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const visitLabel =
    visitStatus === "ready" && visitCount !== null
      ? `+${animatedVisitCount.toLocaleString("es-HN")}`
      : visitStatus === "loading"
        ? "..."
        : "+0";
  const activeVideo = videos[activeVideoIndex];
  const showPreviousVideo = () => {
    setActiveVideoIndex((current) => (current - 1 + videos.length) % videos.length);
  };
  const showNextVideo = () => {
    setActiveVideoIndex((current) => (current + 1) % videos.length);
  };

  return (
    <main className="site-shell">
      <header className="site-header" aria-label="Navegación principal">
        <a className="brand-lockup" href="#inicio" aria-label="Inicio Histeria">
          <BrandMark compact />
          <span className="header-brand-name">HISTERIA</span>
        </a>

        <nav className="header-links" aria-label="Secciones">
          <a href="#banda">La banda</a>
          <a href="#repertorio">Repertorio</a>
          <a href="#videos">Videos</a>
          <a href="#contrataciones">Contrataciones</a>
        </nav>
      </header>

      <section className="hero-section reveal" id="inicio" aria-labelledby="hero-title">
        <img
          src={HERO_PHOTO_SRC}
          alt="Foto grupal oficial de Histeria"
          className="hero-photo band-photo"
          decoding="async"
          fetchPriority="high"
        />
        <div className="hero-overlay" aria-hidden="true" />

        <div className="hero-content">
          <div className="hero-brand">
            <BrandMark variant="primary" />
            <h1 className="sr-only" id="hero-title">{LOGO_ALT}</h1>
          </div>
          <div className="hero-message">
            <p className="eyebrow">Pop • Rock • Cumbias • Reggae en vivo</p>
            <p className="hero-copy">
              Una banda con energía, elegancia y repertorio versátil para eventos,
              bares, bodas, fiestas privadas y escenarios en vivo.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#contrataciones">
                <IconPhone className="button-icon" /> Contratar banda
              </a>
              <a className="button button-secondary" href="#videos">
                <IconPlay className="button-icon" /> Ver videos
              </a>
            </div>
          </div>
        </div>

        <div className="hero-metrics" aria-label="Resumen de la banda">
          <span>
            <strong>Pop</strong>
            repertorio versátil
          </span>
          <span>
            <strong>Rock</strong>
            energía de escenario
          </span>
          <span>
            <strong>Cumbias</strong>
            ritmo para celebrar
          </span>
          <span>
            <strong>Reggae</strong>
            groove y buena vibra
          </span>
          <span className="visitor-kpi" aria-live="polite">
            <strong className="visitor-kpi-value">{visitLabel}</strong>
            visitas registradas
          </span>
        </div>
      </section>

      <section className="content-section band-section reveal" id="banda">
        <div className="band-image-frame">
          <img
            src={BAND_PHOTO_SRC}
            alt="Histeria tocando en vivo con el corazón de la banda reflejado en el escenario"
            className="band-photo"
          />
          <img
            src={BRAND_ASSETS.heart}
            alt=""
            className="floor-heart-reflection"
            aria-hidden="true"
          />
        </div>
        <div className="band-copy">
          <p className="section-kicker">La banda</p>
          <h2>Música en vivo con energía, estilo y sonido profesional.</h2>
          <p>
            Histeria combina pop, rock, cumbias y reggae con una puesta en escena moderna,
            voces sólidas y músicos con experiencia en eventos en vivo. Nuestro
            repertorio está pensado para conectar con el público y mantener la
            energía de principio a fin.
          </p>
          <div className="event-type-list" aria-label="Tipos de evento">
            {eventTypes.map((type) => (
              <span key={type}>{type}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section reveal" id="integrantes">
        <div className="section-heading">
          <p className="section-kicker">Alineación</p>
          <h2>Integrantes</h2>
        </div>
        <div className="member-grid">
          {members.map(({ bio, details, icon: Icon, name, photo, photoPosition, role }) => (
            <MemberCard
              bio={bio}
              details={details}
              Icon={Icon}
              key={name}
              name={name}
              photo={photo}
              photoPosition={photoPosition}
              role={role}
            />
          ))}
        </div>
      </section>

      <section className="content-section repertoire-section reveal" id="repertorio">
        <div>
          <p className="section-kicker">Géneros y repertorio</p>
          <h2>Un repertorio flexible para cada público.</h2>
          <p>
            Un repertorio versátil que mezcla clásicos, hits modernos y canciones
            reconocidas para diferentes tipos de público y evento.
          </p>
        </div>
        <div className="tag-list">
          {repertoire.map((style) => (
            <span key={style}>
              <IconMusic className="tag-icon" />
              {style}
            </span>
          ))}
        </div>
      </section>

      <section className="content-section live-section reveal" id="videos">
        <div className="section-heading">
          <p className="section-kicker">Videos en vivo</p>
          <h2>Histeria en escenario.</h2>
        </div>

        <div className={`video-carousel${activeVideo.isShort ? " is-short" : ""}`}>
          <div className="video-carousel-stage">
            <iframe
              key={activeVideo.id}
              src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?rel=0`}
              title={`${activeVideo.title} — Histeria en vivo`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          <div className="video-carousel-controls">
            <button
              type="button"
              className="video-carousel-arrow"
              onClick={showPreviousVideo}
              aria-label="Ver video anterior"
            >
              ←
            </button>
            <div className="video-carousel-caption" aria-live="polite">
              <span>{String(activeVideoIndex + 1).padStart(2, "0")} / {String(videos.length).padStart(2, "0")}</span>
              <h3>{activeVideo.title}</h3>
              <p>Histeria en vivo</p>
            </div>
            <button
              type="button"
              className="video-carousel-arrow"
              onClick={showNextVideo}
              aria-label="Ver siguiente video"
            >
              →
            </button>
          </div>

          <div className="video-carousel-thumbnails" aria-label="Seleccionar video">
            {videos.map((video, index) => (
              <button
                type="button"
                key={video.id}
                className={index === activeVideoIndex ? "is-active" : ""}
                onClick={() => setActiveVideoIndex(index)}
                aria-label={`Ver ${video.title}`}
                aria-current={index === activeVideoIndex ? "true" : undefined}
              >
                <span className="video-thumbnail">
                  <img
                    src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <IconPlay aria-hidden="true" />
                </span>
                <span>{video.title}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section upcoming-section reveal" id="fechas">
        <div className="section-heading">
          <p className="section-kicker">Próximas fechas</p>
          <h2>Presentaciones confirmadas.</h2>
        </div>

        {events.length === 0 ? (
          <div className="upcoming-empty">
            {eventsError
              ? "Muy pronto anunciaremos nuevas fechas."
              : "Muy pronto anunciaremos nuevas fechas."}
          </div>
        ) : (
          <div className="upcoming-grid">
            {events.slice(0, 3).map((event, index) => (
              <article
                className="upcoming-card"
                key={event.id}
                style={{ "--event-index": index } as CSSProperties}
              >
                <span className="event-card-corner" aria-hidden="true" />
                <div className="event-card-heading">
                  <span className="date-badge">
                    <IconCalendar aria-hidden="true" />
                    {formatEventBadge(event.eventDate)}
                  </span>
                  <span className="event-confirmed">
                    <span aria-hidden="true" />
                    Confirmado
                  </span>
                </div>
                <div className="event-card-content">
                  <h3>{event.title}</h3>
                  <p className="event-card-detail">
                    <IconMap aria-hidden="true" />
                    <span>{event.venue}, {event.city}</span>
                  </p>
                  <p className="event-card-time">
                    <IconClock aria-hidden="true" />
                    <span>
                      {formatEventDate(event.eventDate)} • {formatEventTime(event.eventTime)}
                    </span>
                  </p>
                </div>
                {event.facebookUrl && (
                  <a
                    className="event-card-link"
                    href={event.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver evento <span aria-hidden="true">↗</span>
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="content-section contact-section reveal" id="contrataciones">
        <div className="contact-copy">
          <p className="section-kicker">Contrataciones</p>
          <h2>Lleva la energía de Histeria a tu evento.</h2>
          <p>
            Contanos la fecha, lugar, tipo de evento y duración aproximada para
            preparar una propuesta.
          </p>

          <div className="contact-card">
            <a href="tel:+50433017565">
              <IconPhone className="inline-icon" /> +504 3301-7565
            </a>
            <a href="mailto:xtian.osx@gmail.com">
              <IconMail className="inline-icon" /> xtian.osx@gmail.com
            </a>
            <span>
              <IconMap className="inline-icon" /> Tegucigalpa, Honduras
            </span>
          </div>

          <div className="social-row" aria-label="Redes sociales">
            {socialLinks.map(({ icon: Icon, name, url }) => (
              <a key={name} href={url} target="_blank" rel="noreferrer">
                <Icon className="social-icon" />
                {name}
              </a>
            ))}
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <label>
            Nombre
            <input
              required
              value={form.nombreSolicitante}
              onChange={(event) => updateField("nombreSolicitante", event.target.value)}
              placeholder="Tu nombre"
            />
          </label>

          <label>
            Teléfono / WhatsApp
            <input
              required
              value={form.telefono}
              onChange={(event) => updateField("telefono", event.target.value)}
              placeholder="Ej. +504 3301-7565"
            />
          </label>

          <label>
            Correo
            <input
              type="email"
              value={form.correo}
              onChange={(event) => updateField("correo", event.target.value)}
              placeholder="tu@correo.com"
            />
          </label>

          <label>
            Fecha del evento
            <input
              required
              type="date"
              value={form.fechaEvento}
              onChange={(event) => updateField("fechaEvento", event.target.value)}
            />
          </label>

          <label>
            Lugar
            <input
              required
              value={form.ubicacion}
              onChange={(event) => updateField("ubicacion", event.target.value)}
              placeholder="Ciudad, venue o referencia"
            />
          </label>

          <label>
            Tipo de evento
            <input
              required
              value={form.tipoEvento}
              onChange={(event) => updateField("tipoEvento", event.target.value)}
              placeholder="Boda, bar, fiesta privada..."
            />
          </label>

          <label>
            Duración aproximada
            <input
              value={form.duracionEsperada}
              onChange={(event) => updateField("duracionEsperada", event.target.value)}
              placeholder="Ej. 2 horas, 3 sets"
            />
          </label>

          <label>
            Nombre del evento
            <input
              required
              value={form.nombreEvento}
              onChange={(event) => updateField("nombreEvento", event.target.value)}
              placeholder="Nombre del evento o local"
            />
          </label>

          <label className="form-wide">
            Mensaje
            <textarea
              value={form.detallesImportantes}
              onChange={(event) => updateField("detallesImportantes", event.target.value)}
              placeholder="Contanos detalles de horario, sonido, escenario, cantidad de personas o repertorio deseado"
              rows={5}
            />
          </label>

          <button className="button button-primary form-wide" type="submit" disabled={isSending}>
            {isSending ? "Enviando..." : "Solicitar disponibilidad"}
          </button>

          {formStatus && (
            <p className={`form-status form-status-${formStatus.tone} form-wide`}>
              {formStatus.message}
            </p>
          )}
        </form>
      </section>

      <footer className="site-footer reveal" aria-label="Pie de página">
        <img
          src={BRAND_ASSETS.heart}
          alt=""
          className="footer-heart-watermark"
          aria-hidden="true"
        />
        <div className="footer-grid">
          <div className="footer-brand">
            <BrandMark variant="primary" />
            <p className="footer-genre-line">Pop • Rock • Cumbias • Reggae</p>
            <p>
              Música en vivo para eventos con energía, estilo y sonido profesional.
            </p>
          </div>

          <div className="footer-column">
            <p className="footer-kicker">Contacto</p>
            <a href="tel:+50433017565">+504 3301-7565</a>
            <a href="mailto:xtian.osx@gmail.com">xtian.osx@gmail.com</a>
            <span>Tegucigalpa, Honduras</span>
          </div>

          <div className="footer-column">
            <p className="footer-kicker">Redes</p>
            {socialLinks.map(({ name, url }) => (
              <a key={name} href={url} target="_blank" rel="noreferrer">
                {name}
              </a>
            ))}
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Histeria. Todos los derechos reservados.</p>
          <a href="#admin">Acceso privado</a>
        </div>
      </footer>

      <a
        className="whatsapp-float"
        href="https://wa.me/50433017565?text=Hola%20quiero%20cotizar%20un%20evento%20con%20Histeria"
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
      >
        <IconPhone className="button-icon" />
        <span className="whatsapp-label">WhatsApp</span>
      </a>
    </main>
  );
}

type BrandVariant = "primary" | "icon";

function BrandMark({
  compact = false,
  variant = "primary",
}: {
  compact?: boolean;
  variant?: BrandVariant;
}) {
  const resolvedVariant = compact ? "icon" : variant;

  return (
    <span className={`brand-mark brand-mark-${resolvedVariant}`}>
      <img
        src={BRAND_ASSETS[resolvedVariant]}
        alt={compact ? "" : "Histeria"}
        aria-hidden={compact ? "true" : undefined}
      />
    </span>
  );
}

const IconPhone = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M6.6 2.9 9 2.3c.9-.2 1.8.3 2.1 1.1l1 2.4c.3.7.1 1.5-.5 2l-1.3 1.1a11.4 11.4 0 0 0 4.8 4.8l1.1-1.3c.5-.6 1.3-.8 2-.5l2.4 1c.8.3 1.3 1.2 1.1 2.1l-.6 2.4c-.2.9-1 1.5-1.9 1.5C10.2 18.9 5.1 13.8 5.1 4.8c0-.9.6-1.7 1.5-1.9Z" />
  </svg>
);

const IconMap = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M12 2.5a7 7 0 0 0-7 7c0 5.2 7 12 7 12s7-6.8 7-12a7 7 0 0 0-7-7Zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2Z" />
  </svg>
);

const IconCalendar = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M7 2h2v2h6V2h2v2h3v17H4V4h3V2Zm11 8H6v9h12v-9ZM6 8h12V6H6v2Z" />
  </svg>
);

const IconClock = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 3v4.6l3.2 1.9-1 1.7-4.2-2.5V7h2Z" />
  </svg>
);

const IconMail = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v.3l8 5.3 8-5.3V7H4Zm16 10V9.7l-7.4 4.9a1 1 0 0 1-1.2 0L4 9.7V17h16Z" />
  </svg>
);

const IconMusic = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M16.5 3v11.3a3.3 3.3 0 1 1-2-3V6.2L8 7.6v8.7a3.3 3.3 0 1 1-2-3V6l10.5-3Z" />
  </svg>
);

const IconPlay = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M8 5.2v13.6L19 12 8 5.2Z" />
  </svg>
);

const IconFacebook = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M14 8.4V6.9c0-.7.5-.9 1-.9h1.8V3h-2.5C11.6 3 10 4.7 10 7.4v1H8v3.1h2V21h3.5v-9.5h2.7l.5-3.1H14Z" />
  </svg>
);

const IconInstagram = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm0 2A2.5 2.5 0 0 0 5 7.5v9A2.5 2.5 0 0 0 7.5 19h9a2.5 2.5 0 0 0 2.5-2.5v-9A2.5 2.5 0 0 0 16.5 5h-9ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm4.7-2.8a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z" />
  </svg>
);

const IconTikTok = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M15 3c.4 3 2.1 4.8 5 5v3.2a8.5 8.5 0 0 1-5-1.7V15a6 6 0 1 1-6-6c.4 0 .8 0 1.2.1v3.4A2.7 2.7 0 1 0 12 15V3h3Z" />
  </svg>
);

const IconYouTube = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M21.2 7.2c-.2-1-.9-1.8-1.9-2-1.7-.4-7.3-.4-7.3-.4s-5.6 0-7.3.4c-1 .2-1.7 1-1.9 2C2.4 8.9 2.4 12 2.4 12s0 3.1.4 4.8c.2 1 .9 1.8 1.9 2 1.7.4 7.3.4 7.3.4s5.6 0 7.3-.4c1-.2 1.7-1 1.9-2 .4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8ZM10 15.6V8.4l6 3.6-6 3.6Z" />
  </svg>
);

const IconMic = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M12 2a4 4 0 0 0-4 4v5a4 4 0 1 0 8 0V6a4 4 0 0 0-4-4Zm7 8.5h-2A5 5 0 0 1 7 10.5H5a7 7 0 0 0 6 6.9V20H8v2h8v-2h-3v-2.6a7 7 0 0 0 6-6.9Z" />
  </svg>
);

const IconGuitar = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="m18.7 2 3.3 3.3-2.1 2.1 1 1-1.4 1.4-1-1-3.1 3.1a5.2 5.2 0 0 1-1.2 5.5c-2.5 2.5-6.8 2.4-9.6-.4s-2.9-7.1-.4-9.6a5.2 5.2 0 0 1 5.5-1.2l3.1-3.1-1-1L13.2.7l1 1L16.3 0l1.4 1.4-2.1 2.1 1.2 1.2L18.7 2ZM7.4 15.5a2.2 2.2 0 1 0 3.1-3.1 2.2 2.2 0 0 0-3.1 3.1Z" />
  </svg>
);

const IconBass = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M16.8 2.1 21.9 7l-1.4 1.4-.9-.8-6.1 6.1c.5 1.8.1 3.8-1.3 5.2-2.2 2.2-5.8 2.2-8 0s-2.2-5.8 0-8c1.4-1.4 3.4-1.8 5.2-1.3l6.1-6.1-.8-.9 1.4-1.4.7.9ZM7.3 16.4a1.7 1.7 0 1 0 2.4-2.4 1.7 1.7 0 0 0-2.4 2.4Z" />
  </svg>
);

const IconDrums = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M4 9.5C4 7.6 7.1 6 11 6s7 1.6 7 3.5v5C18 16.4 14.9 18 11 18s-7-1.6-7-3.5v-5Zm14.8-6.8 1.4 1.4-3.9 3.9-1.4-1.4 3.9-3.9ZM3.8 2.7l3.9 3.9-1.4 1.4-3.9-3.9 1.4-1.4ZM11 8c-3.1 0-5 1-5 1.5S7.9 11 11 11s5-1 5-1.5S14.1 8 11 8Z" />
  </svg>
);

// TODO_HISTERIA: confirmar red social oficial
const socialLinks = [
  {
    name: "Instagram",
    url: "https://instagram.com/histeriahn",
    icon: IconInstagram,
  },
  {
    name: "TikTok",
    url: "https://tiktok.com/@histeriahn",
    icon: IconTikTok,
  },
  {
    name: "Facebook",
    url: "https://facebook.com/histeriahn",
    icon: IconFacebook,
  },
  {
    name: "YouTube",
    url: "https://youtube.com/@histeriahn",
    icon: IconYouTube,
  },
];

const members = [
  {
    name: "Valeria Solís",
    role: "Vocalista",
    bio: "Voz, presencia escénica y conexión directa con el público.",
    details: "Interpreta cada canción con matices propios, pasando de momentos íntimos a coros llenos de energía.",
    photo: "/images/members/valeria-solis.jpg",
    photoPosition: "50% 40%",
    icon: IconMic,
  },
  {
    name: "Wilmer Dávila",
    role: "Bajista",
    bio: "Base, groove y dinámica para sostener cada canción.",
    details: "Construye junto a la batería una base sólida que conecta cada sección del repertorio y mantiene el pulso del show.",
    photo: "/images/members/wilmer-davila.jpg",
    photoPosition: "34% 50%",
    icon: IconBass,
  },
  {
    name: "Cristian Aguilar",
    role: "Guitarrista",
    bio: "Arreglos, riffs y texturas para dar carácter al sonido de Histeria.",
    details: "Combina guitarras rítmicas, melodías y efectos para adaptar el sonido de la banda a cada género y escenario.",
    photo: "/images/members/cristian-aguilar.jpg",
    photoPosition: "50% 42%",
    icon: IconGuitar,
  },
  {
    name: "Alejandro Navas",
    role: "Baterista",
    bio: "Pulso, energía y dinámica para mantener el show en movimiento.",
    details: "Marca las transiciones y eleva cada momento del repertorio con precisión, fuerza y sensibilidad musical.",
    photo: "/images/members/alejandro-navas.jpg",
    photoPosition: "50% 38%",
    icon: IconDrums,
  },
];

// TODO_HISTERIA: cargar repertorio oficial
const repertoire = [
  "Pop",
  "Rock",
  "Cumbias",
  "Reggae",
  "Baladas",
  "Clásicos en inglés y español",
  "Música para eventos",
];

const eventTypes = [
  "Bares y restaurantes",
  "Bodas",
  "Fiestas privadas",
  "Eventos corporativos",
  "Escenarios en vivo",
];

const videos = [
  {
    id: "MgHcEnMwFwk",
    title: "Nunca es suficiente",
    isShort: false,
  },
  {
    id: "idiygpVcP9E",
    title: "Si una vez",
    isShort: true,
  },
  {
    id: "47zQADqJ0zg",
    title: "Down Under",
    isShort: true,
  },
] as const;

export default App;

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("es-HN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${value}T00:00:00`));
}

function formatEventBadge(value: string) {
  return new Intl.DateTimeFormat("es-HN", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("es-HN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(`1970-01-01T${value}`));
}
