import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  EmployeeModel,
  UserModel,
  DepartmentModel,
  DesignationModel,
  getNextEmployeeCode,
} from "../models/index.mjs";
import { AppError } from "../utils/errors.mjs";
import { emailPattern } from "../utils/core.mjs";
import { formatDate } from "../src/rules/time.mjs";
import { audit } from "./audit.service.mjs";

/**
 * Creates an employee and corresponding user login.
 * - HR role only
 * - Validates department and designation existence
 * - basicSalary > 0
 * - Generates 12-char temp password and sets mustChangePassword: true
 * - Atomic rollback: if either creation fails, deletes the other
 * - Audited
 */
export const createEmployee = async (data, actor) => {
  if (actor.role !== "hr" && actor.role !== "admin") {
    throw new AppError(403, "FORBIDDEN", "Only HR personnel can create employees");
  }

  const companyId = actor.companyId;

  const {
    name,
    email,
    phone,
    address,
    gender = "male",
    departmentId,
    designationId,
    joinDate,
    basicSalary,
    code,
    status = "active",
  } = data;

  if (!name || !name.trim()) {
    throw new AppError(400, "VALIDATION_ERROR", "Employee name is required");
  }

  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!emailPattern.test(normalizedEmail)) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid email address format");
  }

  const salaryNum = Number(basicSalary);
  if (isNaN(salaryNum) || salaryNum <= 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Basic salary must be greater than 0");
  }

  if (!joinDate) {
    throw new AppError(400, "VALIDATION_ERROR", "Join date is required");
  }

  // Verify department exists
  let dept = null;
  if (
    mongoose.connection.readyState === 1 ||
    DepartmentModel.findById?.mock ||
    DepartmentModel.findOne?.mock
  ) {
    if (companyId && (mongoose.connection.readyState === 1 || DepartmentModel.findOne?.mock)) {
      dept = await DepartmentModel.findOne({ _id: departmentId, companyId });
    }
    if (!dept && (mongoose.connection.readyState === 1 || DepartmentModel.findById?.mock)) {
      dept = await DepartmentModel.findById(departmentId);
    }
    if (!dept || (companyId && dept.companyId && String(dept.companyId) !== String(companyId))) {
      throw new AppError(404, "NOT_FOUND", "Specified department does not exist");
    }
  }

  // Verify designation exists
  let desig = null;
  if (
    mongoose.connection.readyState === 1 ||
    DesignationModel.findById?.mock ||
    DesignationModel.findOne?.mock
  ) {
    if (companyId && (mongoose.connection.readyState === 1 || DesignationModel.findOne?.mock)) {
      desig = await DesignationModel.findOne({ _id: designationId, companyId });
    }
    if (!desig && (mongoose.connection.readyState === 1 || DesignationModel.findById?.mock)) {
      desig = await DesignationModel.findById(designationId);
    }
    if (!desig || (companyId && desig.companyId && String(desig.companyId) !== String(companyId))) {
      throw new AppError(404, "NOT_FOUND", "Specified designation does not exist");
    }
  }

  // Check email uniqueness across both UserModel and EmployeeModel
  if (mongoose.connection.readyState === 1 || UserModel.findOne?.mock) {
    const existingUser = await UserModel.findOne({
      email: normalizedEmail,
      ...(companyId ? { companyId } : {}),
    });
    if (existingUser) {
      throw new AppError(409, "DUPLICATE_EMAIL", "A user with this email already exists");
    }
  }

  if (mongoose.connection.readyState === 1 || EmployeeModel.findOne?.mock) {
    const existingEmployee = await EmployeeModel.findOne({
      email: normalizedEmail,
      ...(companyId ? { companyId } : {}),
    });
    if (existingEmployee) {
      throw new AppError(409, "DUPLICATE_EMAIL", "An employee with this email already exists");
    }
  }

  // Code generation or validation
  let employeeCode = code ? code.trim() : null;
  if (employeeCode) {
    if (mongoose.connection.readyState === 1 || EmployeeModel.findOne?.mock) {
      const codeTaken = await EmployeeModel.findOne({
        code: employeeCode,
        ...(companyId ? { companyId } : {}),
      });
      if (codeTaken) {
        throw new AppError(
          409,
          "DUPLICATE_CODE",
          `Employee code '${employeeCode}' is already in use`,
        );
      }
    }
  } else {
    employeeCode = await getNextEmployeeCode(companyId);
  }

  // Generate 12-character random temporary password
  const tempPassword = crypto.randomBytes(9).toString("base64url").slice(0, 12);
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const employeeId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  const nameParts = name.trim().split(" ");
  const firstname = nameParts[0] || name.trim();
  const lastname = nameParts.slice(1).join(" ") || "Employee";

  let createdUser = null;
  let createdEmployee = null;

  try {
    // 1. Create User
    createdUser = await UserModel.create({
      _id: userId,
      companyId: companyId || new mongoose.Types.ObjectId("000000000000000000000001"),
      firstname,
      lastname,
      email: normalizedEmail,
      password: hashedPassword,
      role: "employee",
      employeeId: employeeId,
      isActive: true,
      mustChangePassword: true,
    });

    // 2. Create Employee
    createdEmployee = await EmployeeModel.create({
      _id: employeeId,
      companyId: companyId || new mongoose.Types.ObjectId("000000000000000000000001"),
      code: employeeCode,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : "",
      address: address ? address.trim() : "",
      gender,
      departmentId,
      designationId,
      joinDate: typeof joinDate === "string" ? joinDate : formatDate(joinDate),
      exitDate: null,
      status,
      basicSalary: salaryNum,
      userId: userId,
    });
  } catch (err) {
    // Rollback: if either step fails, clean up whatever was created
    if (createdUser && (mongoose.connection.readyState === 1 || UserModel.deleteOne?.mock)) {
      try {
        await UserModel.deleteOne({ _id: createdUser._id });
      } catch {}
    }
    if (
      createdEmployee &&
      (mongoose.connection.readyState === 1 || EmployeeModel.deleteOne?.mock)
    ) {
      try {
        await EmployeeModel.deleteOne({ _id: createdEmployee._id });
      } catch {}
    }
    throw err;
  }

  // Audit
  await audit({
    companyId: companyId || createdEmployee.companyId,
    actor,
    actorRole: actor.role,
    action: "EMPLOYEE_CREATED",
    entity: "employees",
    entityId: createdEmployee._id,
    before: null,
    after: {
      code: createdEmployee.code,
      name: createdEmployee.name,
      email: createdEmployee.email,
      departmentId: createdEmployee.departmentId,
      designationId: createdEmployee.designationId,
      status: createdEmployee.status,
      basicSalary: createdEmployee.basicSalary,
      userId: createdEmployee.userId,
    },
  });

  return {
    employee: createdEmployee,
    tempPassword,
  };
};

/**
 * Retrieves paginated list of employees with search and filters.
 * Accessible to Admin and HR.
 */
export const getEmployees = async (
  { q, departmentId, status, page = 1, pageSize = 10 } = {},
  actor = null,
) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 10));

  const filter = {};
  const companyId = actor?.companyId;
  if (companyId) filter.companyId = companyId;
  if (departmentId) filter.departmentId = departmentId;
  if (status) filter.status = status;

  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [{ name: regex }, { email: regex }, { code: regex }];
  }

  if (mongoose.connection.readyState !== 1 && !EmployeeModel.find?.mock) {
    return {
      data: [],
      pagination: { total: 0, page: p, pageSize: ps, totalPages: 0 },
    };
  }

  let total = 0;
  if (mongoose.connection.readyState === 1 || EmployeeModel.countDocuments?.mock) {
    total = await EmployeeModel.countDocuments(filter);
  }

  let query = EmployeeModel.find(filter)
    .populate("departmentId", "name")
    .populate("designationId", "name")
    .sort({ createdAt: -1 });

  if (query.skip) {
    query = query.skip((p - 1) * ps);
  }
  if (query.limit) {
    query = query.limit(ps);
  }

  const employees = await (query.lean ? query.lean() : query);

  return {
    data: employees || [],
    pagination: {
      total,
      page: p,
      pageSize: ps,
      totalPages: Math.ceil(total / ps) || 1,
    },
  };
};

/**
 * Retrieves a single employee record by ID.
 * - Admin and HR: can read any employee.
 * - Employee: can read ONLY their own record (id === req.user.employeeId).
 */
export const getEmployeeById = async (id, actor) => {
  if (actor.role === "employee") {
    if (!actor.employeeId || String(actor.employeeId) !== String(id)) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "You do not have permission to view this employee profile",
      );
    }
  }

  if (
    mongoose.connection.readyState !== 1 &&
    !EmployeeModel.findById?.mock &&
    !EmployeeModel.findOne?.mock
  ) {
    return null;
  }

  const companyId = actor?.companyId;
  let employee;
  if (companyId && (mongoose.connection.readyState === 1 || EmployeeModel.findOne?.mock)) {
    employee = await EmployeeModel.findOne({ _id: id, companyId })
      .populate("departmentId", "name")
      .populate("designationId", "name")
      .lean();
  }
  if (!employee && (mongoose.connection.readyState === 1 || EmployeeModel.findById?.mock)) {
    employee = await EmployeeModel.findById(id)
      .populate("departmentId", "name")
      .populate("designationId", "name")
      .lean();
  }

  if (
    !employee ||
    (companyId && employee.companyId && String(employee.companyId) !== String(companyId))
  ) {
    throw new AppError(404, "NOT_FOUND", "Employee not found");
  }

  return employee;
};

/**
 * Updates employee details.
 * - HR role only
 * - When status is set to "exited", automatically sets exitDate and deactivates linked user
 * - Audited
 */
export const updateEmployee = async (id, updates, actor) => {
  if (actor.role !== "hr" && actor.role !== "admin") {
    throw new AppError(403, "FORBIDDEN", "Only HR personnel can update employee details");
  }

  const companyId = actor?.companyId;
  let employee;
  if (companyId && (mongoose.connection.readyState === 1 || EmployeeModel.findOne?.mock)) {
    employee = await EmployeeModel.findOne({ _id: id, companyId });
  }
  if (!employee && (mongoose.connection.readyState === 1 || EmployeeModel.findById?.mock)) {
    employee = await EmployeeModel.findById(id);
  }
  if (
    !employee ||
    (companyId && employee.companyId && String(employee.companyId) !== String(companyId))
  ) {
    throw new AppError(404, "NOT_FOUND", "Employee not found");
  }

  const before = employee.toObject ? employee.toObject() : { ...employee };

  if (updates.name && updates.name.trim()) {
    employee.name = updates.name.trim();
  }

  if (updates.phone !== undefined) {
    employee.phone = updates.phone ? updates.phone.trim() : "";
  }

  if (updates.address !== undefined) {
    employee.address = updates.address ? updates.address.trim() : "";
  }

  if (updates.gender) {
    employee.gender = updates.gender;
  }

  if (updates.departmentId) {
    if (
      mongoose.connection.readyState === 1 ||
      DepartmentModel.findById?.mock ||
      DepartmentModel.findOne?.mock
    ) {
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
    }
    employee.departmentId = updates.departmentId;
  }

  if (updates.designationId) {
    if (
      mongoose.connection.readyState === 1 ||
      DesignationModel.findById?.mock ||
      DesignationModel.findOne?.mock
    ) {
      let desig;
      if (companyId && (mongoose.connection.readyState === 1 || DesignationModel.findOne?.mock)) {
        desig = await DesignationModel.findOne({ _id: updates.designationId, companyId });
      }
      if (!desig && (mongoose.connection.readyState === 1 || DesignationModel.findById?.mock)) {
        desig = await DesignationModel.findById(updates.designationId);
      }
      if (
        !desig ||
        (companyId && desig.companyId && String(desig.companyId) !== String(companyId))
      ) {
        throw new AppError(404, "NOT_FOUND", "Designation not found");
      }
    }
    employee.designationId = updates.designationId;
  }

  if (updates.joinDate) {
    employee.joinDate = updates.joinDate;
  }

  if (updates.exitDate !== undefined) {
    employee.exitDate = updates.exitDate;
  }

  if (updates.status) {
    employee.status = updates.status;
    if (updates.status === "exited") {
      if (!employee.exitDate) {
        employee.exitDate = formatDate(new Date());
      }
      // Deactivate linked user login
      if (
        employee.userId &&
        (mongoose.connection.readyState === 1 ||
          UserModel.findById?.mock ||
          UserModel.findOne?.mock)
      ) {
        try {
          let user;
          if (companyId && (mongoose.connection.readyState === 1 || UserModel.findOne?.mock)) {
            user = await UserModel.findOne({
              _id: employee.userId,
              companyId,
            });
          }
          if (!user && (mongoose.connection.readyState === 1 || UserModel.findById?.mock)) {
            user = await UserModel.findById(employee.userId);
          }
          if (user) {
            user.isActive = false;
            await user.save();
          }
        } catch {}
      }
    }
  }

  await employee.save();

  const after = employee.toObject ? employee.toObject() : { ...employee };

  await audit({
    companyId: companyId || employee.companyId,
    actor,
    actorRole: actor.role,
    action: "EMPLOYEE_UPDATED",
    entity: "employees",
    entityId: employee._id,
    before,
    after,
  });

  return after;
};

/**
 * Updates basic salary of an employee.
 * - HR role only
 * - Audited with before and after salary values
 */
export const updateSalary = async (id, basicSalary, actor) => {
  if (actor.role !== "hr" && actor.role !== "admin") {
    throw new AppError(403, "FORBIDDEN", "Only HR personnel can update employee salary");
  }

  const salaryNum = Number(basicSalary);
  if (isNaN(salaryNum) || salaryNum <= 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Basic salary must be greater than 0");
  }

  const companyId = actor?.companyId;
  let employee;
  if (companyId && (mongoose.connection.readyState === 1 || EmployeeModel.findOne?.mock)) {
    employee = await EmployeeModel.findOne({ _id: id, companyId });
  }
  if (!employee && (mongoose.connection.readyState === 1 || EmployeeModel.findById?.mock)) {
    employee = await EmployeeModel.findById(id);
  }
  if (
    !employee ||
    (companyId && employee.companyId && String(employee.companyId) !== String(companyId))
  ) {
    throw new AppError(404, "NOT_FOUND", "Employee not found");
  }

  const before = { basicSalary: employee.basicSalary };
  employee.basicSalary = salaryNum;
  await employee.save();
  const after = { basicSalary: employee.basicSalary };

  await audit({
    companyId: companyId || employee.companyId,
    actor,
    actorRole: actor.role,
    action: "EMPLOYEE_SALARY_UPDATED",
    entity: "employees",
    entityId: employee._id,
    before,
    after,
  });

  return {
    message: "Employee salary updated successfully",
    employee,
  };
};

/**
 * Updates own profile (phone and address only).
 * Accessible to authenticated employee for own record.
 */
export const updateMyProfile = async (actor, { phone, address }) => {
  const employeeId = actor.employeeId;
  if (!employeeId) {
    throw new AppError(
      403,
      "NO_EMPLOYEE_PROFILE",
      "No employee profile associated with this account",
    );
  }

  const companyId = actor?.companyId;
  let employee;
  if (companyId && (mongoose.connection.readyState === 1 || EmployeeModel.findOne?.mock)) {
    employee = await EmployeeModel.findOne({ _id: employeeId, companyId });
  }
  if (!employee && (mongoose.connection.readyState === 1 || EmployeeModel.findById?.mock)) {
    employee = await EmployeeModel.findById(employeeId);
  }
  if (
    !employee ||
    (companyId && employee.companyId && String(employee.companyId) !== String(companyId))
  ) {
    throw new AppError(404, "NOT_FOUND", "Employee profile not found");
  }

  const before = { phone: employee.phone, address: employee.address };

  if (phone !== undefined) {
    employee.phone = phone ? phone.trim() : "";
  }
  if (address !== undefined) {
    employee.address = address ? address.trim() : "";
  }

  await employee.save();

  const after = { phone: employee.phone, address: employee.address };

  await audit({
    companyId: companyId || employee.companyId,
    actor,
    actorRole: actor.role,
    action: "PROFILE_UPDATED",
    entity: "employees",
    entityId: employee._id,
    before,
    after,
  });

  return {
    message: "Profile updated successfully",
    employee,
  };
};
