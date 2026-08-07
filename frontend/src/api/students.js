import apiClient from "./client";

export const listStudents = (params = {}) => apiClient.get("/students", { params }).then((r) => r.data);

export const getStudent = (id) => apiClient.get(`/students/${id}`).then((r) => r.data);

export const createStudent = (payload) => apiClient.post("/students", payload).then((r) => r.data);

export const updateStudent = (id, payload) => apiClient.put(`/students/${id}`, payload).then((r) => r.data);

export const deactivateStudent = (id) => apiClient.post(`/students/${id}/deactivate`);

export const reactivateStudent = (id) => apiClient.post(`/students/${id}/reactivate`);

export const enrollStudent = (id, classId) => apiClient.post(`/students/${id}/enrollments`, classId);

export const unenrollStudent = (id, classId) => apiClient.delete(`/students/${id}/enrollments/${classId}`);

export const uploadStudentDocument = (id, file, docType) => {
  const form = new FormData();
  form.append("file", file);
  form.append("docType", docType);
  return apiClient.post(`/students/${id}/documents`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};

export const bulkImportStudents = (file) => {
  const form = new FormData();
  form.append("file", file);
  return apiClient.post("/students/bulk-import", form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};

export const getKpis = () => apiClient.get("/admin/kpis").then((r) => r.data);

export { listBranches } from "./branches";

export const exportStudents = () => apiClient.get("/students/export", { responseType: "blob" }).then((r) => r.data);

export const listParentLinks = (studentId) => apiClient.get(`/students/${studentId}/parent-links`).then((r) => r.data);

export const addParentLink = (studentId, parentUserId) =>
  apiClient.post(`/students/${studentId}/parent-links`, { parentUserId }).then((r) => r.data);

export const removeParentLink = (studentId, linkId) => apiClient.delete(`/students/${studentId}/parent-links/${linkId}`);

export const setStudentCredentials = (studentId, loginEmail, loginPassword) =>
  apiClient.post(`/students/${studentId}/credentials`, { loginEmail, loginPassword }).then((r) => r.data);
