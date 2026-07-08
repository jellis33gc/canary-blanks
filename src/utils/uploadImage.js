import { base44 } from "@/api/base44Client";

export async function uploadImageFile(file) {
  if (!file) return "";

  if (!file.type?.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const result = await base44.integrations.Core.UploadFile({ file });
  const fileUrl = result?.file_url || result?.url || result?.fileUrl;

  if (!fileUrl) {
    throw new Error("The image uploaded, but no image URL was returned.");
  }

  return fileUrl;
}
