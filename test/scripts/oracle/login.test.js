'use strict';

const bcrypt = require('bcrypt');

const loadScript = require('../../utils/load-script');

const dbType = 'oracle';
const scriptName = 'login';

describe(scriptName, () => {
  const execute = jest.fn();
  const close = jest.fn();
  const oracledb = {
    outFormat: '',
    OBJECT: '',
    getConnection: (options, callback) => {
      const expectedOptions = {
        user: 'dbUser',
        password: 'dbUserPassword',
        connectString: 'CONNECTION_STRING'
      };

      expect(options).toEqual(expectedOptions);

      callback(null, { execute, close });
    }
  };

  const globals = {
    WrongUsernameOrPasswordError: Error,
    configuration: { dbUser: 'dbUser', dbUserPassword: 'dbUserPassword' }
  };
  const stubs = { oracledb };

  let script;

  beforeAll(() => {
    script = loadScript(dbType, scriptName, globals, stubs);
  });

  it('should return database error', (done) => {
    execute.mockImplementation((query, params, callback) => callback(new Error('test db error')));

    script('broken@example.com', 'password', (err) => {
      expect(close).toHaveBeenCalled();
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual('test db error');
      done();
    });
  });

  it('should return error, if there is no such user', (done) => {
    execute.mockImplementation((query, params, callback) => callback(null, { rows: [] }));

    script('missing@example.com', 'password', (err) => {
      expect(close).toHaveBeenCalled();
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual('missing@example.com');
      done();
    });
  });

  it('should return hash error', (done) => {
    execute.mockImplementation((query, params, callback) => callback(null, { rows: [{}] }));

    script('empty@example.com', 'password', (err) => {
      expect(close).toHaveBeenCalled();
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual('data and hash arguments required');
      done();
    });
  });

  it('should return error, if password is incorrect', (done) => {
    execute.mockImplementation((query, params, callback) => callback(null, { rows: [{ PASSWORD: 'random-hash' }] }));

    script('duck.t@example.com', 'wrongPassword', (err) => {
      expect(close).toHaveBeenCalled();
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual('duck.t@example.com');
      done();
    });
  });

  it('should return user data', (done) => {
    execute.mockImplementation((query, params, callback) => {
      expect(query).toEqual('select ID, EMAIL, PASSWORD, NICKNAME from Users where EMAIL = :email');
      expect(params[0]).toEqual('duck.t@example.com');

      const row = {
        ID: 'uid1',
        EMAIL: 'duck.t@example.com',
        NICKNAME: 'T-Duck',
        PASSWORD: bcrypt.hashSync('password', 10)
      };

      callback(null, { rows: [ row ] });
    });

    script('duck.t@example.com', 'password', (err, user) => {
      const expectedUser = {
        user_id: 'uid1',
        email: 'duck.t@example.com',
        nickname: 'T-Duck'
      };

      expect(close).toHaveBeenCalled();
      expect(err).toBeFalsy();
      expect(user).toEqual(expectedUser);
      done();
    });
  });
});
