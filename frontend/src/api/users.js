import apiClient from "./client";

export const listUsers = (params = {}) => apiClient.get("/users", { params }).then((r) => r.data);

export const createUser = (payload) => apiClient.post("/users", payload).then((r) => r.data);

export const updateUser = (id, payload) => apiClient.put(`/users/${id}`, payload).then((r) => r.data);

export const resetUserPassword = (id) => apiClient.post(`/users/${id}/reset-password`).then((r) => r.data);
