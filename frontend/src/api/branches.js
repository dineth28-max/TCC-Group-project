import apiClient from "./client";

export const listBranches = (params = {}) => apiClient.get("/branches", { params }).then((r) => r.data);

export const getBranch = (id) => apiClient.get(`/branches/${id}`).then((r) => r.data);

export const createBranch = (payload) => apiClient.post("/branches", payload).then((r) => r.data);

export const updateBranch = (id, payload) => apiClient.put(`/branches/${id}`, payload).then((r) => r.data);

export const deactivateBranch = (id) => apiClient.post(`/branches/${id}/deactivate`);

export const reactivateBranch = (id) => apiClient.post(`/branches/${id}/reactivate`);
