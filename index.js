const nativeMetrics = require("@newrelic/native-metrics");
const v8 = require("v8");
const fs = require("fs");
const os = require("os");

class VMStats {
  constructor(config = {}) {
    this.config = Object.assign(this.default(), config);
    this.CPU_CORES = os.cpus().length;
    this.PID = process.pid;
  }

  start() {
    this.collector = nativeMetrics();

    if (this.config.gc) this.gc();
    if (this.config.memory) this.memory();
    if (this.config.cpuTime) this.cpuTime();
    if (this.config.eventLoop) this.eventLoop();

    if (os.platform() != "linux") return;
    if (this.config.thread) this.thread();
    if (this.config.fd) this.fd();
  }

  default() {
    const FREQUENCY = 15 * 1000;
    return {
      gc: true,
      memory: { frequency: FREQUENCY },
      eventLoop: { frequency: FREQUENCY },
      cpuTime: { frequency: FREQUENCY },
      thread: { frequency: FREQUENCY },
      fd: { frequency: FREQUENCY },
      report(type, pid, metrics) { console.log(type, pid, metrics); }
    };
  }

  gc() {
    let totalGCPausedTime = 0;
    let totalGCCount = 0;

    this.collector.on("gc", ({ type, duration }) => {
      totalGCCount++;
      totalGCPausedTime += duration;
      let heapSpaceStats = v8.getHeapSpaceStatistics();
      let [newSpace, oldSpace, _, mapSpace, largeObjectSpace] = heapSpaceStats;

      let metrics = {
        type, // gc 类型
        duration, // 占用主线程时间, 单位: 纳秒
        newSpace, // 当前 v8 堆的 new space
        oldSpace, // 当前 v8 堆的 old space
        mapSpace, // 当前 v8 堆的 map space
        largeObjectSpace, // 当前 v8 堆的 large object space
        totalGCCount, // 总共的 GC 次数
        totalGCPausedTime, // 总共占用主线程的时间, 单位: 纳秒
      };

      this.reportGC(metrics);
    });
  }

  memory() {
    setInterval(() => {
      let { rss, heapTotal, heapUsed, external } = process.memoryUsage();
      let nonHeapUsed = rss - heapTotal;

      let heapStats = v8.getHeapStatistics();
      let {
        heap_size_limit: heapSizeLimit,
        total_physical_size: totalPhysicalSize,
      } = heapStats;

      let metrics = {
        rss, // 驻留集内存
        external, // 绑定到 JS 对象上的 C++ 对象占用的内存, 如 buffer
        heapUsed, // v8 使用的堆内存
        heapTotal, // v8 总共申请的堆内存
        nonHeapUsed, // v8 使用的非堆内存
        heapSizeLimit, // v8 堆内存上限
        totalPhysicalSize // v8 commited 的内存
      };

      this.reportMemory(metrics);
    }, this.config.memory.frequency);
  }

  // 进程的 cpu 时间及利用率
  cpuTime() {
    let lastUsage = null;
    let lastSampleTime = Date.now() - process.uptime() * 1000;

    setInterval(() => {
      let { user, system } = process.cpuUsage(lastUsage); // 单位：微秒
      lastUsage = process.cpuUsage();
      let metrics = this._cpuTimeMetrics(lastSampleTime, user / 1000, system / 1000);
      lastSampleTime = Date.now();
      this.reportCPU(metrics);
    }, this.config.cpuTime.frequency);
  }

  // 单位：毫秒
  _cpuTimeMetrics(lastSampleTime, utime, stime) {
    let elapsed = Date.now() - lastSampleTime;
    let totalCPUTime = this.CPU_CORES * elapsed;

    return {
      user: utime,
      sys: stime,
      user_utilization: utime / totalCPUTime,
      sys_utilization: stime / totalCPUTime
    };
  }

  // ticks 消耗的 cpu 时间，tick 次数
  // The total CPU time spent actively executing in each event loop tick. 
  eventLoop() {
    setInterval(() => {
      // 单位: 微秒
      let loopMetrics = this.collector.getLoopMetrics();
      this.reportEventLoop(loopMetrics);
    }, this.config.eventLoop.frequency);
  }

  // vm 开启的线程数量
  thread() {
    setInterval(() => {
      this._readProcDir("task", (threads) => { this.reportThread(threads.length); });
    }, this.config.thread.frequency);
  }

  // vm 打开的文件描述符数量
  fd() {
    setInterval(() => {
      this._readProcDir("fd", (fds) => { this.reportFd(fds.length); });
    }, this.config.fd.frequency);
  }

  _readProcDir(name, callback) {
    fs.readdir(`/proc/${this.PID}/${name}`, (err, dirs) => {
      if (err) return this.reportError(name, err);
      callback(dirs);
    });
  }

  _report(type, metrics) {
    this.config.report(type, this.PID, metrics);
  }

  reportGC(metrics) {
    this._report("gc", metrics);
  }

  reportMemory(metrics) {
    this._report("memory", metrics);
  }

  reportCPU(metrics) {
    this._report("cpu", metrics);
  }

  reportEventLoop(metrics) {
    this._report("eventloop", metrics);
  }

  reportThread(metrics) {
    this._report("thread_count", metrics);
  }

  reportFd(metrics) {
    this._report("fd_count", metrics);
  }

  reportError(type, error) {
    this._report("sample_error", { type, error });
  }
}

function getConfig() {
  try {
    return require("./vm_stats.config.js");
  } catch (err) {
    return null;
  }
}

module.exports = (config = getConfig()) => { return new VMStats(config); };
