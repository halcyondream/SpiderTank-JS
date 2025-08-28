const LEVELS = {
  'ERROR': 1,
  'WARN': 2,
  'INFO': 3,
  'DEBUG': 4
};

const getLogLevel = () => {
  switch (process.env?.LOG_LEVEL) {
  case 'ERROR': return LEVELS['ERROR'];
  case 'WARN': return LEVELS['WARN'];
  case 'INFO': return LEVELS['INFO'];
  case 'DEBUG': return LEVELS['DEBUG'];
  default: return 0;
  }
};

const error = (message) => {
  if (getLogLevel() >= LEVELS['ERROR']) {
    console.error('[ERROR]', message);
  }
};

const warn = (message) => {
  if (getLogLevel() >= LEVELS['WARN']) {
    console.warn('[WARNING]', message);
  }
};

const info = (message) => {
  if (getLogLevel() >= LEVELS['INFO']) {
    console.info('[INFO]', message);
  }
};

const debug = (message) => {
  if (getLogLevel() === LEVELS['DEBUG']) {
    console.error('[DEBUG]', message);
  }
};

export default {
  getLogLevel,
  error,
  warn,
  info,
  debug
};