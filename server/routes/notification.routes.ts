import { Router, type RequestHandler } from "express";
import mongoose from "mongoose";

import { Notification } from "../models/Notification";
import { requireAuth } from "../middleware/auth";

const router = Router();

const getNotifications: RequestHandler = async (req, res) => {
  const auth = req.authUser;

  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const notifications = await Notification.find({
    userId: auth.id,
  })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(
    notifications.map((n) => ({
      id: n._id.toString(),
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    }))
  );
};

const markNotificationRead: RequestHandler = async (req, res) => {
  const auth = req.authUser;

  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = String(req.params.id ?? "");

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }

  await Notification.updateOne(
    {
      _id: id,
      userId: auth.id,
    },
    {
      $set: {
        read: true,
      },
    }
  );

  res.json({ ok: true });
};

const markAllRead: RequestHandler = async (req, res) => {
  const auth = req.authUser;

  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await Notification.updateMany(
    {
      userId: auth.id,
      read: false,
    },
    {
      $set: {
        read: true,
      },
    }
  );

  res.json({ ok: true });
};

router.get("/", requireAuth, getNotifications);

router.patch("/:id/read", requireAuth, markNotificationRead);

router.patch("/read-all", requireAuth, markAllRead);

export default router;