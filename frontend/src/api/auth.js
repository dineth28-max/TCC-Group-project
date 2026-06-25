import apiClient from "./client";

export const changePassword = (payload) => apiClient.post("/auth/change-password", payload);
