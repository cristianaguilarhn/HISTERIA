export type VisitCounter = {
  count: number;
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
  message: string;
};

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function registerVisit(): Promise<VisitCounter> {
  const response = await fetch(`${API_URL}/visits`, {
    method: "POST",
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
