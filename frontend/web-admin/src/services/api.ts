export type VisitCounter = {
  count: number;
  sessionId?: string;
};

export type ContactFormPayload = {
  nombreSolicitante: string;
  telefono: string;
  correo: string;
  nombreEvento: string;
  tipoEvento: string;
  cantidadPersonas: string;
  ubicacion: string;
  fechaEvento: string;
  horaEstimada: string;
  duracionEsperada: string;
  presupuestoAproximado: string;
  detallesImportantes: string;
};

export type ContactResponse = {
  success: boolean;
  emailSent: boolean;
  message: string;
};

export type AdminLoginResponse = {
  token: string;
  username: string;
  memberName: string;
  expiresAt: string;
};

export type MetricPoint = {
  date: string;
  count: number;
};

export type AdminMetrics = {
  totalVisits: number;
  trackedVisits: number;
  activeSessions: number;
  totalContactRequests: number;
  conversionRate: number;
  visitsByDay: MetricPoint[];
  contactRequestsByDay: MetricPoint[];
  activeSessionsByCountry: MetricPoint[];
  recentActiveSessions: ActiveSession[];
};

export type ContactRequestRecord = ContactFormPayload & {
  id: number;
  receivedAt: string;
};

export type ActiveSession = {
  sessionId: string;
  country?: string;
  ipAddress?: string;
  path?: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type AdminUser = {
  id: number;
  username: string;
  displayName: string;
  createdAt: string;
};

export type CreateAdminUserPayload = {
  username: string;
  displayName: string;
  password: string;
};

export type ChangeAdminPasswordPayload = {
  username: string;
  currentPassword: string;
  newPassword: string;
};

export type PresentationStatus = "upcoming" | "completed";

export type PresentationEvent = {
  id: number;
  title: string;
  venue: string;
  city: string;
  eventDate: string;
  eventTime: string;
  description: string;
  facebookUrl?: string | null;
  status: PresentationStatus;
  createdAt: string;
};

export type CreatePresentationEventPayload = {
  title: string;
  venue: string;
  city: string;
  eventDate: string;
  eventTime: string;
  description: string;
  facebookUrl: string;
  status: PresentationStatus;
};

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function registerVisit(sessionId: string): Promise<VisitCounter> {
  const response = await fetch(`${API_URL}/visits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: `${window.location.pathname}${window.location.hash}`,
      sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error("No se pudo registrar la visita");
  }

  return response.json();
}

export async function sendContactMessage(
  payload: ContactFormPayload
): Promise<ContactResponse> {
  const response = await fetch(`${API_URL}/contact`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as ContactResponse;

  if (!response.ok) {
    throw new Error(data.message || "No se pudo enviar el mensaje");
  }

  return data;
}

export async function loginAdmin(
  memberName: string,
  password: string
): Promise<AdminLoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ memberName, password }),
  });

  if (!response.ok) {
    throw new Error("No se pudo iniciar sesion. Revisa la contrasena.");
  }

  return response.json();
}

export async function sendVisitHeartbeat(sessionId: string): Promise<void> {
  const response = await fetch(`${API_URL}/visits/heartbeat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: `${window.location.pathname}${window.location.hash}`,
      sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error("No se pudo actualizar la sesion activa");
  }
}

export async function getAdminMetrics(token: string): Promise<AdminMetrics> {
  const response = await fetch(`${API_URL}/admin/metrics`, {
    headers: getAdminHeaders(token),
  });

  if (!response.ok) {
    throw new Error("No se pudieron cargar las metricas.");
  }

  return response.json();
}

export async function getAdminContacts(
  token: string
): Promise<ContactRequestRecord[]> {
  const response = await fetch(`${API_URL}/admin/contacts`, {
    headers: getAdminHeaders(token),
  });

  if (!response.ok) {
    throw new Error("No se pudieron cargar las solicitudes.");
  }

  return response.json();
}

export async function downloadContactsCsv(token: string): Promise<Blob> {
  const response = await fetch(`${API_URL}/admin/contacts/export`, {
    headers: getAdminHeaders(token),
  });

  if (!response.ok) {
    throw new Error("No se pudo exportar el CSV.");
  }

  return response.blob();
}

export async function deleteAdminContact(
  token: string,
  contactId: number
): Promise<void> {
  const response = await fetch(`${API_URL}/admin/contacts/${contactId}`, {
    method: "DELETE",
    headers: getAdminHeaders(token),
  });

  if (!response.ok) {
    throw new Error("No se pudo borrar la solicitud.");
  }
}

export async function getAdminUsers(token: string): Promise<AdminUser[]> {
  const response = await fetch(`${API_URL}/admin/users`, {
    headers: getAdminHeaders(token),
  });

  if (!response.ok) {
    throw new Error("No se pudieron cargar las cuentas admin.");
  }

  return response.json();
}

export async function getUpcomingEvents(): Promise<PresentationEvent[]> {
  const response = await fetch(`${API_URL}/events`);

  if (!response.ok) {
    throw new Error("No se pudieron cargar las próximas presentaciones.");
  }

  return response.json();
}

export async function getAdminEvents(
  token: string
): Promise<PresentationEvent[]> {
  const response = await fetch(`${API_URL}/admin/events`, {
    headers: getAdminHeaders(token),
  });

  if (!response.ok) {
    throw new Error("No se pudieron cargar los eventos.");
  }

  return response.json();
}

export async function createAdminEvent(
  token: string,
  payload: CreatePresentationEventPayload
): Promise<PresentationEvent> {
  const response = await fetch(`${API_URL}/admin/events`, {
    method: "POST",
    headers: {
      ...getAdminHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "No se pudo crear el evento.");
  }

  return response.json();
}

export async function deleteAdminEvent(
  token: string,
  eventId: number
): Promise<void> {
  const response = await fetch(`${API_URL}/admin/events/${eventId}`, {
    method: "DELETE",
    headers: getAdminHeaders(token),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "No se pudo borrar el evento.");
  }
}

export async function createAdminUser(
  token: string,
  payload: CreateAdminUserPayload
): Promise<AdminUser> {
  const response = await fetch(`${API_URL}/admin/users`, {
    method: "POST",
    headers: {
      ...getAdminHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "No se pudo crear la cuenta admin.");
  }

  return response.json();
}

export async function deleteAdminUser(
  token: string,
  userId: number
): Promise<void> {
  const response = await fetch(`${API_URL}/admin/users/${userId}`, {
    method: "DELETE",
    headers: getAdminHeaders(token),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "No se pudo borrar la cuenta admin.");
  }
}

export async function changeAdminPassword(
  token: string,
  payload: ChangeAdminPasswordPayload
): Promise<void> {
  const response = await fetch(`${API_URL}/admin/users/change-password`, {
    method: "POST",
    headers: {
      ...getAdminHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || "No se pudo cambiar la contrasena.");
  }
}

function getAdminHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}
