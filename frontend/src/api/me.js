import apiClient from "./client";

export const getMyProfile = () => apiClient.get("/me/profile").then((r) => r.data);

export const getMyTimetable = () => apiClient.get("/me/timetable").then((r) => r.data);

export const getMyFees = () => apiClient.get("/me/fees").then((r) => r.data);

export const getMyParents = () => apiClient.get("/me/parents").then((r) => r.data);

export const addMyParent = (payload) => apiClient.post("/me/parents", payload).then((r) => r.data);
