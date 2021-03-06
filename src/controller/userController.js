const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const helper = require('../helper/response')
const nodemailer = require('nodemailer')
const fs = require('fs')

const {
  registerUser,
  checkEmail,
  checkEmailActive,
  updatePassword,
  activateUser,
  patchUser,
  forgotPassword,
  resetPassword
} = require('../model/userModel')

module.exports = {
  registerUser: async (request, response) => {
    try {
      const {
        userName,
        userEmail,
        userPassword,
        userConfirmPassword
      } = request.body

      if (userPassword !== userConfirmPassword) {
        return helper.response(response, 400, 'Password not match')
      }

      const check = await checkEmail(userEmail)
      if (check.length > 0) {
        return helper.response(
          response,
          400,
          'Duplicate Email, email has been used by another account or have registered but not active, please check your email to activate your account'
        )
      }

      const salt = bcrypt.genSaltSync(10)
      const encryptPassword = bcrypt.hashSync(userPassword, salt)

      const crypto = require('crypto')
      const key = crypto.randomBytes(20).toString('hex')

      const setData = {
        user_name: userName,
        user_email: userEmail,
        user_password: encryptPassword,
        user_status: 0,
        user_key: key,
        user_created_at: new Date()
      }

      const result = await registerUser(setData)

      if (result) {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: 'kostkost169@gmail.com', // generated ethereal user
            pass: 'admin@123456' // generated ethereal password
          }
        })
        const mailOptions = {
          from: '"startup coffee" <startup coffee@gmail.com', // sender address
          to: userEmail, // list of receivers
          subject: 'startup coffee - Activate account', // Subject line
          html: `<p>To Account  </p>
          <p>Click link bellow to activate your account</p>
          <a href="${process.env.URL}/active/${key}">Activate my account</a>`
        }
        await transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error)
            return helper.response(response, 400, 'Email not send !')
          } else {
            console.log(info)
            return helper.response(response, 200, 'Email has been send !')
          }
        })
      }

      return helper.response(
        response,
        200,
        'Success Register User, please check your email to activate your account',
        result
      )
    } catch (error) {
      return helper.response(response, 400, 'Bad Request', error)
    }
  },
  activateUser: async (req, res) => {
    try {
      const { key } = req.params
      console.log(key)
      const result = await activateUser(key)
      return helper.response(
        res,
        200,
        'your account is already active, please login first',
        result
      )
    } catch (error) {
      console.log(error)
      return helper.response(res, 400, 'Bad Request', error)
    }
  },
  loginUser: async (req, res) => {
    try {
      const { userEmail, userPassword } = req.body

      const check = await checkEmailActive(userEmail)

      if (check.length > 0) {
        const passwordCheck = bcrypt.compareSync(
          userPassword,
          check[0].user_password
        )

        if (passwordCheck) {
          const {
            user_id: userId,
            user_name: userName,
            user_email: userEmail
          } = check[0]

          const payload = {
            userId,
            userName,
            userEmail
          }

          const token = jwt.sign(payload, 'PASSWORD', { expiresIn: '24h' })
          const result = { ...payload, token }
          return helper.response(res, 200, 'Login success', result)
        } else {
          return helper.response(res, 400, 'wrong password')
        }
      } else {
        return helper.response(
          res,
          403,
          "User not found, please register first, if you have register but can't login, please check your email to activate your account"
        )
      }
    } catch (error) {
      return helper.response(res, 400, 'Bad Request', error)
    }
  },
  patchPassword: async (req, res) => {
    try {
      const { userEmail, userPassword, userConfirmPassword } = req.body

      if (userPassword !== userConfirmPassword) {
        return helper.response(res, 400, 'Password not match')
      }

      const check = await checkEmail(userEmail)

      if (check.length === 0) {
        return helper.response(res, 400, 'user not found')
      }

      const salt = bcrypt.genSaltSync(10)
      const encryptPassword = bcrypt.hashSync(userPassword, salt)

      const setData = {
        user_email: userEmail,
        user_password: encryptPassword
      }

      const result = await updatePassword(setData)

      return helper.response(res, 200, 'Success update password', result)
    } catch (error) {
      return helper.response(res, 400, 'Bad Request', error)
    }
  },
  patchUser: async (request, response) => {
    try {
      const {
        userEmail,
        userName,
        userPhone,
        userBio,
        userLat,
        userLng
      } = request.body
      let newPic
      const user = await checkEmail(userEmail)

      if (request.file === undefined) {
        newPic = user[0].user_pic
      } else {
        if (user[0].user_pic === null) {
          newPic = request.file.filename
        } else {
          newPic = request.file.filename
          fs.unlink(`./uploads/user/${user[0].user_pic}`, function (err) {
            if (err) throw err
            console.log('File deleted!')
          })
        }
      }

      let setData
      if (userLat && userLng) {
        setData = {
          user_lat: userLat,
          user_lng: userLng
        }
      } else {
        setData = {
          user_name: userName,
          user_pic: newPic,
          user_phone: userPhone,
          user_bio: userBio,
          user_updated_at: new Date()
        }
      }

      const result = await patchUser(setData, userEmail)

      return helper.response(
        response,
        200,

        'Success update your profile ',
        result
      )
    } catch (error) {
      return helper.response(response, 400, 'Bad Request', error)
    }
  },
  getUserByEmail: async (req, res) => {
    try {
      const { email } = req.params

      const result = await checkEmail(email)
      return helper.response(res, 200, 'success get data', result)
    } catch (error) {
      return helper.response(res, 400, 'Bad Request', error)
    }
  },
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body

      const crypto = require('crypto')
      const key = crypto.randomBytes(20).toString('hex')

      const data = {
        email,
        key
      }

      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: 'kostkost169@gmail.com', // generated ethereal user
          pass: 'admin@123456' // generated ethereal password
        }
      })
      const mailOptions = {
        from: '"Kenal Chat App" <kenalchatapp@gmail.com', // sender address
        to: email, // list of receivers
        subject: 'kenal chat app - Reset Password', // Subject line
        html: `
        <p>Hello ${email} please reset your password by click the link bellow</p>
        <a href=" ${process.env.URL}/reset/${key}">Click here to reset your password</a>`
      }

      await transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          return helper.response(
            res,
            403,
            'Failed to send email, make sure your email is correct.'
          )
        } else {
          const result = forgotPassword(data)

          return helper.response(
            res,
            200,
            'Please check your email to reset your password',
            result
          )
        }
      })
    } catch (error) {
      return helper.response(res, 400, 'Bad Request', error)
    }
  },
  resetPassword: async (req, res) => {
    try {
      const { userKey, password, confirmPassword } = req.body

      if (password !== confirmPassword) {
        return helper.response(res, 403, 'Password not match')
      }

      const salt = bcrypt.genSaltSync(10)
      const encryptPassword = bcrypt.hashSync(password, salt)

      const data = {
        userKey,
        password: encryptPassword
      }

      const result = await resetPassword(data)
      return helper.response(res, 200, 'success reset password', result)
    } catch (error) {
      return helper.response(res, 400, 'Bad Request', error)
    }
  }
}
