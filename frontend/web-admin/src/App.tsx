import { type FormEvent, type SVGProps, useEffect, useState } from "react";
import {
  registerVisit,
  sendContactMessage,
  type ContactFormPayload,
} from "./services/api";

type IconProps = SVGProps<SVGSVGElement>;
type VisitCounterStatus = "loading" | "ready" | "error";

const LOGO_SRC = "/logo.png";

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

const members = [
  { name: "Christopher Valladares", role: "Vocalista" },
  { name: "Cristian Aguilar", role: "Guitarrista" },
  { name: "Wilmer Dávila", role: "Bajista" },
  { name: "Rolando Ardón", role: "Baterista" },
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
    url: "https://www.facebook.com/search/top?q=Tensi%C3%B3n%20Retro",
    icon: IconFacebook,
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/explore/search/keyword/?q=Tensi%C3%B3n%20Retro",
    icon: IconInstagram,
  },
  {
    name: "TikTok",
    url: "https://www.tiktok.com/search?q=Tensi%C3%B3n%20Retro",
    icon: IconTikTok,
  },
];

const heroHighlights = [
  { label: "Covers en vivo", icon: IconMusic },
  { label: "Eventos y bares", icon: IconCalendar },
  { label: "Contrataciones en Tegucigalpa", icon: IconMap },
];

const liveVideos = [
  {
    title: "Videos en vivo",
    src: "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?rel=0",
  },
  {
    title: "Clasicos e indie con sonido de banda",
    src: "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?rel=0",
  },
  {
    title: "Ambiente en vivo para bares y eventos",
    src: "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?rel=0",
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

function App() {
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [visitStatus, setVisitStatus] = useState<VisitCounterStatus>("loading");
  const [form, setForm] = useState<ContactFormPayload>(initialForm);
  const [isSending, setIsSending] = useState(false);
  const [formStatus, setFormStatus] = useState<string | null>(null);

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

    registerVisit()
      .then(({ count }) => {
        setVisitCount(count);
        setVisitStatus("ready");
      })
      .catch((error) => {
        console.error(error);
        setVisitCount(null);
        setVisitStatus("error");
      });

    return () => observer.disconnect();
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
      setFormStatus(response.message);
      setForm(initialForm);
    } catch (error) {
      setFormStatus(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la solicitud. Inténtalo de nuevo."
      );
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
            <strong>33017565</strong>
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
            o celebracion. Estos videos son placeholders de YouTube por ahora.
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
          {members.map((member) => (
            <article className="member-card" key={member.name}>
              <span>{member.role}</span>
              <h3>{member.name}</h3>
            </article>
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
            {isSending ? "Enviando..." : "Enviar solicitud de contratación"}
          </button>

          {formStatus && <p className="form-status form-wide">{formStatus}</p>}
        </form>
      </section>

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
