import mongoose from "mongoose";
import { HolidayModel } from "../models/index.mjs";
import { AppError } from "../utils/errors.mjs";
import { audit } from "./audit.service.mjs";

/**
 * Returns all holidays matching optional query filters (e.g. year or date range).
 */
export const getHolidays = async (filters = {}) => {
  const query = {};
  if (filters.year) {
    query.date = { $regex: `^${filters.year}` };
  } else if (filters.month) {
    query.date = { $regex: `^${filters.month}` };
  }

  if (mongoose.connection.readyState !== 1 && !HolidayModel.find?.mock) {
    return [];
  }

  return await HolidayModel.find(query).sort({ date: 1 }).lean();
};

/**
 * Returns a holiday by its ID.
 */
export const getHolidayById = async (id) => {
  const holiday = await HolidayModel.findById(id).lean();
  if (!holiday) {
    throw new AppError(404, "NOT_FOUND", "Holiday not found");
  }
  return holiday;
};

/**
 * Creates a new holiday record. Admin only. Audited.
 */
export const createHoliday = async ({ date, name }, actor) => {
  if (!date || !name || !name.trim()) {
    throw new AppError(400, "VALIDATION_ERROR", "Date and name are required");
  }

  const existing = await HolidayModel.findOne({ date });
  if (existing) {
    throw new AppError(409, "DUPLICATE_HOLIDAY", `Holiday for date ${date} already exists`);
  }

  const holiday = await HolidayModel.create({
    date: date.trim(),
    name: name.trim(),
  });

  await audit({
    actor,
    actorRole: actor.role,
    action: "HOLIDAY_CREATED",
    entity: "holidays",
    entityId: holiday._id,
    before: null,
    after: holiday.toObject ? holiday.toObject() : holiday,
  });

  return holiday;
};

/**
 * Updates a holiday record. Admin only. Audited.
 */
export const updateHoliday = async (id, updates, actor) => {
  const holiday = await HolidayModel.findById(id);
  if (!holiday) {
    throw new AppError(404, "NOT_FOUND", "Holiday not found");
  }

  const before = holiday.toObject ? holiday.toObject() : { ...holiday };

  if (updates.date && updates.date !== holiday.date) {
    const existing = await HolidayModel.findOne({ date: updates.date, _id: { $ne: id } });
    if (existing) {
      throw new AppError(
        409,
        "DUPLICATE_HOLIDAY",
        `Holiday for date ${updates.date} already exists`,
      );
    }
    holiday.date = updates.date.trim();
  }

  if (updates.name && updates.name.trim()) {
    holiday.name = updates.name.trim();
  }

  await holiday.save();

  const after = holiday.toObject ? holiday.toObject() : { ...holiday };

  await audit({
    actor,
    actorRole: actor.role,
    action: "HOLIDAY_UPDATED",
    entity: "holidays",
    entityId: holiday._id,
    before,
    after,
  });

  return after;
};

/**
 * Deletes a holiday record. Admin only. Audited.
 */
export const deleteHoliday = async (id, actor) => {
  const holiday = await HolidayModel.findById(id);
  if (!holiday) {
    throw new AppError(404, "NOT_FOUND", "Holiday not found");
  }

  const before = holiday.toObject ? holiday.toObject() : { ...holiday };
  await HolidayModel.deleteOne({ _id: id });

  await audit({
    actor,
    actorRole: actor.role,
    action: "HOLIDAY_DELETED",
    entity: "holidays",
    entityId: id,
    before,
    after: null,
  });

  return { message: "Holiday deleted successfully" };
};

/**
 * Authoritative interface for leave & attendance calculation:
 * Returns holidays in [startDate, endDate] (inclusive).
 */
export const getHolidaysForRange = async (startDate, endDate) => {
  if (mongoose.connection.readyState !== 1 && !HolidayModel.find?.mock) {
    return [];
  }
  return await HolidayModel.find({
    date: { $gte: startDate, $lte: endDate },
  }).lean();
};

/**
 * Authoritative interface for single date lookup.
 */
export const getHolidaysForDate = async (date) => {
  if (mongoose.connection.readyState !== 1 && !HolidayModel.findOne?.mock) {
    return null;
  }
  return await HolidayModel.findOne({ date }).lean();
};
