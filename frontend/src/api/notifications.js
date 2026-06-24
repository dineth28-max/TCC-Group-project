import apiClient from "./client";

export const listTemplates = () => apiClient.get("/notifications/templates").then((r) => r.data);

export const updateTemplate = (eventType, payload) =>
  apiClient.put(`/notifications/templates/${eventType}`, payload).then((r) => r.data);

export const getDeliveryLog = (params = {}) => apiClient.get("/notifications/delivery-log", { params }).then((r) => r.data);
