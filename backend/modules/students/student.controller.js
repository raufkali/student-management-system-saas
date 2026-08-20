const studentService = require("./student.service");
const { sendSuccess, sendError, sendCreated } = require("../../utils/response");
const { AppError } = require("../../utils/helpers");

class StudentController {
  // Create student
  async createStudent(req, res, next) {
    try {
      const studentData = req.body;
      // Always delete studentId from the request body
      delete studentData.studentId;
      studentData.createdBy = req.user._id;

      const student = await studentService.createStudent(studentData);

      return sendCreated(res, {
        message: "Student created successfully",
        student,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all students with pagination and filters
  async getAllStudents(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        grade,
        section,
        status,
        fromDate,
        toDate,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const filters = {
        search,
        grade,
        section,
        status,
        fromDate,
        toDate,
      };

      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sortBy,
        sortOrder,
      };

      const result = await studentService.getAllStudents(filters, options);

      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // Get student by ID
  async getStudentById(req, res, next) {
    try {
      const { id } = req.params;
      const student = await studentService.getStudentById(id);

      return sendSuccess(res, {
        student,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update student
  async updateStudent(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;
      updates.updatedBy = req.user._id;

      const student = await studentService.updateStudent(id, updates);

      return sendSuccess(res, {
        message: "Student updated successfully",
        student,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete student (soft delete)
  async deleteStudent(req, res, next) {
    try {
      const { id } = req.params;
      await studentService.deleteStudent(id);

      return sendSuccess(res, {
        message: "Student deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Permanently delete student
  async permanentlyDeleteStudent(req, res, next) {
    try {
      const { id } = req.params;
      await studentService.permanentlyDeleteStudent(id);

      return sendSuccess(res, {
        message: "Student permanently deleted",
      });
    } catch (error) {
      next(error);
    }
  }

  // Restore student
  async restoreStudent(req, res, next) {
    try {
      const { id } = req.params;
      const student = await studentService.restoreStudent(id);

      return sendSuccess(res, {
        message: "Student restored successfully",
        student,
      });
    } catch (error) {
      next(error);
    }
  }

  // Upload student photo
  async uploadPhoto(req, res, next) {
    try {
      const { id } = req.params;

      if (!req.file) {
        throw new AppError("No file uploaded", 400);
      }

      const photoPath = req.file.path;
      const student = await studentService.uploadPhoto(id, photoPath);

      return sendSuccess(res, {
        message: "Photo uploaded successfully",
        student,
      });
    } catch (error) {
      next(error);
    }
  }

  // Export students
  async exportStudents(req, res, next) {
    try {
      const { format = "json", ...filters } = req.query;
      const data = await studentService.exportStudents(filters, format);

      // Set response headers based on format
      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=students.csv",
        );
      } else if (format === "pdf") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=students.pdf",
        );
      } else {
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=students.json",
        );
      }

      res.send(data);
    } catch (error) {
      next(error);
    }
  }

  // Get student statistics
  async getStatistics(req, res, next) {
    try {
      const stats = await studentService.getStatistics();

      return sendSuccess(res, {
        statistics: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk import students
  async importStudents(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError("No file uploaded", 400);
      }

      const results = await studentService.importStudents(
        req.file.path,
        req.user._id,
      );

      return sendCreated(res, {
        message: "Students imported successfully",
        results,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get students by grade
  async getStudentsByGrade(req, res, next) {
    try {
      const { grade } = req.params;
      const students = await studentService.getStudentsByGrade(grade);

      return sendSuccess(res, {
        students,
        count: students.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Search students
  async searchStudents(req, res, next) {
    try {
      const { q } = req.query;

      if (!q) {
        throw new AppError("Search term is required", 400);
      }

      const students = await studentService.searchStudents(q);

      return sendSuccess(res, {
        students,
        count: students.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // NEW: Bulk promote students
  async promoteStudents(req, res, next) {
    try {
      const { grade, newGrade, academicYear, status = "active" } = req.body;
      if (!grade || !newGrade || !academicYear) {
        return sendError(
          res,
          "grade, newGrade, and academicYear are required",
          400,
        );
      }
      const result = await studentService.promoteStudents({
        grade,
        newGrade,
        academicYear,
        status,
      });
      return sendSuccess(res, result, "Students promoted successfully");
    } catch (error) {
      next(error);
    }
  }

  // NEW: Bulk fail students
  async failStudents(req, res, next) {
    try {
      const { grade, academicYear, status = "failed" } = req.body;
      if (!grade || !academicYear) {
        return sendError(res, "grade and academicYear are required", 400);
      }
      const result = await studentService.failStudents({
        grade,
        academicYear,
        status,
      });
      return sendSuccess(res, result, "Students marked as failed");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StudentController();
