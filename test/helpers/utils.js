const assertRevert = async (cb) => {
  try {
    await cb();
    assert.fail();
  } catch(error) {
    assert.isAbove(error.message.search('revert'), -1, 'Error containing "revert" must be returned');
  }
}

module.exports = {
  assertRevert,
};
