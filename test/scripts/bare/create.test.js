'use strict';

const loadScript = require('../../utils/load-script');

const dbType = 'bare';
const scriptName = 'create';

describe(scriptName, () => {
  let script;

  beforeAll(() => {
    script = loadScript(dbType, scriptName);
  });

  it('should return error', (done) => {
    script('user', (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('https://manage.auth0.com/#/connections/database');
      done();
    });
  });
});
