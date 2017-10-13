module.exports = {
  gc: false,
  memory: { frequency: 5 * 1000 },
  cpuTime: { frequency: 6 * 1000 },
  eventLoop: { frequency: 10 * 1000 },

  report(type, metrics) {
    console.log(type, metrics);
  }
};