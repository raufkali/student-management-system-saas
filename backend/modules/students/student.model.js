const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, "Student ID is required"],
      unique: true, // This creates an index automatically
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: [true, "Gender is required"],
    },
    nationality: {
      type: String,
      required: [true, "Nationality is required"],
      trim: true,
    },
    religion: { type: String, trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      unique: true, // Creates index
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\+?[\d\s-]{10,}$/, "Please provide a valid phone number"],
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, required: [true, "City is required"], trim: true },
      state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
      },
      postalCode: { type: String, trim: true },
      country: {
        type: String,
        required: [true, "Country is required"],
        trim: true,
      },
    },
    enrollmentDate: {
      type: Date,
      required: [true, "Enrollment date is required"],
      default: Date.now,
    },
    grade: {
      type: String,
      required: [true, "Grade is required"],
      trim: true,
      uppercase: true,
    },
    section: { type: String, trim: true },
    rollNumber: { type: String, trim: true },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
    },
    fatherName: {
      type: String,
      required: [true, "Father's name is required"],
      trim: true,
    },
    fatherOccupation: { type: String, trim: true },
    fatherPhone: {
      type: String,
      required: [true, "Father's phone is required"],
      trim: true,
    },
    fatherEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    motherName: {
      type: String,
      required: [true, "Mother's name is required"],
      trim: true,
    },
    motherOccupation: { type: String, trim: true },
    motherPhone: { type: String, trim: true },
    motherEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    guardianAddress: { type: String, trim: true },
    photo: { type: String, default: null },
    birthCertificate: { type: String, default: null },
    medicalRecords: { type: String, default: null },
    previousSchoolRecords: { type: String, default: null },
    otherDocuments: [
      {
        name: String,
        file: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    feeStructure: { type: mongoose.Schema.Types.ObjectId, ref: "FeeStructure" },
    scholarship: { type: String, trim: true },
    scholarshipPercentage: { type: Number, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["active", "inactive", "graduated", "withdrawn", "suspended"],
      default: "active",
    },
    isEnrolled: { type: Boolean, default: true },
    medicalConditions: { type: String, trim: true },
    specialNeeds: { type: String, trim: true },
    extracurricularActivities: [{ type: String, trim: true }],
    notes: { type: String, trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

// Remove duplicate indexes – only keep indexes that are not already covered by `unique: true`
// studentId and email already have unique indexes, so we don't need to index them again.
// We need indexes for search and sorting:
studentSchema.index({ firstName: 1, lastName: 1 });
studentSchema.index({ phone: 1 });
studentSchema.index({ grade: 1, section: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ enrollmentDate: -1 });

// Pre-find hooks to exclude deleted records – NO NEXT PARAMETER
studentSchema.pre("find", function () {
  if (this.getQuery().includeDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
});
studentSchema.pre("findOne", function () {
  if (this.getQuery().includeDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
});
studentSchema.pre("countDocuments", function () {
  if (this.getQuery().includeDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
});

// Pre-save hook to generate student ID
studentSchema.pre("save", async function () {
  if (!this.studentId) {
    const year = new Date().getFullYear().toString().slice(-2);
    const count = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    this.studentId = `STU${year}${count}`;
  }
});

// Instance methods
studentSchema.methods.getFullName = function () {
  return `${this.firstName} ${this.lastName}`;
};
studentSchema.methods.getAge = function () {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
};
studentSchema.methods.getAddressString = function () {
  const parts = [
    this.address.street,
    this.address.city,
    this.address.state,
    this.address.postalCode,
    this.address.country,
  ].filter(Boolean);
  return parts.join(", ");
};

// Static methods
studentSchema.statics.generateStudentId = async function () {
  const year = new Date().getFullYear().toString().slice(-2);
  const lastStudent = await this.findOne(
    { studentId: { $regex: `^STU${year}` } },
    { studentId: 1 },
    { sort: { studentId: -1 } },
  );
  let count = 1;
  if (lastStudent) {
    const lastNumber = parseInt(lastStudent.studentId.slice(-4));
    count = lastNumber + 1;
  }
  return `STU${year}${count.toString().padStart(4, "0")}`;
};

studentSchema.statics.searchStudents = async function (searchTerm) {
  if (!searchTerm) return [];
  const searchRegex = new RegExp(searchTerm, "i");
  return this.find({
    $or: [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { studentId: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      { "address.city": searchRegex },
      { "address.state": searchRegex },
    ],
  });
};

// Virtuals
studentSchema.virtual("fullName").get(function () {
  return this.getFullName();
});
studentSchema.virtual("age").get(function () {
  return this.getAge();
});
studentSchema.virtual("addressFull").get(function () {
  return this.getAddressString();
});

studentSchema.set("toJSON", { virtuals: true });
studentSchema.set("toObject", { virtuals: true });

const Student = mongoose.model("Student", studentSchema);
module.exports = Student;
