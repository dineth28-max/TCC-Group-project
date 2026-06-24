import apiClient from "./client";

export const listClasses = (params = {}) => apiClient.get("/classes", { params }).then((r) => r.data);

export const createClass = (payload) => apiClient.post("/classes", payload).then((r) => r.data);

export const updateClass = (id, payload) => apiClient.put(`/classes/${id}`, payload).then((r) => r.data);

export const getClassRoster = (id) => apiClient.get(`/classes/${id}/roster`).then((r) => r.data);
