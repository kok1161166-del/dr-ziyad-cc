import { Router, type IRouter } from "express";
import { v2 as cloudinary } from "cloudinary";
import { logger } from "../lib/logger";

cloudinary.config({
  cloud_name: process.env["CLOUDINARY_CLOUD_NAME"],
  api_key: process.env["CLOUDINARY_API_KEY"],
  api_secret: process.env["CLOUDINARY_API_SECRET"],
});

const router: IRouter = Router();

router.post("/upload", async (req, res) => {
  try {
    const { image, folder } = req.body;
    if (!image || typeof image !== "string") {
      res.status(400).json({ error: "Missing image data (base64 or URL)" });
      return;
    }
    const result = await cloudinary.uploader.upload(image, {
      folder: folder || "clinic",
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    });
    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (err) {
    logger.error({ err }, "Cloudinary upload failed");
    res.status(500).json({ error: "Upload failed" });
  }
});

router.delete("/upload/:publicId", async (req, res) => {
  try {
    await cloudinary.uploader.destroy(req.params["publicId"]);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Cloudinary delete failed");
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
