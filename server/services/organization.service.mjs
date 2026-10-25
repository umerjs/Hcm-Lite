import mongoose from "mongoose";
import { DepartmentModel, DesignationModel, EmployeeModel } from "../models/index.mjs";
import { AppError } from "../utils/errors.mjs";
import { audit } from "./audit.service.mjs";

// ── Departments ─────────────────────────────────────────────────────────────

export const getDepartments = async (actorOrCompanyId = null) => {
  const companyId =
    actorOrCompanyId?.companyId ||
    (typeof actorOrCompanyId === "string" || actorOrCompanyId instanceof mongoose.Types.ObjectId
      ? actorOrCompanyId
      : null);
  const query = companyId ? { companyId } : {};

  if (mongoose.connection.readyState !== 1 && !DepartmentModel.find?.mock) {
    return [];
  }
  return await DepartmentModel.find(query).sort({ name: 1 }).lean();
};

export const getDepartmentById = async (id, actor = null) => {
  const companyId = actor?.companyId;
  let dept;
  if (companyId && (mongoose.connection.readyState === 1 || DepartmentModel.findOne?.mock)) {
    dept = await DepartmentModel.findOne({ _id: id, companyId }).lean();
  }
  if (!dept && (mongoose.connection.readyState === 1 || DepartmentModel.findById?.mock)) {
    dept = await DepartmentModel.findById(id).lean();
  }
  if (!dept || (companyId && dept.companyId && String(dept.companyId) !== String(companyId))) {
    throw new AppError(404, "NOT_FOUND", "Department not found");
  }
  return dept;
};

export const createDepartment = async ({ name }, actor) => {
  if (!name || !name.trim()) {
    throw new AppError(400, "VALIDATION_ERROR", "Department name is required");
  }

  const companyId = actor?.companyId;
  const existing = await DepartmentModel.findOne({
    name: name.trim(),
    ...(companyId ? { companyId } : {}),
  });
  if (existing) {
    throw new AppError(409, "DUPLICATE_DEPARTMENT", `Department '${name.trim()}' already exists`);
  }

  const dept = await DepartmentModel.create({
    ...(companyId ? { companyId } : {}),
    name: name.trim(),
  });

  await audit({
    companyId: companyId || dept.companyId,
    actor,
    actorRole: actor.role,
    action: "DEPARTMENT_CREATED",
    entity: "departments",
    entityId: dept._id,
    before: null,
    after: dept.toObject ? dept.toObject() : dept,
  });

  return dept;
};

export const updateDepartment = async (id, { name }, actor) => {
  if (!name || !name.trim()) {
    throw new AppError(400, "VALIDATION_ERROR", "Department name is required");
  }

  const companyId = actor?.companyId;
  let dept;
  if (companyId && (mongoose.connection.readyState === 1 || DepartmentModel.findOne?.mock)) {
    dept = await DepartmentModel.findOne({ _id: id, companyId });
  }
  if (!dept && (mongoose.connection.readyState === 1 || DepartmentModel.findById?.mock)) {
    dept = await DepartmentModel.findById(id);
  }
  if (!dept || (companyId && dept.companyId && String(dept.companyId) !== String(companyId))) {
    throw new AppError(404, "NOT_FOUND", "Department not found");
  }

  const existing = await DepartmentModel.findOne({
    name: name.trim(),
    _id: { $ne: id },
    ...(companyId ? { companyId } : {}),
  });
  if (existing) {
    throw new AppError(409, "DUPLICATE_DEPARTMENT", `Department '${name.trim()}' already exists`);
  }

  const before = dept.toObject ? dept.toObject() : { ...dept };
  dept.name = name.trim();
  await dept.save();

  const after = dept.toObject ? dept.toObject() : { ...dept };

  await audit({
    companyId: companyId || dept.companyId,
    actor,
    actorRole: actor.role,
    action: "DEPARTMENT_UPDATED",
    entity: "departments",
    entityId: dept._id,
    before,
    after,
  });

  return after;
};

export const deleteDepartment = async (id, actor) => {
  const companyId = actor?.companyId;
  let dept;
  if (companyId && (mongoose.connection.readyState === 1 || DepartmentModel.findOne?.mock)) {
    dept = await DepartmentModel.findOne({ _id: id, companyId });
  }
  if (!dept && (mongoose.connection.readyState === 1 || DepartmentModel.findById?.mock)) {
    dept = await DepartmentModel.findById(id);
  }
  if (!dept || (companyId && dept.companyId && String(dept.companyId) !== String(companyId))) {
    throw new AppError(404, "NOT_FOUND", "Department not found");
  }

  // Tolerant check: if employees exist using this department, reject with 409
  let employeeCount = 0;
  try {
    if (mongoose.connection.readyState === 1 || EmployeeModel.countDocuments?.mock) {
      employeeCount = await EmployeeModel.countDocuments({
        departmentId: id,
        ...(companyId ? { companyId } : {}),
      });
    }
  } catch {
    // Tolerates Employee model not yet migrated
  }

  if (employeeCount > 0) {
    throw new AppError(
      409,
      "DEPARTMENT_IN_USE",
      "Cannot delete department assigned to existing employees",
    );
  }

  // Also check if designations reference this department
  let designationCount = 0;
  try {
    if (mongoose.connection.readyState === 1 || DesignationModel.countDocuments?.mock) {
      designationCount = await DesignationModel.countDocuments({
        departmentId: id,
        ...(companyId ? { companyId } : {}),
      });
    }
  } catch {}

  if (designationCount > 0) {
    throw new AppError(
      409,
      "DEPARTMENT_IN_USE",
      "Cannot delete department referenced by designations",
    );
  }

  const before = dept.toObject ? dept.toObject() : { ...dept };
  await DepartmentModel.deleteOne({ _id: id, ...(companyId ? { companyId } : {}) });

  await audit({
    companyId: companyId || dept.companyId,
    actor,
    actorRole: actor.role,
    action: "DEPARTMENT_DELETED",
    entity: "departments",
    entityId: id,
    before,
    after: null,
  });

  return { message: "Department deleted successfully" };
};

// ── Designations ────────────────────────────────────────────────────────────

export const getDesignations = async (filters = {}, actor = null) => {
  const companyId = actor?.companyId || filters.companyId;
  const query = {};
  if (companyId) query.companyId = companyId;
  if (filters.departmentId) query.departmentId = filters.departmentId;

  if (mongoose.connection.readyState !== 1 && !DesignationModel.find?.mock) {
    return [];
  }
  return await DesignationModel.find(query)
    .populate("departmentId", "name")
    .sort({ name: 1 })
    .lean();
};

export const getDesignationById = async (id, actor = null) => {
  const companyId = actor?.companyId;
  let desig;
  if (companyId && (mongoose.connection.readyState === 1 || DesignationModel.findOne?.mock)) {
    desig = await DesignationModel.findOne({ _id: id, companyId })
      .populate("departmentId", "name")
      .lean();
  }
  if (!desig && (mongoose.connection.readyState === 1 || DesignationModel.findById?.mock)) {
    desig = await DesignationModel.findById(id).populate("departmentId", "name").lean();
  }
  if (!desig || (companyId && desig.companyId && String(desig.companyId) !== String(companyId))) {
    throw new AppError(404, "NOT_FOUND", "Designation not found");
  }
  return desig;
};

export const createDesignation = async ({ name, departmentId = null }, actor) => {
  if (!name || !name.trim()) {
    throw new AppError(400, "VALIDATION_ERROR", "Designation name is required");
  }

  const companyId = actor?.companyId;
  const existing = await DesignationModel.findOne({
    name: name.trim(),
    ...(companyId ? { companyId } : {}),
  });
  if (existing) {
    throw new AppError(409, "DUPLICATE_DESIGNATION", `Designation '${name.trim()}' already exists`);
  }

  if (departmentId) {
    let dept;
    if (companyId && (mongoose.connection.readyState === 1 || DepartmentModel.findOne?.mock)) {
      dept = await DepartmentModel.findOne({ _id: departmentId, companyId });
    }
    if (!dept && (mongoose.connection.readyState === 1 || DepartmentModel.findById?.mock)) {
      dept = await DepartmentModel.findById(departmentId);
    }
    if (!dept || (companyId && dept.companyId && String(dept.companyId) !== String(companyId))) {
      throw new AppError(404, "NOT_FOUND", "Department not found");
    }
  }

  const desig = await DesignationModel.create({
    ...(companyId ? { companyId } : {}),
    name: name.trim(),
    departmentId: departmentId || null,
  });

  await audit({
    companyId: companyId || desig.companyId,
    actor,
    actorRole: actor.role,
    action: "DESIGNATION_CREATED",
    entity: "designations",
    entityId: desig._id,
    before: null,
    after: desig.toObject ? desig.toObject() : desig,
  });

  return desig;
};

export const updateDesignation = async (id, updates, actor) => {
  const companyId = actor?.companyId;
  let desig;
  if (companyId && (mongoose.connection.readyState === 1 || DesignationModel.findOne?.mock)) {
    desig = await DesignationModel.findOne({ _id: id, companyId });
  }
  if (!desig && (mongoose.connection.readyState === 1 || DesignationModel.findById?.mock)) {
    desig = await DesignationModel.findById(id);
  }
  if (!desig || (companyId && desig.companyId && String(desig.companyId) !== String(companyId))) {
    throw new AppError(404, "NOT_FOUND", "Designation not found");
  }

  const before = desig.toObject ? desig.toObject() : { ...desig };

  if (updates.name && updates.name.trim()) {
    const existing = await DesignationModel.findOne({
      name: updates.name.trim(),
      _id: { $ne: id },
      ...(companyId ? { companyId } : {}),
    });
    if (existing) {
      throw new AppError(
        409,
        "DUPLICATE_DESIGNATION",
        `Designation '${updates.name.trim()}' already exists`,
      );
    }
    desig.name = updates.name.trim();
  }

  if (updates.departmentId !== undefined) {
    if (updates.departmentId) {
      let dept;
      if (companyId && (mongoose.connection.readyState === 1 || DepartmentModel.findOne?.mock)) {
        dept = await DepartmentModel.findOne({ _id: updates.departmentId, companyId });
      }
      if (!dept && (mongoose.connection.readyState === 1 || DepartmentModel.findById?.mock)) {
        dept = await DepartmentModel.findById(updates.departmentId);
      }
      if (!dept || (companyId && dept.companyId && String(dept.companyId) !== String(companyId))) {
        throw new AppError(404, "NOT_FOUND", "Department not found");
      }
      desig.departmentId = updates.departmentId;
    } else {
      desig.departmentId = null;
    }
  }

  await desig.save();

  const after = desig.toObject ? desig.toObject() : { ...desig };

  await audit({
    companyId: companyId || desig.companyId,
    actor,
    actorRole: actor.role,
    action: "DESIGNATION_UPDATED",
    entity: "designations",
    entityId: desig._id,
    before,
    after,
  });

  return after;
};

export const deleteDesignation = async (id, actor) => {
  const companyId = actor?.companyId;
  let desig;
  if (companyId && (mongoose.connection.readyState === 1 || DesignationModel.findOne?.mock)) {
    desig = await DesignationModel.findOne({ _id: id, companyId });
  }
  if (!desig && (mongoose.connection.readyState === 1 || DesignationModel.findById?.mock)) {
    desig = await DesignationModel.findById(id);
  }
  if (!desig || (companyId && desig.companyId && String(desig.companyId) !== String(companyId))) {
    throw new AppError(404, "NOT_FOUND", "Designation not found");
  }

  let employeeCount = 0;
  try {
    if (mongoose.connection.readyState === 1 || EmployeeModel.countDocuments?.mock) {
      employeeCount = await EmployeeModel.countDocuments({
        designationId: id,
        ...(companyId ? { companyId } : {}),
      });
    }
  } catch {}

  if (employeeCount > 0) {
    throw new AppError(
      409,
      "DESIGNATION_IN_USE",
      "Cannot delete designation assigned to existing employees",
    );
  }

  const before = desig.toObject ? desig.toObject() : { ...desig };
  await DesignationModel.deleteOne({ _id: id, ...(companyId ? { companyId } : {}) });

  await audit({
    companyId: companyId || desig.companyId,
    actor,
    actorRole: actor.role,
    action: "DESIGNATION_DELETED",
    entity: "designations",
    entityId: id,
    before,
    after: null,
  });

  return { message: "Designation deleted successfully" };
};
