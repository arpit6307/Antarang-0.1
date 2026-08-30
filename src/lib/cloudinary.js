/**
 * Cloudinary Image Upload Helper for Antarang
 * Cloud Name: dhsyajcf3
 * Preset: Antarang
 */
const CLOUDINARY_CLOUD_NAME = 'dhsyajcf3';
const CLOUDINARY_UPLOAD_PRESET = 'Antarang';
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Uploads an image File object to Cloudinary and returns the secure HTTPS URL.
 * @param {File} file - Image file to upload
 * @returns {Promise<string>} Secure HTTPS URL of the uploaded image
 */
export async function uploadToCloudinary(file) {
  if (!file) throw new Error('No file provided for upload');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_API_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
}
