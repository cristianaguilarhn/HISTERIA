import {
  type ComponentType,
  type FormEvent,
  type SVGProps,
  useEffect,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import {
  getUpcomingEvents,
  registerVisit,
  sendVisitHeartbeat,
  sendContactMessage,
  type ContactFormPayload,
  type PresentationEvent,
} from "./services/api";
import { AdminPanel } from "./components/AdminPanel";
import { MemberCard } from "./components/MemberCard";

type IconProps = SVGProps<SVGSVGElement>;
type VisitCounterStatus = "loading" | "ready" | "error";
type FormStatus = { tone: "success" | "error"; message: string } | null;

const LOGO_SRC = "/logo.png";
const VISITOR_SESSION_KEY = "tensionretro-visitor-session";

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

const IconMusic = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M16.5 3v11.3a3.3 3.3 0 1 1-2-3V6.2L8 7.6v8.7a3.3 3.3 0 1 1-2-3V6l10.5-3Z" />
  </svg>
);

const IconCalendar = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M7 2h2v2h6V2h2v2h3v17H4V4h3V2Zm13 8H4v9h16v-9Z" />
  </svg>
);

const IconArrow = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="m13.2 5.8 5.5 6.2-5.5 6.2-1.5-1.3 3.5-3.9H4v-2h11.2l-3.5-3.9 1.5-1.3Z" />
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

const IconMail = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v.3l8 5.3 8-5.3V7H4Zm16 10V9.7l-7.4 4.9a1 1 0 0 1-1.2 0L4 9.7V17h16Z" />
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

const IconDrums = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M4 9.5C4 7.6 7.1 6 11 6s7 1.6 7 3.5v5C18 16.4 14.9 18 11 18s-7-1.6-7-3.5v-5Zm14.8-6.8 1.4 1.4-3.9 3.9-1.4-1.4 3.9-3.9ZM3.8 2.7l3.9 3.9-1.4 1.4-3.9-3.9 1.4-1.4ZM11 8c-3.1 0-5 1-5 1.5S7.9 11 11 11s5-1 5-1.5S14.1 8 11 8Z" />
  </svg>
);

const members = [
  {
    name: "Christopher Valladares",
    role: "Vocalista",
    bio: "Voz principal y presencia escénica.",
    icon: IconMic,
  },
  {
    name: "Cristian Aguilar",
    role: "Guitarrista",
    bio: "Guitarra, energía y soporte armónico.",
    icon: IconGuitar,
  },
  {
    name: "Wilmer Dávila",
    role: "Bajista",
    bio: "Base rítmica y groove en vivo.",
    icon: IconGuitar,
  },
  {
    name: "Rolando Ardón",
    role: "Baterista",
    bio: "Pulso, fuerza y dinámica.",
    icon: IconDrums,
  },
];

const repertoire = [
  "Reggae",
  "Rock en español",
  "Rock en inglés",
  "Clásicos",
  "Indie",
  "Música moderna",
];

const socialLinks = [
  {
    name: "Facebook",
    url: "https://www.facebook.com/share/18aeDfk8uH/",
    icon: IconFacebook,
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/tensionretro?igsh=MTljN2w3MTR0OGkzcQ==",
    icon: IconInstagram,
  },
  {
    name: "TikTok",
    url: "https://www.tiktok.com/@tensionretro?_r=1&_t=ZS-95lk0S4L4Sb",
    icon: IconTikTok,
  },
];

const footerSocialLinks: Array<{
  name: string;
  url: string | null;
  icon: ComponentType<IconProps>;
  note?: string;
}> = [
  ...socialLinks,
  {
    name: "YouTube",
    url: null,
    icon: IconYouTube,
  },
];

const heroHighlights = [
  { label: "Covers en vivo", icon: IconMusic },
  { label: "Eventos y bares", icon: IconCalendar },
  { label: "Contrataciones en Tegucigalpa", icon: IconMap },
];

const liveVideos = [
  {
    title: "Tensión Retro en vivo",
    src: "https://www.youtube.com/embed/oCnzqQiguyk",
  },
  {
    title: "Clásicos e indie con sonido de banda",
    src: "https://www.youtube.com/embed/uxtazIp78NU",
  },
  {
    title: "Ambiente en vivo para bares y eventos",
    src: "https://www.youtube.com/embed/P2JKl7EyxeM",
  },
];

const trustSignals = [
  "Shows para bares, celebraciones privadas y eventos corporativos.",
  "Repertorio adaptable al ambiente, horario y tipo de publico.",
  "Comunicacion directa para coordinar logistica, duracion y presupuesto.",
];

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
  const [visitStatus, setVisitStatus] = useState<VisitCounterStatus>("loading");
  const [events, setEvents] = useState<PresentationEvent[]>([]);
  const [eventsError, setEventsError] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [form, setForm] = useState<ContactFormPayload>(initialForm);
  const [isSending, setIsSending] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>(null);

  useEffect(() => {
    document.title =
      "Tensión Retro | Banda de covers en Tegucigalpa, Honduras";

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
      { threshold: 0.18 }
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
        setVisitCount(null);
        setVisitStatus("error");
      });

    const heartbeat = () => {
      sendVisitHeartbeat(visitorSessionId).catch((error) => {
        console.error(error);
      });
    };

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

    const heartbeatInterval = window.setInterval(heartbeat, 30000);

    return () => {
      observer.disconnect();
      window.clearInterval(heartbeatInterval);
    };
  }, []);

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
            : "No se pudo enviar la solicitud. Intentalo de nuevo.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const isVisitCountLoading = visitStatus === "loading";
  const hasVisitCountError = visitStatus === "error";
  const visitLabel = isVisitCountLoading
    ? ""
    : visitCount?.toLocaleString("es-HN") ?? "";
  const visitCaption = hasVisitCountError
    ? "contador sincronizando"
    : "visitas registradas";
  const visibleEvents = showAllEvents ? events : events.slice(0, 3);
  const hasHiddenEvents = events.length > 3;

  return (
    <main className="site-shell">
      <header className="site-header" aria-label="Navegación principal">
        <a className="brand-lockup" href="#inicio" aria-label="Inicio Tensión Retro">
          <img
            src={LOGO_SRC}
            alt="Tensión Retro"
            className="brand-logo"
          />
          <span>Tensión Retro</span>
        </a>

        <nav className="header-links" aria-label="Secciones">
          <a href="#sobre">Banda</a>
          <a href="#integrantes">Integrantes</a>
          <a href="#contratacion">Contratación</a>
        </nav>
      </header>

      <section className="hero-section reveal" id="inicio" aria-labelledby="hero-title">
        <div className="hero-stage">
          <div className="hero-content">
            <p className="eyebrow">
              <IconMap className="inline-icon" /> Tegucigalpa, Honduras
            </p>
            <h1 id="hero-title">Tensión Retro</h1>
            <p className="hero-slogan">Clásicos, indie y rock en un solo escenario</p>
            <p className="hero-copy">
              Banda de covers en Tegucigalpa para bares, eventos privados,
              celebraciones y noches en vivo. Interpretamos reggae, rock en
              español, rock en inglés, clásicos, indie y música moderna.
            </p>
            <div className="hero-actions">
              <a className="button button-primary hero-primary-cta" href="#contratacion">
                <IconPhone className="button-icon" /> Contratar ahora
              </a>
              <a className="button button-secondary" href="#repertorio">
                <IconMusic className="button-icon" /> Ver repertorio
              </a>
            </div>
            <p className="cta-microcopy">
              Disponibilidad para bares, eventos privados y celebraciones en Tegucigalpa.
            </p>
          </div>

          <aside className="hero-card" aria-label="Resumen de contratación">
            <div className="hero-logo-frame">
              <img
                src={LOGO_SRC}
                alt="Logo oficial de Tensión Retro"
              />
            </div>
            <span className="live-pill">
              <IconMusic className="pill-icon" /> Banda en vivo
            </span>
            <span className="hero-contact-label">Contrataciones</span>
            <a className="hero-phone-link" href="tel:+50433017565" aria-label="Llamar al +504 3301-7565">
              <IconPhone className="hero-phone-icon" />
              <span>+504 3301-7565</span>
            </a>
            <p>Contrataciones para Tegucigalpa y alrededores.</p>
            <div
              className={`visit-counter${isVisitCountLoading ? " visit-counter-loading" : ""}`}
              aria-busy={isVisitCountLoading}
            >
              {isVisitCountLoading ? (
                <span className="visit-placeholder" aria-label="Actualizando contador" />
              ) : hasVisitCountError ? (
                <span className="visit-fallback" aria-label="Contador sincronizando">
                  Activo
                </span>
              ) : (
                <span>{visitLabel}</span>
              )}
              {visitCaption}
            </div>
            <div className="social-row social-row-compact" aria-label="Redes sociales">
              {socialLinks.map(({ icon: Icon, name, url }) => (
                <a key={name} href={url} target="_blank" rel="noreferrer">
                  <Icon className="social-icon" />
                  {name}
                </a>
              ))}
            </div>
          </aside>

          <div className="hero-highlights" aria-label="Servicios destacados">
            {heroHighlights.map(({ icon: Icon, label }) => (
              <span key={label}>
                <Icon className="highlight-icon" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section credibility-section reveal" aria-label="Credibilidad">
        <div className="credibility-copy">
          <span>Experiencia en eventos reales</span>
          <p>
            Tocamos para crear ambiente, sostener la energia de la noche y
            adaptarnos al formato de cada evento.
          </p>
        </div>
        <div className="credibility-grid">
          {trustSignals.map((signal) => (
            <article key={signal}>
              <IconMusic className="highlight-icon" />
              <p>{signal}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section live-section reveal" id="videos" aria-labelledby="live-title">
        <div className="section-heading live-heading">
          <p className="section-kicker">Videos en vivo</p>
          <h2 id="live-title">Así suena Tensión Retro en vivo</h2>
          <p>
            Mira el tipo de energia que podemos llevar a tu bar, evento privado
            o celebracion. Estos videos muestran momentos reales de la banda.
          </p>
        </div>
        <div className="video-grid">
          {liveVideos.map((video) => (
            <article className="video-card" key={video.title}>
              <div className="video-frame">
                <iframe
                  src={video.src}
                  title={video.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <h3>{video.title}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section split-section reveal" id="sobre">
        <div>
          <p className="section-kicker">Sobre la banda</p>
          <h2>Un repertorio retro con energía actual.</h2>
        </div>
        <p>
          Tensión Retro es una banda de covers en Tegucigalpa, Honduras,
          enfocada en crear ambientes memorables para público local, bares,
          restaurantes, eventos corporativos y celebraciones privadas.
        </p>
      </section>

      <section className="content-section reveal" id="integrantes">
        <p className="section-kicker">Integrantes</p>
        <h2>La alineación</h2>
        <div className="member-grid">
          {members.map(({ bio, icon: Icon, name, role }) => (
            <MemberCard
              bio={bio}
              Icon={Icon}
              key={name}
              name={name}
              role={role}
            />
          ))}
        </div>
      </section>

      <section className="content-section music-section reveal" id="repertorio">
        <div>
          <p className="section-kicker">Qué tocamos</p>
          <h2>Repertorio flexible para mover la noche.</h2>
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

      <section
        className="content-section upcoming-section reveal"
        id="fechas"
        aria-labelledby="upcoming-title"
      >
        <div className="section-heading upcoming-heading">
          <p className="section-kicker">
            <IconCalendar className="inline-icon" /> Próximas presentaciones
          </p>
          <h2 id="upcoming-title">Fechas confirmadas para vernos en vivo.</h2>
          <p>
            Sigue las próximas fechas de Tensión Retro y guarda tu lugar para la
            siguiente noche de covers, clásicos e indie.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="upcoming-empty">
            <span className="date-badge">Muy pronto</span>
            <p>
              {eventsError
                ? "Muy pronto anunciaremos nuevas fechas"
                : "Muy pronto anunciaremos nuevas fechas"}
            </p>
          </div>
        ) : (
          <>
            <div className="upcoming-grid">
              {visibleEvents.map((event) => (
                <article className="upcoming-card" key={event.id}>
                  <div className="upcoming-card-head">
                    <span className="date-badge">
                      {formatEventBadge(event.eventDate)}
                    </span>
                    <span className="upcoming-time">
                      <IconCalendar className="inline-icon" />
                      {formatEventDate(event.eventDate)} ·{" "}
                      {formatEventTime(event.eventTime)}
                    </span>
                  </div>
                  <h3>{event.title}</h3>
                  <p className="upcoming-location">
                    {event.venue}, {event.city}
                  </p>
                  <p className="upcoming-description">{event.description}</p>
                  {event.facebookUrl && (
                    <a
                      className="button button-secondary upcoming-link"
                      href={event.facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver evento <IconArrow className="button-icon" />
                    </a>
                  )}
                </article>
              ))}
            </div>

            {hasHiddenEvents && (
              <div className="upcoming-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setShowAllEvents((current) => !current)}
                >
                  {showAllEvents ? "Ver menos fechas" : "Ver más fechas"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="content-section contact-section reveal" id="contratacion">
        <div className="contact-copy">
          <p className="section-kicker">Contacto y contrataciones</p>
          <h2>Cuéntanos cómo será tu evento.</h2>
          <p>
            Completa la solicitud con los detalles principales. Respondemos para
            coordinar disponibilidad, formato de show, logística y una propuesta
            adecuada para tu evento.
          </p>

          <div className="booking-note">
            <strong>
              <IconPhone className="inline-icon" /> Contacto directo
            </strong>
            <a href="tel:33017565">33017565</a>
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

        <form className="contact-form booking-form" onSubmit={handleSubmit}>
          <div className="form-heading">
            <span>Solicitud de contratación</span>
            <p>Los campos marcados ayudan a preparar una cotización realista y rápida.</p>
          </div>

          <label>
            Nombre del solicitante <em>Requerido</em>
            <input
              required
              value={form.nombreSolicitante}
              onChange={(event) =>
                updateField("nombreSolicitante", event.target.value)
              }
              placeholder="Tu nombre completo"
            />
          </label>

          <label>
            Teléfono <em>Requerido</em>
            <input
              required
              value={form.telefono}
              onChange={(event) => updateField("telefono", event.target.value)}
              placeholder="Ej. 33017565"
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
            Nombre del local o evento <em>Requerido</em>
            <input
              required
              value={form.nombreEvento}
              onChange={(event) => updateField("nombreEvento", event.target.value)}
              placeholder="Nombre del bar, venue o evento"
            />
          </label>

          <label>
            Tipo de evento <em>Requerido</em>
            <input
              required
              value={form.tipoEvento}
              onChange={(event) => updateField("tipoEvento", event.target.value)}
              placeholder="Bar, boda, cumpleaños, evento privado"
            />
          </label>

          <label>
            Tamaño o cantidad de personas aproximada
            <input
              value={form.cantidadPersonas}
              onChange={(event) =>
                updateField("cantidadPersonas", event.target.value)
              }
              placeholder="Ej. 80 personas, local mediano"
            />
          </label>

          <label className="form-wide">
            Dirección o ubicación <em>Requerido</em>
            <input
              required
              value={form.ubicacion}
              onChange={(event) => updateField("ubicacion", event.target.value)}
              placeholder="Ciudad, local, colonia, referencia o enlace de ubicación"
            />
          </label>

          <label>
            Fecha del evento <em>Requerido</em>
            <input
              required
              type="date"
              value={form.fechaEvento}
              onChange={(event) => updateField("fechaEvento", event.target.value)}
            />
          </label>

          <label>
            Hora estimada
            <input
              type="time"
              value={form.horaEstimada}
              onChange={(event) => updateField("horaEstimada", event.target.value)}
            />
          </label>

          <label>
            Duración esperada
            <input
              value={form.duracionEsperada}
              onChange={(event) =>
                updateField("duracionEsperada", event.target.value)
              }
              placeholder="Ej. 2 horas, 3 sets"
            />
          </label>

          <label>
            Presupuesto aproximado
            <input
              value={form.presupuestoAproximado}
              onChange={(event) =>
                updateField("presupuestoAproximado", event.target.value)
              }
              placeholder="Ej. L 8,000 - L 12,000"
            />
          </label>

          <label className="form-wide">
            Detalles importantes
            <textarea
              value={form.detallesImportantes}
              onChange={(event) =>
                updateField("detallesImportantes", event.target.value)
              }
              placeholder="Equipo disponible, sonido, escenario, acceso, repertorio deseado o cualquier detalle clave"
              rows={5}
            />
          </label>

          <button className="button button-primary form-wide" type="submit" disabled={isSending}>
            {isSending ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Enviando...
              </>
            ) : (
              "Enviar solicitud de contratación"
            )}
          </button>

          {formStatus && (
            <p className={`form-status form-status-${formStatus.tone} form-wide`}>
              {formStatus.message}
            </p>
          )}
        </form>
      </section>

      <footer className="site-footer reveal" aria-label="Pie de página">
        <div className="footer-grid">
          <section className="footer-brand">
            <a className="footer-brand-lockup" href="#inicio" aria-label="Inicio Tensión Retro">
              <img src={LOGO_SRC} alt="Tensión Retro" className="footer-logo" />
              <div>
                <strong>Tensión Retro</strong>
                <p>
                  Banda de covers en Tegucigalpa para eventos, bares y noches en vivo.
                </p>
              </div>
            </a>
          </section>

          <section className="footer-column" aria-labelledby="footer-contacto">
            <p className="footer-kicker" id="footer-contacto">Contacto</p>
            <div className="footer-links">
              <a href="tel:+50433017565">
                <IconPhone className="footer-icon" />
                <span>33017565</span>
              </a>
              <span className="footer-static-item">
                <IconMap className="footer-icon" />
                <span>Tegucigalpa, Honduras</span>
              </span>
              <a href="mailto:xtian.osx@gmail.com">
                <IconMail className="footer-icon" />
                <span>xtian.osx@gmail.com</span>
              </a>
            </div>
          </section>

          <section className="footer-column" aria-labelledby="footer-redes">
            <p className="footer-kicker" id="footer-redes">Redes</p>
            <div className="footer-links">
              {footerSocialLinks.map(({ icon: Icon, name, note, url }) =>
                url ? (
                  <a key={name} href={url} target="_blank" rel="noreferrer">
                    <Icon className="footer-icon" />
                    <span>{name}</span>
                  </a>
                ) : (
                  <span
                    key={name}
                    className="footer-static-item footer-static-item-muted"
                    aria-label={`${name} ${note}`}
                  >
                    <Icon className="footer-icon" />
                    <span>
                      {name}
                      <small>{note}</small>
                    </span>
                  </span>
                )
              )}
            </div>
          </section>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Tensión Retro — Todos los derechos reservados</p>
          <a className="footer-quiet-link" href="#inicio">Volver al inicio</a>
          <a className="footer-quiet-link" href="#admin">Acceso privado</a>
        </div>
      </footer>

      <a
        className="whatsapp-float"
        href="https://wa.me/50433017565?text=Hola%20quiero%20cotizar%20un%20evento%20con%20Tensi%C3%B3n%20Retro"
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
      >
        <IconPhone className="button-icon" /> WhatsApp
        <span className="whatsapp-tooltip">Cotiza tu evento aquí</span>
      </a>
    </main>
  );
}


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

