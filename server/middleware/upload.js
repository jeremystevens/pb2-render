import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join('uploads', 'avatars'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const allowed = /\.(jpg|jpeg|png|gif)$/i;
  if (allowed.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, or GIF files are allowed'));
  }
}

const upload = multer({ storage, fileFilter });

export default upload;
