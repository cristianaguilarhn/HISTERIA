import {
  type CSSProperties,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  type SVGProps,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  changeAdminPassword,
  createAdminEvent,
  createAdminUser,
  deleteAdminEvent,
  deleteAdminContact,
  deleteAdminUser,
  downloadContactsCsv,
  getAdminEvents,
  getAdminContacts,
  getAdminMetrics,
  getAdminUsers,
  loginAdmin,
  type AdminLoginResponse,
  type AdminMetrics,
  type AdminUser,
  type ContactRequestRecord,
  type CreatePresentationEventPayload,
  type PresentationEvent,
} from "../services/api";

type IconProps = SVGProps<SVGSVGElement>;
type AdminModule =
  | "metrics"
  | "requests"
  | "events"
  | "users"
  | "settings";
type FormStatus = { tone: "success" | "error"; message: string } | null;
type EventsModuleStatus =
  | { tone: "idle"; message: string }
  | { tone: "loading"; message: string }
  | { tone: "error"; message: string }
  | { tone: "success"; message: string };

const ADMIN_SESSION_KEY = "histeria-admin-session";

const IconLock = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M7 10V8a5 5 0 0 1 10 0v2h2v11H5V10h2Zm2 0h6V8a3 3 0 0 0-6 0v2Zm3 7.2a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z" />
  </svg>
);

const IconChart = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M4 19h16v2H2V3h2v16Zm3-2V9h3v8H7Zm5 0V5h3v12h-3Zm5 0v-6h3v6h-3Z" />
  </svg>
);

const IconDownload = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M11 3h2v9.2l3.6-3.6L18 10l-6 6-6-6 1.4-1.4 3.6 3.6V3ZM5 19h14v2H5v-2Z" />
  </svg>
);

const IconCalendar = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M7 2h2v2h6V2h2v2h3v17H4V4h3V2Zm13 8H4v9h16v-9Z" />
  </svg>
);

const IconLogout = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M4 3h9v2H6v14h7v2H4V3Zm12.6 5.4L21.2 13l-4.6 4.6-1.4-1.4 2.2-2.2H10v-2h7.4l-2.2-2.2 1.4-1.4Z" />
  </svg>
);

const IconTrash = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 12H7.7L7 9Zm3 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z" />
  </svg>
);

const IconUserPlus = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M10 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0 2c3.3 0 6 1.8 6 4v3H4v-3c0-2.2 2.7-4 6-4Zm8-1v-3h2v3h3v2h-3v3h-2v-3h-3v-2h3Z" />
  </svg>
);

const IconMail = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v.3l8 5.3 8-5.3V7H4Zm16 10V9.7l-7.4 4.9a1 1 0 0 1-1.2 0L4 9.7V17h16Z" />
  </svg>
);

const IconMap = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M12 2.5a7 7 0 0 0-7 7c0 5.2 7 12 7 12s7-6.8 7-12a7 7 0 0 0-7-7Zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2Z" />
  </svg>
);

const adminModules: Array<{ id: AdminModule; label: string }> = [
  { id: "metrics", label: "Métricas" },
  { id: "requests", label: "Solicitudes" },
  { id: "events", label: "Eventos" },
  { id: "users", label: "Usuarios" },
  { id: "settings", label: "Configuración" },
];

function loadAdminSession(): AdminLoginResponse | null {
  const storedSession = window.localStorage.getItem(ADMIN_SESSION_KEY);
  if (!storedSession) {
    return null;
  }

  try {
    const session = JSON.parse(storedSession) as AdminLoginResponse;
    if (
      !session.token ||
      !session.username ||
      new Date(session.expiresAt).getTime() <= Date.now()
    ) {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
}

export function AdminPanel() {
  const [session, setSession] = useState<AdminLoginResponse | null>(
    loadAdminSession
  );

  const handleLogin = (nextSession: AdminLoginResponse) => {
    window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    setSession(null);
  };

  return (
    <main className="admin-shell">
      {session ? (
        <AdminWorkspace session={session} onLogout={handleLogout} />
      ) : (
        <AdminLogin onLogin={handleLogin} />
      )}
    </main>
  );
}

function AdminLogin({
  onLogin,
}: {
  onLogin: (session: AdminLoginResponse) => void;
}) {
  const [memberName, setMemberName] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const nextSession = await loginAdmin(memberName, password);
      setPassword("");
      onLogin(nextSession);
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : "No se pudo iniciar sesión."
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <section className="admin-login-screen">
      <a className="admin-brand" href="#inicio" aria-label="Volver a Histeria">
        <img src="/brand/icon-histeria.png" alt="" aria-hidden="true" />
        <span>Histeria</span>
      </a>

      <form className="admin-login-card" onSubmit={handleLogin}>
        <p className="section-kicker">
          <IconLock className="inline-icon" /> Acceso privado
        </p>
        <h1>Panel Histeria</h1>
        <p>
          Gestión interna para métricas, solicitudes, usuarios y futuros
          módulos operativos.
        </p>

        <label>
          Usuario
          <input
            autoComplete="username"
            value={memberName}
            onChange={(event) => setMemberName(event.target.value)}
            placeholder="Cristian"
          />
        </label>

        <label>
          Contraseña
          <input
            autoComplete="current-password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña privada"
          />
        </label>

        <button className="button button-primary" type="submit" disabled={isLoggingIn}>
          {isLoggingIn ? (
            <>
              <span className="button-spinner" aria-hidden="true" />
              Entrando...
            </>
          ) : (
            <>
              <IconLock className="button-icon" /> Entrar
            </>
          )}
        </button>

        {loginError && <p className="form-status form-status-error">{loginError}</p>}
      </form>
    </section>
  );
}

function AdminWorkspace({
  onLogout,
  session,
}: {
  onLogout: () => void;
  session: AdminLoginResponse;
}) {
  const [activeModule, setActiveModule] = useState<AdminModule>("metrics");
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [contacts, setContacts] = useState<ContactRequestRecord[]>([]);
  const [events, setEvents] = useState<PresentationEvent[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [eventsStatus, setEventsStatus] = useState<EventsModuleStatus>({
    tone: "idle",
    message: "",
  });
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [status, setStatus] = useState("Cargando panel...");
  const [actionStatus, setActionStatus] = useState<FormStatus>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    displayName: "",
    password: "",
  });
  const [newEvent, setNewEvent] = useState<CreatePresentationEventPayload>({
    title: "",
    venue: "",
    city: "",
    eventDate: "",
    eventTime: "",
    description: "",
    facebookUrl: "",
    status: "upcoming",
  });
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let isMounted = true;
    setStatus("Cargando panel...");

    Promise.all([
      getAdminMetrics(session.token),
      getAdminContacts(session.token),
      getAdminUsers(session.token),
    ])
      .then(([nextMetrics, nextContacts, nextAdminUsers]) => {
        if (!isMounted) {
          return;
        }

        setMetrics(nextMetrics);
        setContacts(nextContacts);
        setAdminUsers(nextAdminUsers);
        setStatus("");
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setStatus(
          error instanceof Error ? error.message : "No se pudo cargar el panel."
        );
      });

    return () => {
      isMounted = false;
    };
  }, [session.token]);

  useEffect(() => {
    let isMounted = true;
    setEventsStatus({ tone: "loading", message: "Cargando eventos..." });

    getAdminEvents(session.token)
      .then((nextEvents) => {
        if (!isMounted) {
          return;
        }

        setEvents(nextEvents);
        setEventsStatus({ tone: "success", message: "" });
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setEvents([]);
        setEventsStatus({
          tone: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los eventos.",
        });
      });

    return () => {
      isMounted = false;
    };
  }, [session.token]);

  const refreshDashboardData = async () => {
    const [nextMetrics, nextContacts, nextAdminUsers] = await Promise.all([
      getAdminMetrics(session.token),
      getAdminContacts(session.token),
      getAdminUsers(session.token),
    ]);

    setMetrics(nextMetrics);
    setContacts(nextContacts);
    setAdminUsers(nextAdminUsers);
  };

  const refreshEvents = async () => {
    setEventsStatus({ tone: "loading", message: "Cargando eventos..." });

    try {
      const nextEvents = await getAdminEvents(session.token);
      setEvents(nextEvents);
      setEventsStatus({ tone: "success", message: "" });
    } catch (error) {
      setEvents([]);
      setEventsStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los eventos.",
      });
      throw error;
    }
  };

  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return contacts.filter((contact) => {
      const matchesDate = !dateFilter || contact.receivedAt.startsWith(dateFilter);
      const haystack = [
        contact.nombreSolicitante,
        contact.telefono,
        contact.correo,
        contact.nombreEvento,
        contact.tipoEvento,
        contact.ubicacion,
      ]
        .join(" ")
        .toLowerCase();

      return matchesDate && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [contacts, dateFilter, query]);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const blob = await downloadContactsCsv(session.token);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `histeria-solicitudes-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteContact = async (contact: ContactRequestRecord) => {
    const confirmation = window.prompt(
      `Para borrar la solicitud de ${contact.nombreSolicitante}, escribe BORRAR.`
    );

    if (confirmation !== "BORRAR") {
      return;
    }

    setActionStatus(null);

    try {
      await deleteAdminContact(session.token, contact.id);
      await refreshDashboardData();
      setActionStatus({
        tone: "success",
        message: "Solicitud borrada correctamente.",
      });
    } catch (error) {
      setActionStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo borrar la solicitud.",
      });
    }
  };

  const handleCreateAdminUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionStatus(null);

    try {
      await createAdminUser(session.token, newUser);
      setNewUser({ username: "", displayName: "", password: "" });
      await refreshDashboardData();
      setActionStatus({
        tone: "success",
        message: "Cuenta admin creada.",
      });
    } catch (error) {
      setActionStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo crear la cuenta admin.",
      });
    }
  };

  const handleCreateEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionStatus(null);

    try {
      await createAdminEvent(session.token, newEvent);
      setNewEvent({
        title: "",
        venue: "",
        city: "",
        eventDate: "",
        eventTime: "",
        description: "",
        facebookUrl: "",
        status: "upcoming",
      });
      await refreshEvents();
      setActionStatus({
        tone: "success",
        message: "Evento creado correctamente.",
      });
    } catch (error) {
      setActionStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "No se pudo crear el evento.",
      });
    }
  };

  const handleDeleteEvent = async (eventItem: PresentationEvent) => {
    const confirmation = window.prompt(
      `Para borrar el evento "${eventItem.title}", escribe BORRAR.`
    );

    if (confirmation !== "BORRAR") {
      return;
    }

    setActionStatus(null);

    try {
      await deleteAdminEvent(session.token, eventItem.id);
      await refreshEvents();
      setActionStatus({
        tone: "success",
        message: "Evento borrado correctamente.",
      });
    } catch (error) {
      setActionStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "No se pudo borrar el evento.",
      });
    }
  };

  const handleDeleteAdminUser = async (user: AdminUser) => {
    const confirmation = window.prompt(
      `Para borrar la cuenta ${user.username}, escribe BORRAR.`
    );

    if (confirmation !== "BORRAR") {
      return;
    }

    setActionStatus(null);

    try {
      await deleteAdminUser(session.token, user.id);
      await refreshDashboardData();
      setActionStatus({
        tone: "success",
        message: "Cuenta admin borrada.",
      });
    } catch (error) {
      setActionStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo borrar la cuenta admin.",
      });
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionStatus(null);

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      setActionStatus({
        tone: "error",
        message: "La nueva contraseña y la confirmación no coinciden.",
      });
      return;
    }

    try {
      await changeAdminPassword(session.token, {
        username: session.username,
        currentPassword: passwordChange.currentPassword,
        newPassword: passwordChange.newPassword,
      });
      setPasswordChange({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setActionStatus({
        tone: "success",
        message:
          "Contraseña actualizada. Usa la nueva contraseña en tu próximo inicio de sesión.",
      });
    } catch (error) {
      setActionStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cambiar la contraseña.",
      });
    }
  };

  if (status) {
    return <p className="admin-loading">{status}</p>;
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="#inicio" aria-label="Volver a Histeria">
          <img src="/brand/icon-histeria.png" alt="" aria-hidden="true" />
          <span>Histeria</span>
        </a>

        <nav className="admin-nav" aria-label="Módulos admin">
          {adminModules.map((module) => (
            <button
              className={activeModule === module.id ? "is-active" : ""}
              key={module.id}
              type="button"
              onClick={() => setActiveModule(module.id)}
            >
              {module.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="section-kicker">
              <IconLock className="inline-icon" /> Privado
            </p>
            <h1>Panel Histeria</h1>
            <p>Sesión activa: {session.memberName}</p>
          </div>
          <button className="button button-secondary" type="button" onClick={onLogout}>
            <IconLogout className="button-icon" /> Salir
          </button>
        </header>

        {actionStatus && (
          <p className={`form-status form-status-${actionStatus.tone}`}>
            {actionStatus.message}
          </p>
        )}

        {activeModule === "metrics" && (
          <MetricsModule metrics={metrics} />
        )}

        {activeModule === "requests" && (
          <RequestsModule
            contacts={contacts}
            dateFilter={dateFilter}
            filteredContacts={filteredContacts}
            isExporting={isExporting}
            onDateFilterChange={setDateFilter}
            onDeleteContact={handleDeleteContact}
            onExport={handleExport}
            onQueryChange={setQuery}
            query={query}
          />
        )}

        {activeModule === "users" && (
          <UsersModule
            adminUsers={adminUsers}
            newUser={newUser}
            onCreateAdminUser={handleCreateAdminUser}
            onDeleteAdminUser={handleDeleteAdminUser}
            onNewUserChange={setNewUser}
          />
        )}

        {activeModule === "events" && (
          <EventsModule
            events={events}
            eventsStatus={eventsStatus}
            newEvent={newEvent}
            onCreateEvent={handleCreateEvent}
            onDeleteEvent={handleDeleteEvent}
            onNewEventChange={setNewEvent}
          />
        )}

        {activeModule === "settings" && (
          <SettingsModule
            onChangePassword={handleChangePassword}
            passwordChange={passwordChange}
            session={session}
            setPasswordChange={setPasswordChange}
          />
        )}
      </section>
    </div>
  );
}

function MetricsModule({ metrics }: { metrics: AdminMetrics }) {
  return (
    <div className="admin-dashboard">
      <div className="metric-grid">
        <MetricCard label="Visitas totales" value={metrics.totalVisits} />
        <MetricCard label="Activos ahora" value={metrics.activeSessions} />
        <MetricCard label="Solicitudes" value={metrics.totalContactRequests} />
        <MetricCard label="Conversion" value={`${metrics.conversionRate}%`} />
        <MetricCard label="Visitas registradas" value={metrics.trackedVisits} />
      </div>

      <div className="dashboard-grid">
        <article className="chart-panel">
          <div className="panel-title">
            <IconChart className="inline-icon" />
            <h3>Visitas por día</h3>
          </div>
          <BarChart points={metrics.visitsByDay} />
        </article>

        <article className="chart-panel">
          <div className="panel-title">
            <IconMail className="inline-icon" />
            <h3>Solicitudes por día</h3>
          </div>
          <BarChart points={metrics.contactRequestsByDay} />
        </article>
      </div>

      <div className="dashboard-grid">
        <article className="chart-panel">
          <div className="panel-title">
            <IconMap className="inline-icon" />
            <h3>Activos por país</h3>
          </div>
          <BarChart points={metrics.activeSessionsByCountry} />
        </article>

        <article className="chart-panel">
          <div className="panel-title">
            <IconLock className="inline-icon" />
            <h3>Sesiones recientes</h3>
          </div>
          <div className="active-session-list">
            {metrics.recentActiveSessions.map((activeSession) => (
              <div key={activeSession.sessionId}>
                <strong>{activeSession.country || "Desconocido"}</strong>
                <span>{activeSession.ipAddress || "IP no disponible"}</span>
                <span>{activeSession.path || "/"}</span>
                <small>{formatDateTime(activeSession.lastSeenAt)}</small>
              </div>
            ))}
            {metrics.recentActiveSessions.length === 0 && (
              <p className="empty-state">Sin sesiones activas ahora.</p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

function RequestsModule({
  contacts,
  dateFilter,
  filteredContacts,
  isExporting,
  onDateFilterChange,
  onDeleteContact,
  onExport,
  onQueryChange,
  query,
}: {
  contacts: ContactRequestRecord[];
  dateFilter: string;
  filteredContacts: ContactRequestRecord[];
  isExporting: boolean;
  onDateFilterChange: (value: string) => void;
  onDeleteContact: (contact: ContactRequestRecord) => void;
  onExport: () => void;
  onQueryChange: (value: string) => void;
  query: string;
}) {
  return (
    <article className="requests-panel">
      <div className="requests-toolbar">
        <div>
          <h3>Solicitudes recibidas</h3>
          <p>{filteredContacts.length} de {contacts.length} solicitudes</p>
        </div>
        <div className="request-filters">
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar por nombre, evento o telefono"
          />
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => onDateFilterChange(event.target.value)}
          />
          <button className="button button-secondary" type="button" onClick={onExport} disabled={isExporting}>
            <IconDownload className="button-icon" />
            {isExporting ? "Exportando..." : "CSV"}
          </button>
        </div>
      </div>

      <div className="requests-table-wrap">
        <table className="requests-table">
          <thead>
            <tr>
              <th>Recibido</th>
              <th>Contacto</th>
              <th>Evento</th>
              <th>Fecha</th>
              <th>Ubicacion</th>
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.map((contact) => (
              <tr key={contact.id}>
                <td>{formatDateTime(contact.receivedAt)}</td>
                <td>
                  <strong>{contact.nombreSolicitante}</strong>
                  <span>{contact.telefono}</span>
                  {contact.correo && <span>{contact.correo}</span>}
                </td>
                <td>
                  <strong>{contact.nombreEvento}</strong>
                  <span>{contact.tipoEvento}</span>
                  {contact.presupuestoAproximado && (
                    <span>{contact.presupuestoAproximado}</span>
                  )}
                </td>
                <td>
                  <strong>{contact.fechaEvento}</strong>
                  {contact.horaEstimada && <span>{contact.horaEstimada}</span>}
                </td>
                <td>{contact.ubicacion}</td>
                <td>
                  <button
                    className="icon-action icon-action-danger"
                    type="button"
                    onClick={() => onDeleteContact(contact)}
                    aria-label={`Borrar solicitud de ${contact.nombreSolicitante}`}
                  >
                    <IconTrash className="button-icon" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredContacts.length === 0 && (
          <p className="empty-state">No hay solicitudes con esos filtros.</p>
        )}
      </div>
    </article>
  );
}

function UsersModule({
  adminUsers,
  newUser,
  onCreateAdminUser,
  onDeleteAdminUser,
  onNewUserChange,
}: {
  adminUsers: AdminUser[];
  newUser: { username: string; displayName: string; password: string };
  onCreateAdminUser: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteAdminUser: (user: AdminUser) => void;
  onNewUserChange: Dispatch<
    SetStateAction<{ username: string; displayName: string; password: string }>
  >;
}) {
  return (
    <article className="requests-panel">
      <div className="requests-toolbar">
        <div>
          <h3>Cuentas admin</h3>
          <p>{adminUsers.length} cuentas activas</p>
        </div>
      </div>

      <form className="admin-user-form" onSubmit={onCreateAdminUser}>
        <input
          required
          value={newUser.username}
          onChange={(event) =>
            onNewUserChange((current) => ({
              ...current,
              username: event.target.value,
            }))
          }
          placeholder="Usuario"
        />
        <input
          required
          value={newUser.displayName}
          onChange={(event) =>
            onNewUserChange((current) => ({
              ...current,
              displayName: event.target.value,
            }))
          }
          placeholder="Nombre visible"
        />
        <input
          required
          minLength={10}
          type="password"
          value={newUser.password}
          onChange={(event) =>
            onNewUserChange((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
          placeholder="Contraseña segura"
        />
        <button className="button button-primary" type="submit">
          <IconUserPlus className="button-icon" /> Agregar
        </button>
      </form>

      <div className="admin-user-list">
        {adminUsers.map((user) => (
          <div key={user.id}>
            <div>
              <strong>{user.displayName}</strong>
              <span>{user.username}</span>
            </div>
            <small>{formatDateTime(user.createdAt)}</small>
            <button
              className="icon-action icon-action-danger"
              type="button"
              onClick={() => onDeleteAdminUser(user)}
              aria-label={`Borrar cuenta ${user.username}`}
            >
              <IconTrash className="button-icon" />
            </button>
          </div>
        ))}
      </div>
    </article>
  );
}

function EventsModule({
  events,
  eventsStatus,
  newEvent,
  onCreateEvent,
  onDeleteEvent,
  onNewEventChange,
}: {
  events: PresentationEvent[];
  eventsStatus: EventsModuleStatus;
  newEvent: CreatePresentationEventPayload;
  onCreateEvent: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteEvent: (event: PresentationEvent) => void;
  onNewEventChange: Dispatch<SetStateAction<CreatePresentationEventPayload>>;
}) {
  return (
    <article className="requests-panel">
      <div className="requests-toolbar">
        <div>
          <h3>Próximas presentaciones</h3>
          <p>{events.length} eventos registrados</p>
        </div>
      </div>

      {eventsStatus.tone === "error" && (
        <p className="form-status form-status-error">{eventsStatus.message}</p>
      )}

      <form className="admin-event-form" onSubmit={onCreateEvent}>
        <input
          required
          value={newEvent.title}
          onChange={(event) =>
            onNewEventChange((current) => ({
              ...current,
              title: event.target.value,
            }))
          }
          placeholder="Título del evento"
        />
        <input
          required
          value={newEvent.venue}
          onChange={(event) =>
            onNewEventChange((current) => ({
              ...current,
              venue: event.target.value,
            }))
          }
          placeholder="Venue o local"
        />
        <input
          required
          value={newEvent.city}
          onChange={(event) =>
            onNewEventChange((current) => ({
              ...current,
              city: event.target.value,
            }))
          }
          placeholder="Ciudad"
        />
        <input
          required
          type="date"
          value={newEvent.eventDate}
          onChange={(event) =>
            onNewEventChange((current) => ({
              ...current,
              eventDate: event.target.value,
            }))
          }
        />
        <input
          required
          type="time"
          value={newEvent.eventTime}
          onChange={(event) =>
            onNewEventChange((current) => ({
              ...current,
              eventTime: event.target.value,
            }))
          }
        />
        <select
          value={newEvent.status}
          onChange={(event) =>
            onNewEventChange((current) => ({
              ...current,
              status: event.target.value as CreatePresentationEventPayload["status"],
            }))
          }
        >
          <option value="upcoming">Próximo</option>
          <option value="completed">Completado</option>
        </select>
        <input
          value={newEvent.facebookUrl}
          onChange={(event) =>
            onNewEventChange((current) => ({
              ...current,
              facebookUrl: event.target.value,
            }))
          }
          placeholder="URL de Facebook (opcional)"
        />
        <textarea
          required
          value={newEvent.description}
          onChange={(event) =>
            onNewEventChange((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          placeholder="Descripción breve del show"
          rows={4}
        />
        <div className="admin-event-actions">
          <button className="button button-primary" type="submit">
            <IconCalendar className="button-icon" /> Crear evento
          </button>
          <p>Espacio listo para edición futura sin cambiar el modelo.</p>
        </div>
      </form>

      <div className="admin-event-list">
        {eventsStatus.tone === "loading" && (
          <p className="empty-state">Cargando eventos...</p>
        )}
        {events.map((event) => (
          <div key={event.id} className="admin-event-row">
            <div>
              <strong>{event.title}</strong>
              <span>
                {formatEventDate(event.eventDate)} a las {formatEventTime(event.eventTime)}
              </span>
              <span>
                {event.venue}, {event.city}
              </span>
              <small>{event.status === "upcoming" ? "Próximo" : "Completado"}</small>
            </div>
            <p>{event.description}</p>
            <div className="admin-event-row-actions">
              {event.facebookUrl && (
                <a
                  className="button button-secondary"
                  href={event.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver evento
                </a>
              )}
              <button
                className="icon-action icon-action-danger"
                type="button"
                onClick={() => onDeleteEvent(event)}
                aria-label={`Borrar evento ${event.title}`}
              >
                <IconTrash className="button-icon" />
              </button>
            </div>
          </div>
        ))}
        {eventsStatus.tone !== "loading" && events.length === 0 && (
          <p className="empty-state">Todavía no hay eventos cargados.</p>
        )}
      </div>
    </article>
  );
}

function SettingsModule({
  onChangePassword,
  passwordChange,
  session,
  setPasswordChange,
}: {
  onChangePassword: (event: FormEvent<HTMLFormElement>) => void;
  passwordChange: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  session: AdminLoginResponse;
  setPasswordChange: Dispatch<
    SetStateAction<{
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }>
  >;
}) {
  return (
    <article className="requests-panel">
      <div className="requests-toolbar">
        <div>
          <h3>Configuración</h3>
          <p>Sesión actual: {session.username}</p>
        </div>
      </div>

      <form className="admin-user-form" onSubmit={onChangePassword}>
        <input
          autoComplete="current-password"
          required
          type="password"
          value={passwordChange.currentPassword}
          onChange={(event) =>
            setPasswordChange((current) => ({
              ...current,
              currentPassword: event.target.value,
            }))
          }
          placeholder="Contraseña actual"
        />
        <input
          autoComplete="new-password"
          required
          minLength={10}
          type="password"
          value={passwordChange.newPassword}
          onChange={(event) =>
            setPasswordChange((current) => ({
              ...current,
              newPassword: event.target.value,
            }))
          }
          placeholder="Nueva contraseña"
        />
        <input
          autoComplete="new-password"
          required
          minLength={10}
          type="password"
          value={passwordChange.confirmPassword}
          onChange={(event) =>
            setPasswordChange((current) => ({
              ...current,
              confirmPassword: event.target.value,
            }))
          }
          placeholder="Confirmar contraseña"
        />
        <button className="button button-secondary" type="submit">
          <IconLock className="button-icon" /> Cambiar
        </button>
      </form>
    </article>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{typeof value === "number" ? value.toLocaleString("es-HN") : value}</strong>
    </article>
  );
}

function BarChart({ points }: { points: Array<{ date: string; count: number }> }) {
  const visiblePoints = points.slice(-14);
  const maxValue = Math.max(1, ...visiblePoints.map((point) => point.count));

  if (visiblePoints.length === 0) {
    return <p className="empty-state">Sin datos todavía.</p>;
  }

  return (
    <div className="bar-chart" aria-label="Grafica de barras">
      {visiblePoints.map((point) => (
        <div className="bar-item" key={point.date}>
          <span className="bar-value">{point.count}</span>
          <span
            className="bar-track"
            style={{ "--bar-height": `${Math.max(8, (point.count / maxValue) * 100)}%` } as CSSProperties}
          />
          <span className="bar-label">
            {point.date.match(/^\d{4}-\d{2}-\d{2}$/) ? point.date.slice(5) : point.date}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-HN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("es-HN", {
    dateStyle: "full",
  }).format(new Date(`${value}T00:00:00`));
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("es-HN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(`1970-01-01T${value}`));
}

