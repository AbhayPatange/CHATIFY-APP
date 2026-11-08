import express from "express";
import {
  getAllContacts,
  getChatPartners,
  getMessagesByUserId,
  markMessagesSeen,
  sendMessage,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

// requests get rate-limited first, then authenticated
router.use(arcjetProtection, protectRoute);

router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);
router.get("/:id", getMessagesByUserId);
router.post("/send/:id", sendMessage);
router.put("/seen/:id", markMessagesSeen);

export default router;
