const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/database');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/job-media');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Upload photo for job
router.post('/upload', upload.single('photo'), async (req, res) => {
    try {
        const { job_id, media_type, uploaded_by, notes } = req.body;
        
        if (!job_id || !media_type) {
            return res.status(400).json({ error: 'job_id and media_type are required' });
        }
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Verify job exists
        const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(job_id);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        // Insert media record
        const insertMedia = db.prepare(`
            INSERT INTO job_media (job_id, media_type, file_url, file_name, uploaded_by, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const result = insertMedia.run(
            job_id,
            media_type,
            `/uploads/job-media/${req.file.filename}`,
            req.file.originalname,
            uploaded_by || 'Unknown',
            notes || ''
        );
        
        // Get created media record
        const media = db.prepare('SELECT * FROM job_media WHERE id = ?').get(result.lastInsertRowid);
        
        console.log(`📸 Photo uploaded: ${media_type} for job ${job_id}`);
        
        res.json({
            success: true,
            media,
            message: 'Photo uploaded successfully'
        });
        
    } catch (error) {
        console.error('Photo upload error:', error);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});

// Get all photos for a job
router.get('/job/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const media = db.prepare(`
            SELECT * FROM job_media 
            WHERE job_id = ? 
            ORDER BY created_at ASC
        `).all(jobId);
        
        res.json(media);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete photo
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get media record
        const media = db.prepare('SELECT * FROM job_media WHERE id = ?').get(id);
        if (!media) {
            return res.status(404).json({ error: 'Photo not found' });
        }
        
        // Delete file from filesystem (optional - you might want to keep files)
        const fs = require('fs');
        const filePath = path.join(__dirname, '../../', media.file_url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Delete from database
        db.prepare('DELETE FROM job_media WHERE id = ?').run(id);
        
        console.log(`🗑️ Photo deleted: ${media.file_name}`);
        
        res.json({
            success: true,
            message: 'Photo deleted successfully'
        });
        
    } catch (error) {
        console.error('Photo deletion error:', error);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});

// Get photos grouped by type for a job
router.get('/job/:jobId/grouped', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const allMedia = db.prepare(`
            SELECT * FROM job_media 
            WHERE job_id = ? 
            ORDER BY created_at ASC
        `).all(jobId);
        
        // Group by media type
        const grouped = {
            Before: allMedia.filter(m => m.media_type === 'Before'),
            After: allMedia.filter(m => m.media_type === 'After'),
            Progress: allMedia.filter(m => m.media_type === 'Progress')
        };
        
        res.json(grouped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
