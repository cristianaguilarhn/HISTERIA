export type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  authToken?: string;
  body?: unknown;
  headers?: HeadersInit;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const response = await request(path, options);

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiBlob(
  path: string,
  options: ApiRequestOptions = {}
): Promise<Blob> {
  const response = await request(path, options);
  return response.blob();
}

async function request(
  path: string,
  { authToken, body, headers, ...init }: ApiRequestOptions
): Promise<Response> {
  if (!apiBaseUrl) {
    throw new ApiError("VITE_API_URL no esta configurada.", 0, null);
  }

  const requestHeaders = new Headers(headers);

  if (authToken) {
    requestHeaders.set("Authorization", `Bearer ${authToken}`);
  }

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await readErrorPayload(response);
    throw new ApiError(getErrorMessage(payload, response), response.status, payload);
  }

  return response;
}

async function readErrorPayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => null);
}

function getErrorMessage(payload: unknown, response: Response) {
  if (payload && typeof payload === "object") {
    const maybeMessage = "message" in payload ? payload.message : undefined;
    const maybeTitle = "title" in payload ? payload.title : undefined;

    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }

    if (typeof maybeTitle === "string" && maybeTitle.trim()) {
      return maybeTitle;
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return `Solicitud fallida (${response.status})`;
}
