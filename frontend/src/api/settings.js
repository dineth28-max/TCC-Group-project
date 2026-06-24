import apiClient from "./client";

export const getSettings = () => apiClient.get("/settings").then((r) => r.data);

export const updateSettings = (payload) => apiClient.put("/settings", payload).then((r) => r.data);
