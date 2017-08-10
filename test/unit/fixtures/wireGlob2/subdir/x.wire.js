module.exports = async({$set, $wireGlob}) => {
  $set('x', 2);
  await $wireGlob('./**/*.wire.js');
};
