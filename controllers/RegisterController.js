const connectDB = require("../config/db")
const bcrypt = require('bcryptjs')
const sanitizer = require('../modules/inputSanitizer')

const register = async (req, res, next) => {
  if (!req.body) return res.sendStatus(400)
  const raw = req.body || {}
  const username = sanitizer.sanitizeText(raw.username || '', 100)
  const email = String((raw.email || '').trim())
  const keresztnev = sanitizer.sanitizeText(raw.keresztnev || '', 100)
  const vezeteknev = sanitizer.sanitizeText(raw.vezeteknev || '', 100)
  const create_password = raw.create_password || ''
  const confirm_password = raw.confirm_password || ''

  let error = false
  const data = {}

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

  if (!passwordRegex.test(create_password)) {
    data.password = 'weak'
    error = true
  }
  if (create_password !== confirm_password) {
    data.password = 'mismatch'
    error = true
  }

  if (!keresztnev) {
    data.keresztnev = true
    error = true
  } else {
    data.keresztnev_val = keresztnev
  }

  if (!vezeteknev) {
    data.vezeteknev = true
    error = true
  } else {
    data.vezeteknev_val = vezeteknev
  }

  if (!username) {
    data.username = true
    error = true
  } else {
    data.username_val = username
  }

  // basic email validation
  const emailRegex = /\S+@\S+\.\S+/;
  if (!email || !emailRegex.test(email)) {
    data.email = true
    error = true
  } else {
    data.email_val = email
  }

  const setErr = () => { error = true }

  const encryptedPass = bcrypt.hashSync(create_password)
  const user = [ [username, `${vezeteknev} ${keresztnev}`.trim(), email, encryptedPass] ]
  const query = 'insert into user (username,name,email,password) values ?'
  if (!error) {
    await connectDB(query, user).then(([code, result]) => {
      if (code == 1) {
        var errorMsg = result.sqlMessage ? String(result.sqlMessage).split('key')[1] : ''
        if (errorMsg == " 'email'") {
          data.email = true
        }
        if (errorMsg == " 'username'") {
          data.username = true
        }
        setErr()
      } else {
        res.redirect('/')
      }
    })
  }
  if (error) {
    res.render('register', data)
  }
}
module.exports = register