const { PrismaClient } = require("@prisma/client");
const { notifyUser, notifyRole, broadcast } = require("./socketManager");

const prisma = new PrismaClient();

/**
 * Notification types:
 * - COMPLAINT_CREATED: New complaint filed
 * - COMPLAINT_VOTED: Someone voted on a complaint
 * - VOTE_MILESTONE: Complaint reached a vote milestone (10, 25, 50)
 * - COMPLAINT_ESCALATED: Complaint auto-escalated (50 votes or SLA breach)
 * - STATUS_CHANGED: Complaint status changed
 * - SLA_BREACH: SLA deadline passed
 * - DEPARTMENT_ASSIGNED: Complaint assigned to department/subadmin
 * - RESOLUTION_CHALLENGED: Citizen challenged a resolution
 */

const NOTIFICATION_TYPES = {
  COMPLAINT_CREATED: "COMPLAINT_CREATED",
  COMPLAINT_VOTED: "COMPLAINT_VOTED",
  VOTE_MILESTONE: "VOTE_MILESTONE",
  COMPLAINT_ESCALATED: "COMPLAINT_ESCALATED",
  STATUS_CHANGED: "STATUS_CHANGED",
  SLA_BREACH: "SLA_BREACH",
  DEPARTMENT_ASSIGNED: "DEPARTMENT_ASSIGNED",
  RESOLUTION_CHALLENGED: "RESOLUTION_CHALLENGED",
};

/**
 * Create a notification, persist it to DB, and emit via WebSocket.
 *
 * @param {Object} params
 * @param {number} params.userId — Target user ID
 * @param {string} params.type — Notification type
 * @param {string} params.title — Short title
 * @param {string} params.message — Full message body
 * @param {Object} [params.metadata] — Optional JSON metadata (e.g. complaintId, votes)
 */
const createNotification = async ({ userId, type, title, message, metadata = null }) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Emit to the specific user in real-time
    notifyUser(userId, "notification:new", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: metadata || null,
      read: false,
      createdAt: notification.createdAt,
    });

    return notification;
  } catch (err) {
    console.error("[Notification] Failed to create:", err.message);
    return null;
  }
};

/**
 * Notify all users of a given role.
 */
const notifyAllOfRole = async ({ role, type, title, message, metadata = null }) => {
  try {
    const users = await prisma.user.findMany({
      where: { role },
      select: { id: true },
    });

    const notifications = await Promise.all(
      users.map((u) =>
        createNotification({ userId: u.id, type, title, message, metadata })
      )
    );

    return notifications.filter(Boolean);
  } catch (err) {
    console.error("[Notification] Failed to notify role:", err.message);
    return [];
  }
};

/**
 * Emit a complaint event via WebSocket (no persistence).
 */
const emitComplaintEvent = (event, data) => {
  broadcast(event, data);
};

/**
 * Called when a new complaint is created.
 */
const onComplaintCreated = async (complaint) => {
  // Notify all admins & superadmins
  await notifyAllOfRole({
    role: "ADMIN",
    type: NOTIFICATION_TYPES.COMPLAINT_CREATED,
    title: "New Complaint Filed",
    message: `"${complaint.title}" in ${complaint.category}`,
    metadata: { complaintId: complaint.id, category: complaint.category },
  });

  await notifyAllOfRole({
    role: "SUPERADMIN",
    type: NOTIFICATION_TYPES.COMPLAINT_CREATED,
    title: "New Complaint Filed",
    message: `"${complaint.title}" in ${complaint.category}`,
    metadata: { complaintId: complaint.id, category: complaint.category },
  });

  emitComplaintEvent("complaint:created", {
    id: complaint.id,
    title: complaint.title,
    category: complaint.category,
    createdAt: complaint.createdAt,
  });
};

/**
 * Called when a complaint receives a vote.
 */
const onComplaintVoted = async (complaint, voterId) => {
  // Notify complaint owner
  if (complaint.userId !== voterId) {
    await createNotification({
      userId: complaint.userId,
      type: NOTIFICATION_TYPES.COMPLAINT_VOTED,
      title: "Your Complaint Got a Vote!",
      message: `"${complaint.title}" now has ${complaint.votes} votes`,
      metadata: { complaintId: complaint.id, votes: complaint.votes },
    });
  }

  // Check for vote milestones
  const milestones = [10, 25, 50];
  for (const milestone of milestones) {
    if (complaint.votes === milestone) {
      await createNotification({
        userId: complaint.userId,
        type: NOTIFICATION_TYPES.VOTE_MILESTONE,
        title: `🎉 ${milestone} Votes Milestone!`,
        message: `"${complaint.title}" reached ${milestone} votes!${milestone === 50 ? " It will be escalated!" : ""}`,
        metadata: { complaintId: complaint.id, votes: milestone },
      });

      // Also notify admins for major milestones
      if (milestone >= 25) {
        await notifyAllOfRole({
          role: "ADMIN",
          type: NOTIFICATION_TYPES.VOTE_MILESTONE,
          title: `Complaint Hit ${milestone} Votes`,
          message: `"${complaint.title}" is gaining traction`,
          metadata: { complaintId: complaint.id, votes: milestone },
        });
      }
    }
  }

  emitComplaintEvent("complaint:voted", {
    id: complaint.id,
    votes: complaint.votes,
  });
};

/**
 * Called when a complaint status changes.
 */
const onStatusChanged = async (complaint, newStatus, changedByRole) => {
  // Notify complaint owner
  await createNotification({
    userId: complaint.userId,
    type: NOTIFICATION_TYPES.STATUS_CHANGED,
    title: "Complaint Status Updated",
    message: `"${complaint.title}" is now ${newStatus}`,
    metadata: { complaintId: complaint.id, status: newStatus },
  });

  emitComplaintEvent("complaint:statusChanged", {
    id: complaint.id,
    status: newStatus,
  });
};

/**
 * Called when a complaint is escalated.
 */
const onComplaintEscalated = async (complaint) => {
  await createNotification({
    userId: complaint.userId,
    type: NOTIFICATION_TYPES.COMPLAINT_ESCALATED,
    title: "🚨 Complaint Escalated!",
    message: `"${complaint.title}" has been escalated to authorities`,
    metadata: { complaintId: complaint.id },
  });

  await notifyAllOfRole({
    role: "ADMIN",
    type: NOTIFICATION_TYPES.COMPLAINT_ESCALATED,
    title: "Complaint Escalated",
    message: `"${complaint.title}" reached escalation threshold`,
    metadata: { complaintId: complaint.id },
  });

  await notifyAllOfRole({
    role: "SUPERADMIN",
    type: NOTIFICATION_TYPES.COMPLAINT_ESCALATED,
    title: "Complaint Escalated",
    message: `"${complaint.title}" reached escalation threshold`,
    metadata: { complaintId: complaint.id },
  });

  emitComplaintEvent("complaint:escalated", {
    id: complaint.id,
    title: complaint.title,
  });
};

/**
 * Called when SLA is breached.
 */
const onSLABreach = async (complaint) => {
  if (complaint.assignedAdminId) {
    await createNotification({
      userId: complaint.assignedAdminId,
      type: NOTIFICATION_TYPES.SLA_BREACH,
      title: "⚠️ SLA Breach!",
      message: `Complaint "${complaint.title}" has breached its SLA deadline`,
      metadata: { complaintId: complaint.id },
    });
  }

  await notifyAllOfRole({
    role: "SUPERADMIN",
    type: NOTIFICATION_TYPES.SLA_BREACH,
    title: "SLA Breach Alert",
    message: `Complaint "${complaint.title}" exceeded deadline`,
    metadata: { complaintId: complaint.id },
  });
};

module.exports = {
  NOTIFICATION_TYPES,
  createNotification,
  notifyAllOfRole,
  emitComplaintEvent,
  onComplaintCreated,
  onComplaintVoted,
  onStatusChanged,
  onComplaintEscalated,
  onSLABreach,
};
