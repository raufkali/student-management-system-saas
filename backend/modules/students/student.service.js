const Student = require("./student.model");
const { AppError } = require("../../utils/helpers");
const path = require("path");
const fs = require("fs");
const { UPLOAD_PATH } = require("../../config/env");
const { generatePDF } = require("../../utils/pdf");
const { Parser } = require("json2csv");
const XLSX = require("xlsx");

class StudentService {
  async createStudent(studentData) {
    // Remove any studentId that might have been sent
    delete studentData.studentId;

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

    // The pre-save hook will generate the studentId
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

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    try {
      const total = await Student.countDocuments(query);
      const students = await Student.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
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
    const student = await Student.findById(studentId);
    if (!student) {
      throw new AppError("Student not found", 404);
    }

    if (updates.email && updates.email !== student.email) {
      const existingEmail = await Student.findOne({
        email: updates.email,
        _id: { $ne: studentId },
      });
      if (existingEmail) {
        throw new AppError("Email is already registered", 409);
      }
    }

    if (updates.phone && updates.phone !== student.phone) {
      const existingPhone = await Student.findOne({
        phone: updates.phone,
        _id: { $ne: studentId },
      });
      if (existingPhone) {
        throw new AppError("Phone number is already registered", 409);
      }
    }

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

    if (student.photo) {
      const photoPath = path.join(UPLOAD_PATH, student.photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

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

    if (student.photo) {
      const oldPhotoPath = path.join(UPLOAD_PATH, student.photo);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

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
      const parser = new Parser();
      return parser.parse(exportData);
    } else if (format === "pdf") {
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
      return JSON.stringify(exportData, null, 2);
    }
  }

  async importStudents(filePath, userId) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      let studentsData;

      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".json") {
        studentsData = JSON.parse(fileBuffer.toString("utf8"));
      } else if (ext === ".csv") {
        const { parse } = require("csv-parse/sync");
        studentsData = parse(fileBuffer.toString("utf8"), {
          columns: true,
          skip_empty_lines: true,
        });
      } else if (ext === ".xlsx" || ext === ".xls") {
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        studentsData = XLSX.utils.sheet_to_json(worksheet);
      } else {
        throw new AppError(
          "Unsupported file format. Please use JSON, CSV, or Excel (.xlsx, .xls).",
          400,
        );
      }

      const results = {
        successful: [],
        failed: [],
        total: studentsData.length,
      };

      for (const data of studentsData) {
        try {
          // Remove any studentId from import data
          delete data.studentId;
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

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return results;
    } catch (error) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }

  // Safe getStatistics – returns fallback if aggregations fail
  async getStatistics() {
    try {
      const total = await Student.countDocuments({ isDeleted: { $ne: true } });
      const active = await Student.countDocuments({
        status: "active",
        isDeleted: { $ne: true },
      });

      let byGrade = [];
      let byGender = [];
      let recentEnrollments = 0;

      try {
        byGrade = await Student.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: "$grade", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]);
      } catch (aggErr) {
        console.warn("Aggregation byGrade failed:", aggErr.message);
      }

      try {
        byGender = await Student.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: "$gender", count: { $sum: 1 } } },
        ]);
      } catch (aggErr) {
        console.warn("Aggregation byGender failed:", aggErr.message);
      }

      try {
        recentEnrollments = await Student.countDocuments({
          isDeleted: { $ne: true },
          enrollmentDate: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        });
      } catch (countErr) {
        console.warn("Recent enrollments count failed:", countErr.message);
      }

      return {
        total,
        active,
        inactive: total - active,
        byGrade,
        byGender,
        recentEnrollments,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error("getStatistics overall error:", error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byGrade: [],
        byGender: [],
        recentEnrollments: 0,
        lastUpdated: new Date(),
      };
    }
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

  // Bulk promote
  async promoteStudents({ grade, newGrade, academicYear, status = "active" }) {
    const filter = { grade: grade.toUpperCase(), isDeleted: { $ne: true } };
    const update = {
      grade: newGrade.toUpperCase(),
      academicYear,
      status,
      updatedAt: new Date(),
    };
    const result = await Student.updateMany(filter, { $set: update });
    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  // Bulk fail
  async failStudents({ grade, academicYear, status = "failed" }) {
    const filter = { grade: grade.toUpperCase(), isDeleted: { $ne: true } };
    const update = {
      status,
      academicYear,
      updatedAt: new Date(),
    };
    const result = await Student.updateMany(filter, { $set: update });
    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }
}

module.exports = new StudentService();
