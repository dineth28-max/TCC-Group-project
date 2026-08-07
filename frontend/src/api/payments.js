import apiClient from "./client";

export const getPaymentAccount = () => apiClient.get("/settings/payment-account").then((r) => r.data);

export const updatePaymentAccount = (payload) => apiClient.put("/settings/payment-account", payload).then((r) => r.data);

export const getRevenueSplit = () => apiClient.get("/settings/revenue-split").then((r) => r.data);

export const updateRevenueSplit = (payload) => apiClient.put("/settings/revenue-split", payload).then((r) => r.data);

export const getTeacherRevenueSummary = () => apiClient.get("/teacher-revenue/summary").then((r) => r.data);

export const listTeacherRevenueTransactions = (params = {}) =>
  apiClient.get("/teacher-revenue/transactions", { params }).then((r) => r.data);

export const markTeacherEarningPaid = (id) => apiClient.post(`/teacher-revenue/transactions/${id}/mark-paid`);

export const getTeacherBankDetails = (teacherId) =>
  apiClient.get(`/teacher-revenue/bank-details/${teacherId}`).then((r) => r.data);

export const saveTeacherBankDetails = (teacherId, payload) =>
  apiClient.put(`/teacher-revenue/bank-details/${teacherId}`, payload).then((r) => r.data);

export const getMyBankDetails = () => apiClient.get("/teacher/bank-details").then((r) => r.data);

export const saveMyBankDetails = (payload) => apiClient.put("/teacher/bank-details", payload).then((r) => r.data);

export const payMyInvoice = (invoiceId) => apiClient.post("/me/payments/checkout", { invoiceId }).then((r) => r.data);

export const payChildInvoice = (studentId, invoiceId) =>
  apiClient.post(`/portal/children/${studentId}/payments/checkout`, { invoiceId }).then((r) => r.data);

export const getInstituteBankDetails = () => apiClient.get("/settings/institute-bank-details").then((r) => r.data);

export const saveInstituteBankDetails = (payload) =>
  apiClient.put("/settings/institute-bank-details", payload).then((r) => r.data);

export const listAuditLog = () => apiClient.get("/admin/audit-log").then((r) => r.data);
