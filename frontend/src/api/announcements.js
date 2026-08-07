import apiClient from "./client";

export const listAnnouncements = () => apiClient.get("/announcements").then((r) => r.data);

export const createAnnouncement = (payload) => apiClient.post("/announcements", payload).then((r) => r.data);

export const deleteAnnouncement = (id) => apiClient.delete(`/announcements/${id}`);
