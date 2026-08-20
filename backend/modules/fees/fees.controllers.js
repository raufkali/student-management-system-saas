// backend/modules/fees/fees.controllers.js

const FeeStructure = require("./fees.structure.model");
const FeeRecord = require("./fees.record.model");
const Student = require("../students/student.model");
const Setting = require("../settings/setting.model"); // <-- added for school info
const PDFDocument = require("pdfkit");
const { sendSuccess, sendError, sendCreated } = require("../../utils/response");

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

// ============ NEW: GENERATE RECEIPT PDF ============

exports.generateReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch fee record with student and payment details
    const feeRecord = await FeeRecord.findById(id)
      .populate("studentId")
      .populate("payments.receivedBy", "firstName lastName");

    if (!feeRecord) {
      return res.status(404).json({
        success: false,
        message: "Fee record not found",
      });
    }

    // Fetch school settings (logo, name, address, etc.)
    const schoolSettings = await Setting.find({
      key: {
        $in: [
          "school_name",
          "school_address",
          "school_phone",
          "school_email",
          "school_logo",
        ],
      },
    });
    const schoolInfo = {};
    schoolSettings.forEach((s) => {
      schoolInfo[s.key] = s.value;
    });

    // Create PDF document
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `Receipt ${feeRecord._id}`,
        Author: schoolInfo.school_name || "School",
      },
    });

    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=receipt-${feeRecord._id}.pdf`,
      );
      res.send(pdfData);
    });

    // --- Header with Logo ---
    if (schoolInfo.school_logo) {
      try {
        // school_logo is stored as base64 data URL
        const logoBase64 = schoolInfo.school_logo.split(",")[1];
        const logoBuffer = Buffer.from(logoBase64, "base64");
        doc.image(logoBuffer, 50, 45, { width: 80 });
      } catch (err) {
        console.warn("Could not load logo:", err.message);
      }
    }

    // School name and contact
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(schoolInfo.school_name || "School Name", 150, 50, {
        align: "center",
      });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(schoolInfo.school_address || "", { align: "center" })
      .text(`Phone: ${schoolInfo.school_phone || ""}`, { align: "center" })
      .text(`Email: ${schoolInfo.school_email || ""}`, { align: "center" })
      .moveDown();

    // Title
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("PAYMENT RECEIPT", { align: "center" })
      .moveDown();

    // Receipt details
    const lastPayment = feeRecord.payments[feeRecord.payments.length - 1];
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Receipt No: ${lastPayment?.receiptNumber || "N/A"}`)
      .text(`Date: ${new Date().toLocaleDateString()}`)
      .text(
        `Student: ${feeRecord.studentId?.getFullName?.() || feeRecord.studentName || "Unknown"}`,
      )
      .text(`Class: ${feeRecord.studentClass}`)
      .text(`Academic Year: ${feeRecord.academicYear}`)
      .moveDown();

    // --- Fee Items Table ---
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 350;
    const rowHeight = 20;

    doc.font("Helvetica-Bold");
    doc.text("Description", col1, tableTop);
    doc.text("Amount (₹)", col2, tableTop, { width: 100, align: "right" });

    let y = tableTop + rowHeight;
    doc.font("Helvetica");
    feeRecord.feeItems.forEach((item) => {
      doc.text(item.name || "Item", col1, y);
      doc.text((item.amount || 0).toFixed(2), col2, y, {
        width: 100,
        align: "right",
      });
      y += rowHeight;
    });

    // Totals
    doc.font("Helvetica-Bold");
    doc.text("Total Fee:", col1, y);
    doc.text(feeRecord.totalFee.toFixed(2), col2, y, {
      width: 100,
      align: "right",
    });
    y += rowHeight;

    doc.text("Discount / Scholarship:", col1, y);
    const discount = feeRecord.discountAmount + feeRecord.scholarshipAmount;
    doc.text(discount.toFixed(2), col2, y, { width: 100, align: "right" });
    y += rowHeight;

    doc.text("Total Paid:", col1, y);
    doc.text(feeRecord.totalPaid.toFixed(2), col2, y, {
      width: 100,
      align: "right",
    });
    y += rowHeight;

    doc.text("Remaining Balance:", col1, y);
    doc.text(feeRecord.totalRemaining.toFixed(2), col2, y, {
      width: 100,
      align: "right",
    });
    y += rowHeight * 1.5;

    // Payment details
    if (lastPayment) {
      doc.font("Helvetica-Bold").text("Payment Details:", col1, y);
      y += rowHeight;
      doc
        .font("Helvetica")
        .text(`Amount: ${lastPayment.amount.toFixed(2)}`, col1, y)
        .text(`Method: ${lastPayment.paymentMethod}`, col1 + 150, y)
        .text(`Type: ${lastPayment.paymentType}`, col1 + 300, y);
      y += rowHeight;
      if (lastPayment.referenceNumber) {
        doc.text(`Reference: ${lastPayment.referenceNumber}`, col1, y);
        y += rowHeight;
      }
      if (lastPayment.notes) {
        doc.text(`Notes: ${lastPayment.notes}`, col1, y);
        y += rowHeight;
      }
    }

    // Footer
    doc
      .moveDown(2)
      .fontSize(10)
      .font("Helvetica")
      .text("Thank you for your payment.", { align: "center" })
      .text("This is a system-generated receipt.", {
        align: "center",
        fontSize: 8,
      });

    // Page number
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .text(`Page ${i + 1} of ${pageCount}`, 50, doc.page.height - 50, {
          align: "center",
        });
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};
