import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join('uploads', 'avatars'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    cb(null, `${req.user.id}-${timestamp}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const allowedExtensions = /\.(jpg|jpeg|png|gif)$/i;
  const allowedMimetypes = ['image/jpeg', 'image/png', 'image/gif'];

  if (allowedExtensions.test(file.originalname) && allowedMimetypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, or GIF files with valid mimetypes are allowed'));
  }
}

const upload = multer({ storage, fileFilter });

export default upload;
