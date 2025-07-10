const cloudinary = require('cloudinary').v2;

class CloudinaryService {
    constructor(config) {
        cloudinary.config({
            cloud_name: config.cloud_name,
            api_key: config.api_key,
            api_secret: config.api_secret
        });
    }

    async uploadImage(filePath) {
        try {
            const result = await cloudinary.uploader.upload(filePath, {
                public_id: `notion-movies/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                resource_type: 'image',
                quality: 'auto',
                fetch_format: 'auto'
            });

            return {
                url: result.secure_url,
                public_id: result.public_id
            };
        } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            throw error;
        }
    }

    async deleteImage(publicId) {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            return result;
        } catch (error) {
            console.error('Error deleting from Cloudinary:', error);
            throw error;
        }
    }

    async getImageInfo(publicId) {
        try {
            const result = await cloudinary.api.resource(publicId);
            return result;
        } catch (error) {
            console.error('Error getting image info:', error);
            throw error;
        }
    }
}

module.exports = CloudinaryService;