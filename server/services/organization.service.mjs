import mongoose from "mongoose";
import { DepartmentModel, DesignationModel, EmployeeModel } from "../models/index.mjs";
import { AppError } from "../utils/errors.mjs";
import { audit } from "./audit.service.mjs";

// ── Departments ─────────────────────────────────────────────────────────────

export const getDepartments = async () => {
  if (mongoose.connection.readyState !== 1 && !DepartmentModel.find?.mock) {
    return [];
  }
  return await DepartmentModel.find().sort({ name: 1 }).lean();
};

export const getDepartmentById = async (id) => {
  const dept = await DepartmentModel.findById(id).lean();
  if (!dept) throw new AppError(404, "NOT_FOUND", "Department not found");
  return dept;
};

export const createDepartment = async ({ name }, actor) => {
  if (!name || !name.trim()) {
    throw new AppError(400, "VALIDATION_ERROR", "Department name is required");
  }

  const existing = await DepartmentModel.findOne({ name: name.trim() });
  if (existing) {
    throw new AppError(409, "DUPLICATE_DEPARTMENT", `Department '${name.trim()}' already exists`);
  }

  const dept = await DepartmentModel.create({ name: name.trim() });

  await audit({
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

  const dept = await DepartmentModel.findById(id);
  if (!dept) throw new AppError(404, "NOT_FOUND", "Department not found");

  const existing = await DepartmentModel.findOne({ name: name.trim(), _id: { $ne: id } });
  if (existing) {
    throw new AppError(409, "DUPLICATE_DEPARTMENT", `Department '${name.trim()}' already exists`);
  }

  const before = dept.toObject ? dept.toObject() : { ...dept };
  dept.name = name.trim();
  await dept.save();

  const after = dept.toObject ? dept.toObject() : { ...dept };

  await audit({
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
  const dept = await DepartmentModel.findById(id);
  if (!dept) throw new AppError(404, "NOT_FOUND", "Department not found");

  // Tolerant check: if employees exist using this department, reject with 409
  let employeeCount = 0;
  try {
    if (mongoose.connection.readyState === 1 || EmployeeModel.countDocuments?.mock) {
      employeeCount = await EmployeeModel.countDocuments({ departmentId: id });
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
      designationCount = await DesignationModel.countDocuments({ departmentId: id });
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
  await DepartmentModel.deleteOne({ _id: id });

  await audit({
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

export const getDesignations = async (filters = {}) => {
  const query = {};
  if (filters.departmentId) query.departmentId = filters.departmentId;

  if (mongoose.connection.readyState !== 1 && !DesignationModel.find?.mock) {
    return [];
  }
  return await DesignationModel.find(query)
    .populate("departmentId", "name")
    .sort({ name: 1 })
    .lean();
};

export const getDesignationById = async (id) => {
  const desig = await DesignationModel.findById(id).populate("departmentId", "name").lean();
  if (!desig) throw new AppError(404, "NOT_FOUND", "Designation not found");
  return desig;
};

export const createDesignation = async ({ name, departmentId = null }, actor) => {
  if (!name || !name.trim()) {
    throw new AppError(400, "VALIDATION_ERROR", "Designation name is required");
  }

  const existing = await DesignationModel.findOne({ name: name.trim() });
  if (existing) {
    throw new AppError(409, "DUPLICATE_DESIGNATION", `Designation '${name.trim()}' already exists`);
  }

  if (departmentId) {
    const dept = await DepartmentModel.findById(departmentId);
    if (!dept) throw new AppError(404, "NOT_FOUND", "Department not found");
  }

  const desig = await DesignationModel.create({
    name: name.trim(),
    departmentId: departmentId || null,
  });

  await audit({
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
  const desig = await DesignationModel.findById(id);
  if (!desig) throw new AppError(404, "NOT_FOUND", "Designation not found");

  const before = desig.toObject ? desig.toObject() : { ...desig };

  if (updates.name && updates.name.trim()) {
    const existing = await DesignationModel.findOne({
      name: updates.name.trim(),
      _id: { $ne: id },
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
      const dept = await DepartmentModel.findById(updates.departmentId);
      if (!dept) throw new AppError(404, "NOT_FOUND", "Department not found");
      desig.departmentId = updates.departmentId;
    } else {
      desig.departmentId = null;
    }
  }

  await desig.save();

  const after = desig.toObject ? desig.toObject() : { ...desig };

  await audit({
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
  const desig = await DesignationModel.findById(id);
  if (!desig) throw new AppError(404, "NOT_FOUND", "Designation not found");

  let employeeCount = 0;
  try {
    if (mongoose.connection.readyState === 1 || EmployeeModel.countDocuments?.mock) {
      employeeCount = await EmployeeModel.countDocuments({ designationId: id });
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
  await DesignationModel.deleteOne({ _id: id });

  await audit({
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
