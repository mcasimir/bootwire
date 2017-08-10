module.exports = async({$wireGlob, $set}) => {
  if (!global.__wireGlob1Called) {
    global.__wireGlob1Called = true;
    $set('calledTwice', false);
    return await $wireGlob('**/*.wire.js');
  }

  $set('calledTwice', true);
};
