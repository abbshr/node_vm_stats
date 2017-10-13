Node.js VM layer metric statistics utility
===

In Node.js 8.x.

Just a lite version newrelic-agent, because I just wanna to collection some vm metrics ;)

yeah, some code from newrelic-agent ;)

This module uses `newrelic/native-metrics` package inside, to collect underlying metrics, they are:

- process cpu usage/utilization
- memory usage
- v8 heap space stats
- gc duration and type
- eventloop tick related
- amount of backend threads
- amount of opend fds

# Install

```bash
npm i github:abbshr/node_vm_stats
```

# API
## class: `VMStats`

### `constructor`
```js
const stats = require("vm-stats")([configuration]);
```

### `start`

```js
stats.start
```

# Usage
```js
// in main module
const stats = require("vm-stats");
stats().start();
```

# configuration

- if no config object given, use `$pwd/vm_stats.config.js`
- and if no `$pwd/vm_stats.config.js` found, use defauts config as below
- if a config object pass to constructor, merge it with defaults config

```js
FREQUENCY = 15 * 1000; // unit: millisecond, how often do you want to collect the metrics
{
  gc: true,
  memory: { frequency: FREQUENCY },
  eventLoop: { frequency: FREQUENCY },
  cpuTime: { frequency: FREQUENCY },
  thread: { frequency: FREQUENCY },
  fd: { frequency: FREQUENCY },
  frequency: FREQUENCY,

  // a callback to report metrics and theirs type
  report(type, metrics) { console.log(type, metrics); }
}
```

# Metrics details & others

- see src comments
- see Newrelic Agent Doc: https://docs.newrelic.com/docs/agents/nodejs-agent/supported-features/nodejs-vm-measurements#garbage