const connectDB = require("../config/db")
const bcrypt = require('bcryptjs')

const register = async (req, res, next) => {
  if (!req.body) return res.sendStatus(400)
  const {
    username,
    email,
    keresztnev,
    vezeteknev,
    create_password,
    confirm_password
  } = req.body
  var error = false
  var data = {}

  var regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

  if (!regex.test(create_password)) {
    data["password"] = true
    error = true
  }
  if (create_password != confirm_password) {
    data["password"] = true
    error = true
  }

  if (keresztnev.length < 1) {
    data["keresztnev"] = keresztnev
    error = true
  } else {
    data["keresztnev_val"] = keresztnev
  }

  if (vezeteknev.length < 1) {
    data["vezeteknev"] = vezeteknev
    error = true
  } else {
    data["vezeteknev_val"] = vezeteknev
  }

  if (username.length < 1) {
    data["username"] = username
    error = true
  } else {
    data["username_val"] = username
  }

  if (email < 1) {
    data["email"] = email
    error = true
  } else {
    data["email_val"] = email
  }


  const setErr = () => {
    error = true
  }
  var encryptedPass = bcrypt.hashSync(create_password)
  user = [
    [username, vezeteknev + ' ' + keresztnev, email, encryptedPass]
  ]
  query = 'insert into user (username,name,email,password) values ?'
  if (!error) {
    await connectDB(query, user).then(([code, result]) => {
      if (code == 1) {
        var errorMsg = result.sqlMessage.split('key')[1]
        if (errorMsg == " 'email'") {
          data["email"] = email
        }
        if (errorMsg == " 'username'") {
          data["username"] = username
        }
        setErr()

      } else {
        //todo: implement success logic
        //placeholder:
        res.redirect('/')
      }
    })
  }
  if (error) {
    res.render('register', data)
  }
}
module.exports = register