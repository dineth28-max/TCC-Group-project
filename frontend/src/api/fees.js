import apiClient from "./client";

export const listFeeStructures = () => apiClient.get("/fees/structures").then((r) => r.data);

export const createFeeStructure = (payload) => apiClient.post("/fees/structures", payload).then((r) => r.data);

export const listDiscounts = () => apiClient.get("/fees/discounts").then((r) => r.data);

export const createDiscount = (payload) => apiClient.post("/fees/discounts", payload).then((r) => r.data);

export const deactivateDiscount = (id) => apiClient.delete(`/fees/discounts/${id}`);

export const listInvoices = (params = {}) => apiClient.get("/fees/invoices", { params }).then((r) => r.data);

export const recordPayment = (invoiceId, payload) =>
  apiClient.post(`/fees/invoices/${invoiceId}/payments`, payload).then((r) => r.data);

export const runBilling = (period) =>
  apiClient.post("/fees/run-billing", null, { params: period ? { period } : {} }).then((r) => r.data);

export const getCollectionSummary = (period) =>
  apiClient.get("/fees/collection-summary", { params: period ? { period } : {} }).then((r) => r.data);

export const exportFees = (period) =>
  apiClient.get("/fees/export", { params: period ? { period } : {}, responseType: "blob" }).then((r) => r.data);
