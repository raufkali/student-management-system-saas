const User = require("./auth.model");
const { AppError } = require("../../utils/helpers");

class AuthService {
  async registerUser(userData) {
    // Check if email is already taken
    const existingEmail = await User.findOne({ email: userData.email });
    if (existingEmail) {
      throw new AppError("Email is already registered", 409);
    }

    // Check if username is already taken
    const existingUsername = await User.findOne({
      username: userData.username,
    });
    if (existingUsername) {
      throw new AppError("Username is already taken", 409);
    }

    // Hash the password before saving
    const hashedPassword = await User.hashPassword(userData.password);
    userData.password = hashedPassword;

    // Create user
    const user = await User.create(userData);

    // Remove password from returned user object
    const userObject = user.toObject();
    delete userObject.password;

    return userObject;
  }

  async loginUser(email, password) {
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      throw new AppError("Invalid login credentials", 401);
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AppError(
        "Account is deactivated. Please contact administrator.",
        403,
      );
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      const lockTime = Math.ceil((user.lockUntil - new Date()) / 60000);
      throw new AppError(
        `Account is locked. Please try again in ${lockTime} minutes.`,
        403,
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError("Invalid login credentials", 401);
    }

    return user;
  }

  async findUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return user;
  }

  async findUserByEmail(email) {
    return await User.findOne({ email });
  }

  async updateUser(userId, updates) {
    // If password is being updated, hash it first
    if (updates.password) {
      updates.password = await User.hashPassword(updates.password);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates, updatedBy: userId },
      { new: true, runValidators: true },
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  async deleteUser(userId) {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return user;
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select("+password");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new AppError("Current password is incorrect", 401);
    }

    // Hash new password
    const hashedPassword = await User.hashPassword(newPassword);

    // Update password
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    return true;
  }

  async createPasswordResetToken(email) {
    const user = await User.findOne({ email });

    if (!user) {
      throw new AppError("No account found with this email", 404);
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    return resetToken;
  }

  async resetPassword(token, newPassword) {
    // Hash token
    const crypto = require("crypto");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    // Hash new password
    const hashedPassword = await User.hashPassword(newPassword);

    // Update password
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    return true;
  }

  async updateLastLogin(userId) {
    await User.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
    });
  }

  async addRefreshToken(userId, refreshToken) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Remove expired tokens
    user.refreshTokens = user.refreshTokens.filter(
      (t) => t.expiresAt > new Date(),
    );

    // Add new token
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Limit number of refresh tokens
    if (user.refreshTokens.length > 10) {
      user.refreshTokens = user.refreshTokens.slice(-10);
    }

    await user.save();
  }

  async removeRefreshToken(userId, refreshToken) {
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { token: refreshToken } },
    });
  }

  async getAllUsers({ page = 1, limit = 10, search = "", role, isActive }) {
    const query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-refreshTokens -passwordResetToken -loginAttempts -password");

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new AuthService();
