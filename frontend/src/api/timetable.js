import apiClient from "./client";

export const listTimetableSlots = (params = {}) => apiClient.get("/timetable", { params }).then((r) => r.data);

export const createTimetableSlot = (payload) => apiClient.post("/timetable", payload).then((r) => r.data);

export const deleteTimetableSlot = (id) => apiClient.delete(`/timetable/${id}`);

export const requestTimetableSlot = (payload) => apiClient.post("/timetable/requests", payload).then((r) => r.data);

export const listTimetableSlotRequests = (params = {}) => apiClient.get("/timetable/requests", { params }).then((r) => r.data);

export const approveTimetableSlotRequest = (id, note) =>
  apiClient.post(`/timetable/requests/${id}/approve`, { note }).then((r) => r.data);

export const rejectTimetableSlotRequest = (id, note) =>
  apiClient.post(`/timetable/requests/${id}/reject`, { note }).then((r) => r.data);
