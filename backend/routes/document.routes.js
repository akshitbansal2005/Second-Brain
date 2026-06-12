/**
 * routes/document.routes.js
 * File upload handled with multer (memory storage — buffers passed to parser).
 */

const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
} = require('../controllers/document.controller');

const router = express.Router();

// Use memory storage so we can pass the buffer directly to text parsers
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const ext = file.originalname.split('.').pop().toLowerCase();
  const allowedExt = ['pdf', 'txt', 'docx'];

  if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, TXT, and DOCX files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

router.use(protect);

router.post('/upload', upload.single('file'), asyncHandler(uploadDocument));
router.get('/', asyncHandler(getDocuments));
router.get('/:id', asyncHandler(getDocument));
router.delete('/:id', asyncHandler(deleteDocument));

module.exports = router;
