const mysql = require("mysql");
const config = require("./config");

//használat:Controlleren belül connectDB(futtatandó sql query, post kérés esetén az adatbázisnak átadott adat).
const connectDB = async (query, values) => {
  return new Promise(resolve => {
    const pool = mysql.createPool(config);
    try {
      pool.getConnection((err, connection) => {
        if (err) {
          console.error(err.code + ': ' + err.sqlMessage + '\nQUERY: ' + err.sql)
          connection.release();
          resolve([1, err])
        } else {
          connection.query(query, [values], function (err, result) {
            if (err) {
              console.error(err.code + ': ' + err.sqlMessage + '\nQUERY: ' + err.sql)
              connection.release();
              resolve([1, err])
            } else {
              connection.release();
              resolve([0, result])
            }
          })

        }
      })
    } catch (err) {
      console.error(err.code + ': ' + err.sqlMessage + '\nQUERY: ' + err.sql)
      connection.release();
      resolve([1, err])
    }
  });
}
module.exports = connectDB;