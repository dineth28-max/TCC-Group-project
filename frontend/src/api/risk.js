import apiClient from "./client";

export const listRiskStudents = (params = {}) => apiClient.get("/admin/risk-students", { params }).then((r) => r.data);

export const predictStudent = (studentId) =>
  apiClient.post(`/admin/risk-students/${studentId}/predict`).then((r) => r.data);

export const getRiskModel = () => apiClient.get("/admin/risk-students/model").then((r) => r.data);

export const trainRiskModel = () => apiClient.post("/admin/risk-students/model/train").then((r) => r.data);

export const predictClass = (classId) =>
  apiClient.post(`/admin/risk-students/predict-class/${classId}`).then((r) => r.data);
