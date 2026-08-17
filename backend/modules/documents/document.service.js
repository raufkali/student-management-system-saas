const Document = require("./document.model");
const { AppError } = require("../../utils/helpers");
const fs = require("fs");
const path = require("path");
const { UPLOAD_PATH } = require("../../config/env");

class DocumentService {
  async uploadDocument(file, data) {
    const documentData = {
      title: data.title,
      description: data.description,
      category: data.category || "other",
      tags: data.tags || [],
      studentId: data.studentId,
      uploadedBy: data.uploadedBy,
      filePath: file.path,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      type: this.getDocumentType(file.mimetype),
    };

    const document = await Document.create(documentData);
    return document;
  }

  async getAllDocuments(filters = {}, options = {}) {
    const { page = 1, limit = 10 } = options;
    const query = {};

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
        { tags: { $in: [new RegExp(filters.search, "i")] } },
      ];
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.studentId) {
      query.studentId = filters.studentId;
    }

    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) {
        query.createdAt.$gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        query.createdAt.$lte = new Date(filters.toDate);
      }
    }

    const total = await Document.countDocuments(query);
    const documents = await Document.find(query)
      .populate("studentId", "firstName lastName studentId")
      .populate("uploadedBy", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getDocumentById(documentId) {
    const document = await Document.findById(documentId)
      .populate("studentId", "firstName lastName studentId")
      .populate("uploadedBy", "firstName lastName email");

    if (!document) {
      throw new AppError("Document not found", 404);
    }

    return document;
  }

  async getDocumentFile(document) {
    if (!fs.existsSync(document.filePath)) {
      throw new AppError("File not found on server", 404);
    }

    return fs.readFileSync(document.filePath);
  }

  async updateDocument(documentId, updates) {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new AppError("Document not found", 404);
    }

    const updatedDocument = await Document.findByIdAndUpdate(
      documentId,
      { $set: updates },
      { new: true, runValidators: true },
    );

    return updatedDocument;
  }

  async deleteDocument(documentId) {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new AppError("Document not found", 404);
    }

    // Soft delete
    document.isDeleted = true;
    document.deletedAt = new Date();
    await document.save();

    return document;
  }

  async getDocumentsByStudent(studentId) {
    return await Document.find({
      studentId,
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });
  }

  async getStatistics() {
    const total = await Document.countDocuments({ isDeleted: { $ne: true } });
    const byCategory = await Document.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const byType = await Document.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);
    const totalSize = await Document.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: "$fileSize" } } },
    ]);

    return {
      total,
      byCategory,
      byType,
      totalSize: totalSize.length > 0 ? totalSize[0].total : 0,
      lastUpdated: new Date(),
    };
  }

  getDocumentType(mimeType) {
    const typeMap = {
      "application/pdf": "pdf",
      "image/jpeg": "image",
      "image/png": "image",
      "image/gif": "image",
      "image/webp": "image",
      "application/msword": "document",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "document",
      "application/vnd.ms-excel": "spreadsheet",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        "spreadsheet",
    };
    return typeMap[mimeType] || "other";
  }
}

module.exports = new DocumentService();
