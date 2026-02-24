const format = (...args) => [new Date().toISOString(), ...args].join(' ')

module.exports = {
  info: (...args) => console.log(format(...args)),
  warn: (...args) => console.warn(format(...args)),
  error: (...args) => console.error(format(...args)),
}
