const multer = require('multer')
const helper = require('../helper/response')

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(file)
    cb(null, './uploads/user')
  },
  filename: function (req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname)
  }
})

const fileFilter = (req, file, cb) => {
  console.log(file.mimetype)
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
    cb(null, true)
  } else {
    cb(new Error('File extension must be jpg / png'), false)
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 2000000 },
  fileFilter
}).single('userPic')

const uploadFilter = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      return helper.response(res, 400, err.message)
    } else if (err) {
      // An unknown error occurred when uploading.
      return helper.response(res, 400, err.message)
    }
    // Everything went fine.
    next()
  })
}

module.exports = uploadFilter
