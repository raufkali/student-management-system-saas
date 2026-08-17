// controllers/fee.controller.js
const FeeStructure = require("./fees.structure.model");
const FeeRecord = require("./fees.record.model");
const Student = require("../../modules/students/student.model");

// ============ FEE STRUCTURE CONTROLLERS ============

exports.createFeeStructure = async (req, res, next) => {
  try {
    const feeStructureData = {
      ...req.body,
      createdBy: req.user.id,
    };

    const feeStructure = await FeeStructure.create(feeStructureData);

    res.status(201).json({
      success: true,
      message: "Fee structure created successfully",
      data: feeStructure,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllFeeStructures = async (req, res, next) => {
  try {
    const { grade, academicYear, isActive } = req.query;
    const filter = {};

    if (grade) filter.grade = grade.toUpperCase();
    if (academicYear) filter.academicYear = academicYear;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const feeStructures = await FeeStructure.find(filter)
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: feeStructures,
    });
  } catch (error) {
    next(error);
  }
};

exports.getFeeStructuresByGrade = async (req, res, next) => {
  try {
    const { grade } = req.params;
    const feeStructures = await FeeStructure.find({
      grade: grade.toUpperCase(),
      isActive: true,
    });

    res.json({
      success: true,
      data: feeStructures,
    });
  } catch (error) {
    next(error);
  }
};

exports.getFeeStructureById = async (req, res, next) => {
  try {
    const feeStructure = await FeeStructure.findById(req.params.id).populate(
      "createdBy",
      "firstName lastName email",
    );

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found",
      });
    }

    res.json({
      success: true,
      data: feeStructure,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateFeeStructure = async (req, res, next) => {
  try {
    const feeStructure = await FeeStructure.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    );

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found",
      });
    }

    res.json({
      success: true,
      message: "Fee structure updated successfully",
      data: feeStructure,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteFeeStructure = async (req, res, next) => {
  try {
    const feeStructure = await FeeStructure.findByIdAndDelete(req.params.id);

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found",
      });
    }

    res.json({
      success: true,
      message: "Fee structure deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ============ FEE RECORD CONTROLLERS ============

exports.createFeeRecord = async (req, res, next) => {
  try {
    const { studentId, feeItems, totalFee, academicYear, dueDate, notes } =
      req.body;

    // Get student details
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Create fee record
    const feeRecord = new FeeRecord({
      studentId: student._id,
      studentName: student.getFullName(),
      studentClass: student.grade,
      studentRollNo: student.rollNumber || "",
      academicYear,
      feeItems,
      totalFee,
      totalPaid: 0,
      totalRemaining: totalFee,
      dueDate: dueDate || new Date(),
      notes: notes || "",
      createdBy: req.user.id,
    });

    // Calculate totals
    feeRecord.calculateTotals();

    await feeRecord.save();

    res.status(201).json({
      success: true,
      message: "Fee record created successfully",
      data: feeRecord,
    });
  } catch (error) {
    next(error);
  }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, paymentType, referenceNumber, notes } =
      req.body;

    // Find fee record
    const feeRecord = await FeeRecord.findById(id);
    if (!feeRecord) {
      return res.status(404).json({
        success: false,
        message: "Fee record not found",
      });
    }

    // Create payment record
    const payment = {
      amount,
      paymentDate: new Date(),
      paymentMethod,
      paymentType,
      referenceNumber: referenceNumber || "",
      notes: notes || "",
      receivedBy: req.user.id,
    };

    // Generate receipt number
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await FeeRecord.countDocuments();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    payment.receiptNumber = `RCP${year}${(count + 1).toString().padStart(6, "0")}${random}`;

    // Add payment
    feeRecord.payments.push(payment);

    // Recalculate totals
    feeRecord.calculateTotals();

    await feeRecord.save();

    res.json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        payment,
        feeRecord,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllFeeRecords = async (req, res, next) => {
  try {
    const { status, studentClass, academicYear, startDate, endDate } =
      req.query;
    const filter = { isDeleted: false };

    if (status) filter.status = status;
    if (studentClass) filter.studentClass = studentClass.toUpperCase();
    if (academicYear) filter.academicYear = academicYear;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const records = await FeeRecord.find(filter)
      .populate("studentId", "firstName lastName studentId email phone")
      .populate("createdBy", "firstName lastName email")
      .populate("payments.receivedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentFeeRecords = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const records = await FeeRecord.getStudentFeeHistory(studentId);

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentBalance = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const balance = await FeeRecord.getStudentBalance(studentId);

    // Get student details
    const student = await Student.findById(studentId);

    res.json({
      success: true,
      data: {
        studentId,
        studentName: student ? student.getFullName() : "Unknown",
        outstandingBalance: balance,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getOutstandingFees = async (req, res, next) => {
  try {
    const outstanding = await FeeRecord.getOutstandingFees();

    res.json({
      success: true,
      data: outstanding,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCollectionReport = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const reportYear = parseInt(year) || currentYear;
    const reportMonth = parseInt(month) || currentMonth;

    const report = await FeeRecord.getMonthlyCollection(
      reportYear,
      reportMonth,
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

exports.getFeeRecordById = async (req, res, next) => {
  try {
    const feeRecord = await FeeRecord.findById(req.params.id)
      .populate("studentId", "firstName lastName studentId email phone")
      .populate("createdBy", "firstName lastName email")
      .populate("payments.receivedBy", "firstName lastName email");

    if (!feeRecord) {
      return res.status(404).json({
        success: false,
        message: "Fee record not found",
      });
    }

    res.json({
      success: true,
      data: feeRecord,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateFeeRecord = async (req, res, next) => {
  try {
    const feeRecord = await FeeRecord.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user.id,
      },
      { new: true, runValidators: true },
    );

    if (!feeRecord) {
      return res.status(404).json({
        success: false,
        message: "Fee record not found",
      });
    }

    // Recalculate totals
    feeRecord.calculateTotals();
    await feeRecord.save();

    res.json({
      success: true,
      message: "Fee record updated successfully",
      data: feeRecord,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteFeeRecord = async (req, res, next) => {
  try {
    const feeRecord = await FeeRecord.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true },
    );

    if (!feeRecord) {
      return res.status(404).json({
        success: false,
        message: "Fee record not found",
      });
    }

    res.json({
      success: true,
      message: "Fee record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getFeeStatistics = async (req, res, next) => {
  try {
    // Total collected
    const totalCollected = await FeeRecord.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: "$payments" },
      {
        $group: {
          _id: null,
          total: { $sum: "$payments.amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Outstanding balance
    const outstanding = await FeeRecord.aggregate([
      {
        $match: {
          isDeleted: false,
          status: { $in: ["pending", "partial", "overdue"] },
        },
      },
      {
        $group: {
          _id: null,
          totalOutstanding: { $sum: "$totalRemaining" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Overdue
    const overdue = await FeeRecord.aggregate([
      {
        $match: {
          isDeleted: false,
          status: "overdue",
        },
      },
      {
        $group: {
          _id: null,
          totalOverdue: { $sum: "$totalRemaining" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Paid this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyCollection = await FeeRecord.aggregate([
      {
        $match: {
          isDeleted: false,
          "payments.paymentDate": { $gte: startOfMonth },
        },
      },
      { $unwind: "$payments" },
      {
        $group: {
          _id: null,
          monthlyTotal: { $sum: "$payments.amount" },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        totalCollected: totalCollected[0]?.total || 0,
        totalTransactions: totalCollected[0]?.count || 0,
        outstandingBalance: outstanding[0]?.totalOutstanding || 0,
        outstandingCount: outstanding[0]?.count || 0,
        overdueAmount: overdue[0]?.totalOverdue || 0,
        overdueCount: overdue[0]?.count || 0,
        monthlyCollection: monthlyCollection[0]?.monthlyTotal || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
