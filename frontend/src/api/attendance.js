import apiClient from "./client";

export const listMyClasses = () => apiClient.get("/sessions/my-classes").then((r) => r.data);

export const listSessions = (classId) =>
  apiClient.get("/sessions", { params: classId ? { classId } : {} }).then((r) => r.data);

export const createSession = (payload) => apiClient.post("/sessions", payload).then((r) => r.data);

export const getSession = (id) => apiClient.get(`/sessions/${id}`).then((r) => r.data);

export const regenerateQr = (id) => apiClient.post(`/sessions/${id}/qr/regenerate`).then((r) => r.data);

export const getLiveAttendance = (id) => apiClient.get(`/sessions/${id}/live`).then((r) => r.data);

export const overrideAttendance = (sessionId, studentId, payload) =>
  apiClient.post(`/sessions/${sessionId}/attendance/${studentId}/override`, payload);

export const closeSession = (id) => apiClient.post(`/sessions/${id}/close`);

export const checkIn = (payload) => apiClient.post("/attendance/check-in", payload).then((r) => r.data);

export const listFlaggedStudents = (threshold = 75) =>
  apiClient.get("/attendance/flagged", { params: { threshold } }).then((r) => r.data);

export const getClassPerformance = (classId, days = 28) =>
  apiClient.get(`/sessions/classes/${classId}/performance`, { params: { days } }).then((r) => r.data);

export const exportAttendance = (year, month, format) =>
  apiClient
    .get("/attendance/export", { params: { year, month, format }, responseType: "blob" })
    .then((r) => r.data);
