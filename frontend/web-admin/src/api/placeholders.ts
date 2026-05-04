import { apiRequest } from "./client";

export type UserSummary = {
  id: number;
  name: string;
};

export type ProductSummary = {
  id: number;
  name: string;
};

export type CreateItemPayload = Record<string, unknown>;

export type CreatedItem = {
  id: number;
};

export function getUsers(authToken?: string) {
  return apiRequest<UserSummary[]>("/users", { authToken });
}

export function getProducts() {
  return apiRequest<ProductSummary[]>("/products");
}

export function createItem(payload: CreateItemPayload, authToken?: string) {
  return apiRequest<CreatedItem>("/items", {
    authToken,
    body: payload,
    method: "POST",
  });
}
