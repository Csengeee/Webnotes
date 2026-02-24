const mysql = require("mysql");
const config = require("./config");

// create pool once
const pool = mysql.createPool(config);

// használat: Controlleren belül connectDB(futtatandó sql query, post kérés esetén az adatbázisnak átadott adat).
const connectDB = async (query, values) => {
  return new Promise(resolve => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('DB connection error:', err);
        if (connection && typeof connection.release === 'function') connection.release();
        return resolve([1, err]);
      }

      const cb = (err, result) => {
        if (err) {
          console.error('DB query error:', err);
          if (connection && typeof connection.release === 'function') connection.release();
          return resolve([1, err]);
        }
        if (connection && typeof connection.release === 'function') connection.release();
        return resolve([0, result]);
      };

      try {
        if (typeof values === 'undefined') {
          connection.query(query, cb);
        } else {
          connection.query(query, values, cb);
        }
      } catch (e) {
        console.error('DB unexpected error:', e);
        if (connection && typeof connection.release === 'function') connection.release();
        return resolve([1, e]);
      }
    });
  });
}

const getConnection = () => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) reject(err);
      else resolve(connection);
    });
  });
};

module.exports = { connectDB, getConnection };