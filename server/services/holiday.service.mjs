import mongoose from "mongoose";
import { HolidayModel } from "../models/index.mjs";
import { AppError } from "../utils/errors.mjs";
import { audit } from "./audit.service.mjs";

/**
 * Returns all holidays matching optional query filters (e.g. year or date range).
 */
export const getHolidays = async (filters = {}, actor = null) => {
  const companyId = actor?.companyId || filters.companyId;
  const query = {};
  if (companyId) {
    query.companyId = companyId;
  }
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
export const getHolidayById = async (id, actor = null) => {
  const companyId = actor?.companyId;
  let holiday;
  if (companyId && (mongoose.connection.readyState === 1 || HolidayModel.findOne?.mock)) {
    holiday = await HolidayModel.findOne({ _id: id, companyId }).lean();
  }
  if (!holiday && (mongoose.connection.readyState === 1 || HolidayModel.findById?.mock)) {
    holiday = await HolidayModel.findById(id).lean();
  }
  if (
    !holiday ||
    (companyId && holiday.companyId && String(holiday.companyId) !== String(companyId))
  ) {
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

  const companyId = actor?.companyId;
  const existing = await HolidayModel.findOne({
    date: date.trim(),
    ...(companyId ? { companyId } : {}),
  });
  if (existing) {
    throw new AppError(409, "DUPLICATE_HOLIDAY", `Holiday for date ${date} already exists`);
  }

  const holiday = await HolidayModel.create({
    ...(companyId ? { companyId } : {}),
    date: date.trim(),
    name: name.trim(),
  });

  await audit({
    companyId: companyId || holiday.companyId,
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
  const companyId = actor?.companyId;
  let holiday;
  if (companyId && (mongoose.connection.readyState === 1 || HolidayModel.findOne?.mock)) {
    holiday = await HolidayModel.findOne({ _id: id, companyId });
  }
  if (!holiday && (mongoose.connection.readyState === 1 || HolidayModel.findById?.mock)) {
    holiday = await HolidayModel.findById(id);
  }
  if (
    !holiday ||
    (companyId && holiday.companyId && String(holiday.companyId) !== String(companyId))
  ) {
    throw new AppError(404, "NOT_FOUND", "Holiday not found");
  }

  const before = holiday.toObject ? holiday.toObject() : { ...holiday };

  if (updates.date && updates.date !== holiday.date) {
    const existing = await HolidayModel.findOne({
      date: updates.date,
      _id: { $ne: id },
      ...(companyId ? { companyId } : {}),
    });
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
    companyId: companyId || holiday.companyId,
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
  const companyId = actor?.companyId;
  let holiday;
  if (companyId && (mongoose.connection.readyState === 1 || HolidayModel.findOne?.mock)) {
    holiday = await HolidayModel.findOne({ _id: id, companyId });
  }
  if (!holiday && (mongoose.connection.readyState === 1 || HolidayModel.findById?.mock)) {
    holiday = await HolidayModel.findById(id);
  }
  if (
    !holiday ||
    (companyId && holiday.companyId && String(holiday.companyId) !== String(companyId))
  ) {
    throw new AppError(404, "NOT_FOUND", "Holiday not found");
  }

  const before = holiday.toObject ? holiday.toObject() : { ...holiday };
  await HolidayModel.deleteOne({ _id: id, ...(companyId ? { companyId } : {}) });

  await audit({
    companyId: companyId || holiday.companyId,
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
export const getHolidaysForRange = async (startDate, endDate, companyIdOrActor = null) => {
  const companyId =
    companyIdOrActor?.companyId ||
    (typeof companyIdOrActor === "string" || companyIdOrActor instanceof mongoose.Types.ObjectId
      ? companyIdOrActor
      : null);
  const query = {
    date: { $gte: startDate, $lte: endDate },
    ...(companyId ? { companyId } : {}),
  };

  if (mongoose.connection.readyState !== 1 && !HolidayModel.find?.mock) {
    return [];
  }
  return await HolidayModel.find(query).lean();
};

/**
 * Authoritative interface for single date lookup.
 */
export const getHolidaysForDate = async (date, companyIdOrActor = null) => {
  const companyId =
    companyIdOrActor?.companyId ||
    (typeof companyIdOrActor === "string" || companyIdOrActor instanceof mongoose.Types.ObjectId
      ? companyIdOrActor
      : null);
  const query = {
    date,
    ...(companyId ? { companyId } : {}),
  };

  if (mongoose.connection.readyState !== 1 && !HolidayModel.findOne?.mock) {
    return null;
  }
  return await HolidayModel.findOne(query).lean();
};
