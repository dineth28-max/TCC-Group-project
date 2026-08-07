import apiClient from "./client";

export const listMyChildren = () => apiClient.get("/portal/children").then((r) => r.data);

export const getChildAttendance = (studentId) =>
  apiClient.get(`/portal/children/${studentId}/attendance`).then((r) => r.data);

export const getChildFees = (studentId) => apiClient.get(`/portal/children/${studentId}/fees`).then((r) => r.data);

export const listPortalAnnouncements = () => apiClient.get("/portal/announcements").then((r) => r.data);

export const listMyNotifications = () => apiClient.get("/portal/notifications").then((r) => r.data);

export const markNotificationRead = (id) => apiClient.post(`/portal/notifications/${id}/read`);
