console.log('test loaded');

describe('a test suite', function() {
  return it('should fail', function() {
    return expect(true).to.be["false"];
  });
});
