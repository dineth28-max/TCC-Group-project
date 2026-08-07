import apiClient from "./client";

export const listTimetableSlots = (params = {}) => apiClient.get("/timetable", { params }).then((r) => r.data);

export const createTimetableSlot = (payload) => apiClient.post("/timetable", payload).then((r) => r.data);

export const deleteTimetableSlot = (id) => apiClient.delete(`/timetable/${id}`);
