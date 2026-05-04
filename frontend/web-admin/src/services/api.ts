import { apiBlob, apiRequest } from "../api/client";

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

export type ApiLiveResponse = {
  status: string;
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

export type ActiveSession = {
  sessionId: string;
  country?: string;
  ipAddress?: string;
  path?: string;
  firstSeenAt: string;
  lastSeenAt: string;
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

export function checkApiLive() {
  return apiRequest<ApiLiveResponse>("/live");
}

export function registerVisit(sessionId: string) {
  return apiRequest<VisitCounter>("/visits", {
    method: "POST",
    body: {
      path: `${window.location.pathname}${window.location.hash}`,
      sessionId,
    },
  });
}

export function sendContactMessage(payload: ContactFormPayload) {
  return apiRequest<ContactResponse>("/contact", {
    method: "POST",
    body: payload,
  });
}

export function loginAdmin(memberName: string, password: string) {
  return apiRequest<AdminLoginResponse>("/auth/login", {
    method: "POST",
    body: { memberName, password },
  });
}

export function sendVisitHeartbeat(sessionId: string) {
  return apiRequest<void>("/visits/heartbeat", {
    method: "POST",
    body: {
      path: `${window.location.pathname}${window.location.hash}`,
      sessionId,
    },
  });
}

export function getAdminMetrics(token: string) {
  return apiRequest<AdminMetrics>("/admin/metrics", { authToken: token });
}

export function getAdminContacts(token: string) {
  return apiRequest<ContactRequestRecord[]>("/admin/contacts", {
    authToken: token,
  });
}

export function downloadContactsCsv(token: string) {
  return apiBlob("/admin/contacts/export", { authToken: token });
}

export function deleteAdminContact(token: string, contactId: number) {
  return apiRequest<void>(`/admin/contacts/${contactId}`, {
    authToken: token,
    method: "DELETE",
  });
}

export function getAdminUsers(token: string) {
  return apiRequest<AdminUser[]>("/admin/users", { authToken: token });
}

export function getUpcomingEvents() {
  return apiRequest<PresentationEvent[]>("/events");
}

export function getAdminEvents(token: string) {
  return apiRequest<PresentationEvent[]>("/admin/events", {
    authToken: token,
  });
}

export function createAdminEvent(
  token: string,
  payload: CreatePresentationEventPayload
) {
  return apiRequest<PresentationEvent>("/admin/events", {
    authToken: token,
    method: "POST",
    body: payload,
  });
}

export function deleteAdminEvent(token: string, eventId: number) {
  return apiRequest<void>(`/admin/events/${eventId}`, {
    authToken: token,
    method: "DELETE",
  });
}

export function createAdminUser(token: string, payload: CreateAdminUserPayload) {
  return apiRequest<AdminUser>("/admin/users", {
    authToken: token,
    method: "POST",
    body: payload,
  });
}

export function deleteAdminUser(token: string, userId: number) {
  return apiRequest<void>(`/admin/users/${userId}`, {
    authToken: token,
    method: "DELETE",
  });
}

export function changeAdminPassword(
  token: string,
  payload: ChangeAdminPasswordPayload
) {
  return apiRequest<void>("/admin/users/change-password", {
    authToken: token,
    method: "POST",
    body: payload,
  });
}
