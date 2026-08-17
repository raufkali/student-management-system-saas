const Student = require("./student.model");
const { AppError } = require("../../utils/helpers");
const path = require("path");
const fs = require("fs");
const { UPLOAD_PATH } = require("../../config/env");
const { generatePDF } = require("../../utils/pdf");
const { Parser } = require("json2csv");

class StudentService {
  async createStudent(studentData) {
    // Generate student ID
    if (!studentData.studentId) {
      studentData.studentId = await Student.generateStudentId();
    }

    // Check if email already exists
    const existingEmail = await Student.findOne({ email: studentData.email });
    if (existingEmail) {
      throw new AppError("Email is already registered", 409);
    }

    // Check if phone already exists
    const existingPhone = await Student.findOne({ phone: studentData.phone });
    if (existingPhone) {
      throw new AppError("Phone number is already registered", 409);
    }

    const student = await Student.create(studentData);
    return student;
  }

  async getAllStudents(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const query = {};

    // Apply filters
    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: "i" } },
        { lastName: { $regex: filters.search, $options: "i" } },
        { studentId: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
      ];
    }

    if (filters.grade) query.grade = filters.grade;
    if (filters.section) query.section = filters.section;
    if (filters.status) query.status = filters.status;
    if (filters.fromDate || filters.toDate) {
      query.enrollmentDate = {};
      if (filters.fromDate)
        query.enrollmentDate.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.enrollmentDate.$lte = new Date(filters.toDate);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    try {
      const total = await Student.countDocuments(query);
      const students = await Student.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        // Remove populate if it's causing issues
        // .populate('createdBy', 'firstName lastName email')
        // .populate('updatedBy', 'firstName lastName email')
        .lean();

      return {
        students,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.error("Error fetching students:", error);
      // Return empty result on error
      return {
        students: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  }

  async getStudentById(studentId) {
    const student = await Student.findById(studentId)
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email");

    if (!student) {
      throw new AppError("Student not found", 404);
    }

    return student;
  }

  async updateStudent(studentId, updates) {
    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    // Check for duplicate email if being updated
    if (updates.email && updates.email !== student.email) {
      const existingEmail = await Student.findOne({
        email: updates.email,
        _id: { $ne: studentId },
      });
      if (existingEmail) {
        throw new AppError("Email is already registered", 409);
      }
    }

    // Check for duplicate phone if being updated
    if (updates.phone && updates.phone !== student.phone) {
      const existingPhone = await Student.findOne({
        phone: updates.phone,
        _id: { $ne: studentId },
      });
      if (existingPhone) {
        throw new AppError("Phone number is already registered", 409);
      }
    }

    // Update student
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      { $set: updates },
      { new: true, runValidators: true },
    )
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email");

    return updatedStudent;
  }

  async deleteStudent(studentId) {
    const student = await Student.findById(studentId);
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    // Soft delete
    student.isDeleted = true;
    student.deletedAt = new Date();
    await student.save();

    return student;
  }

  async permanentlyDeleteStudent(studentId) {
    const student = await Student.findById(studentId);
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    // Delete associated files
    if (student.photo) {
      const photoPath = path.join(UPLOAD_PATH, student.photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    // Delete student
    await student.deleteOne();
    return student;
  }

  async restoreStudent(studentId) {
    const student = await Student.findById(studentId);
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    if (!student.isDeleted) {
      throw new AppError("Student is not deleted", 400);
    }

    student.isDeleted = false;
    student.deletedAt = undefined;
    await student.save();

    return student;
  }

  async uploadPhoto(studentId, photoPath) {
    const student = await Student.findById(studentId);
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    // Delete old photo if exists
    if (student.photo) {
      const oldPhotoPath = path.join(UPLOAD_PATH, student.photo);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Save new photo path
    const relativePath = path.relative(UPLOAD_PATH, photoPath);
    student.photo = relativePath;
    await student.save();

    return student;
  }

  async exportStudents(filters = {}, format = "json") {
    const students = await Student.find(filters)
      .populate("createdBy", "firstName lastName email")
      .lean();

    const exportData = students.map((student) => ({
      studentId: student.studentId,
      name: `${student.firstName} ${student.lastName}`,
      email: student.email,
      phone: student.phone,
      grade: student.grade,
      section: student.section,
      status: student.status,
      enrollmentDate: student.enrollmentDate,
    }));

    if (format === "csv") {
      // Generate CSV
      const parser = new Parser();
      return parser.parse(exportData);
    } else if (format === "pdf") {
      // Generate PDF
      return await generatePDF({
        title: "Student Report",
        data: exportData,
        columns: [
          "Student ID",
          "Name",
          "Email",
          "Phone",
          "Grade",
          "Section",
          "Status",
          "Enrollment Date",
        ],
      });
    } else {
      // JSON
      return JSON.stringify(exportData, null, 2);
    }
  }

  async importStudents(filePath, userId) {
    try {
      // Read file
      const fileContent = fs.readFileSync(filePath, "utf8");
      let studentsData;

      // Parse based on file extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".json") {
        studentsData = JSON.parse(fileContent);
      } else if (ext === ".csv") {
        // Parse CSV using csv-parse
        const { parse } = require("csv-parse/sync");
        studentsData = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
        });
      } else {
        throw new AppError(
          "Unsupported file format. Please use JSON or CSV.",
          400,
        );
      }

      // Process each student
      const results = {
        successful: [],
        failed: [],
        total: studentsData.length,
      };

      for (const data of studentsData) {
        try {
          // Map CSV columns to model fields if needed
          const studentData = {
            ...data,
            createdBy: userId,
          };

          const student = await this.createStudent(studentData);
          results.successful.push({
            studentId: student.studentId,
            name: `${student.firstName} ${student.lastName}`,
          });
        } catch (error) {
          results.failed.push({
            data,
            error: error.message,
          });
        }
      }

      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return results;
    } catch (error) {
      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }

  async getStatistics() {
    const total = await Student.countDocuments({ isDeleted: { $ne: true } });
    const active = await Student.countDocuments({
      status: "active",
      isDeleted: { $ne: true },
    });
    const byGrade = await Student.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: "$grade", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const byGender = await Student.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]);
    const recentEnrollments = await Student.find({
      isDeleted: { $ne: true },
      enrollmentDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }).countDocuments();

    return {
      total,
      active,
      inactive: total - active,
      byGrade,
      byGender,
      recentEnrollments,
      lastUpdated: new Date(),
    };
  }

  async getStudentsByGrade(grade) {
    const students = await Student.find({
      grade: grade.toUpperCase(),
      isDeleted: { $ne: true },
    }).sort({ firstName: 1 });

    return students;
  }

  async searchStudents(searchTerm) {
    return await Student.searchStudents(searchTerm);
  }
}

module.exports = new StudentService();
