const Setting = require("./setting.model");
const { sendSuccess, sendError, sendCreated } = require("../../utils/response");
const { AppError } = require("../../utils/helpers");

class SettingController {
  // Create or update setting
  async setSetting(req, res, next) {
    try {
      const { key, value, category, description } = req.body;

      if (!key) {
        return sendError(res, "Setting key is required", 400);
      }

      const setting = await Setting.findOneAndUpdate(
        { key },
        {
          value,
          category: category || "general",
          description: description || "",
          updatedBy: req.user._id,
        },
        { new: true, upsert: true, runValidators: true },
      );

      return sendSuccess(res, {
        message: "Setting saved successfully",
        setting,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get setting by key
  async getSetting(req, res, next) {
    try {
      const { key } = req.params;
      const setting = await Setting.findOne({ key });

      if (!setting) {
        return sendError(res, "Setting not found", 404);
      }

      return sendSuccess(res, {
        setting,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all settings
  async getAllSettings(req, res, next) {
    try {
      const { category } = req.query;
      const query = {};

      if (category) {
        query.category = category;
      }

      const settings = await Setting.find(query).sort({ category: 1, key: 1 });

      return sendSuccess(res, {
        settings,
        count: settings.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get settings by category
  async getSettingsByCategory(req, res, next) {
    try {
      const { category } = req.params;
      const settings = await Setting.find({ category }).sort({ key: 1 });

      return sendSuccess(res, {
        settings,
        count: settings.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete setting
  async deleteSetting(req, res, next) {
    try {
      const { key } = req.params;
      const setting = await Setting.findOneAndDelete({ key });

      if (!setting) {
        return sendError(res, "Setting not found", 404);
      }

      return sendSuccess(res, {
        message: "Setting deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Get system settings (public)
  async getPublicSettings(req, res, next) {
    try {
      const settings = await Setting.find({ isPublic: true })
        .select("key value category")
        .sort({ category: 1, key: 1 });

      // Convert to object with key-value pairs
      const settingsObject = {};
      settings.forEach((setting) => {
        settingsObject[setting.key] = setting.value;
      });

      return sendSuccess(res, {
        settings: settingsObject,
      });
    } catch (error) {
      next(error);
    }
  }

  // Initialize default settings
  async initializeSettings(req, res, next) {
    try {
      const defaultSettings = [
        {
          key: "app_name",
          value: "Student Management System",
          category: "general",
          description: "Application name",
          isPublic: true,
        },
        {
          key: "app_version",
          value: "1.0.0",
          category: "general",
          description: "Application version",
          isPublic: true,
        },
        {
          key: "academic_year_start",
          value: new Date().getFullYear(),
          category: "academic",
          description: "Start year of current academic session",
          isPublic: true,
        },
        {
          key: "academic_year_end",
          value: new Date().getFullYear() + 1,
          category: "academic",
          description: "End year of current academic session",
          isPublic: true,
        },
        {
          key: "term_dates",
          value: {
            firstTerm: { start: "2024-01-01", end: "2024-03-31" },
            secondTerm: { start: "2024-04-01", end: "2024-06-30" },
            thirdTerm: { start: "2024-07-01", end: "2024-09-30" },
          },
          category: "academic",
          description: "Academic term dates",
          isPublic: true,
        },
        {
          key: "max_students_per_class",
          value: 40,
          category: "academic",
          description: "Maximum number of students per class",
          isPublic: true,
        },
        {
          key: "registration_fee",
          value: 100,
          category: "financial",
          description: "Student registration fee",
          isPublic: false,
        },
        {
          key: "tuition_fee",
          value: 500,
          category: "financial",
          description: "Monthly tuition fee",
          isPublic: false,
        },
        {
          key: "late_fee_penalty",
          value: 50,
          category: "financial",
          description: "Late fee penalty amount",
          isPublic: false,
        },
        {
          key: "enable_notifications",
          value: true,
          category: "notification",
          description: "Enable system notifications",
          isPublic: true,
        },
        {
          key: "email_notifications",
          value: true,
          category: "notification",
          description: "Enable email notifications",
          isPublic: true,
        },
        {
          key: "maintenance_mode",
          value: false,
          category: "system",
          description: "Put system in maintenance mode",
          isPublic: true,
        },
      ];

      let created = 0;
      let updated = 0;

      for (const settingData of defaultSettings) {
        const existing = await Setting.findOne({ key: settingData.key });
        if (existing) {
          // Update if value differs
          if (
            JSON.stringify(existing.value) !== JSON.stringify(settingData.value)
          ) {
            await Setting.findOneAndUpdate(
              { key: settingData.key },
              {
                value: settingData.value,
                updatedBy: req.user?._id,
              },
            );
            updated++;
          }
        } else {
          await Setting.create({
            ...settingData,
            updatedBy: req.user?._id,
          });
          created++;
        }
      }

      return sendSuccess(res, {
        message: "Settings initialized successfully",
        created,
        updated,
        total: defaultSettings.length,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingController();
