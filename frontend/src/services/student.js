import api from "./api";

export const studentService = {
  // Get all students with pagination and filters
  getAll: async (params) => {
    const response = await api.get("/students", { params });
    return response.data;
  },

  // Get student by ID
  getById: async (id) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  // Create new student
  create: async (data) => {
    const response = await api.post("/students", data);
    return response.data;
  },

  // Update student
  update: async (id, data) => {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },

  // Delete student
  delete: async (id) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },

  // Upload student photo
  uploadPhoto: async (id, file) => {
    const formData = new FormData();
    formData.append("photo", file);
    const response = await api.post(`/students/${id}/photo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // Get student statistics
  getStatistics: async () => {
    const response = await api.get("/students/statistics");
    return response.data;
  },

  // Search students
  search: async (query) => {
    const response = await api.get("/students/search", {
      params: { q: query },
    });
    return response.data;
  },

  // Get students by grade
  getByGrade: async (grade) => {
    const response = await api.get(`/students/grade/${grade}`);
    return response.data;
  },

  // Export students
  export: async (format = "json") => {
    const response = await api.get("/students/export", {
      params: { format },
      responseType: "blob",
    });
    return response.data;
  },

  // Import students
  import: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/students/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};
