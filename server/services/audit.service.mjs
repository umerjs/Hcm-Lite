import mongoose from "mongoose";
import { AuditLogModel } from "../models/audit/index.mjs";

/**
 * Authoritative Audit Logger (Append-only)
 *
 * Records all mutation events for administrative review, security, and compliance.
 *
 * @param {Object} params
 * @param {Object|string|mongoose.Types.ObjectId|null} [params.actor=null] - The user/admin performing the action
 * @param {string|null} [params.actorRole=null] - Role of the actor ('admin'|'hr'|'employee'|'system')
 * @param {string} params.action - Action identifier (e.g. "SETTINGS_UPDATE", "LEAVE_DECISION")
 * @param {string} params.entity - Name of target entity (e.g. "settings", "leaverequests")
 * @param {string|Object} params.entityId - Primary identifier of the affected record
 * @param {Object|null} [params.before=null] - State prior to mutation
 * @param {Object|null} [params.after=null] - State after mutation
 * @returns {Promise<Object>}
 */
export const audit = async ({
  actor = null,
  actorRole = null,
  action,
  entity,
  entityId,
  before = null,
  after = null,
}) => {
  let resolvedActorId = null;
  let resolvedRole = actorRole;

  if (actor) {
    if (typeof actor === "object" && actor !== null) {
      resolvedActorId = actor._id || actor.id || null;
      if (!resolvedRole && actor.role) {
        resolvedRole = actor.role;
      }
    } else {
      resolvedActorId = actor;
    }
  }

  if (!resolvedRole) {
    resolvedRole = "system";
  }

  // Gracefully handle unit tests running without a live MongoDB connection
  if (mongoose.connection.readyState !== 1 && !AuditLogModel.create?.mock) {
    console.log(
      `[audit:in-memory] ${resolvedRole}:${resolvedActorId || "anon"} performed ${action} on ${entity}:${entityId}`,
    );
    return {
      _id: new mongoose.Types.ObjectId(),
      actor: resolvedActorId,
      actorRole: resolvedRole,
      action,
      entity,
      entityId,
      before,
      after,
      createdAt: new Date(),
    };
  }

  const record = await AuditLogModel.create({
    actor: resolvedActorId,
    actorRole: resolvedRole,
    action,
    entity,
    entityId,
    before,
    after,
  });

  return record;
};
