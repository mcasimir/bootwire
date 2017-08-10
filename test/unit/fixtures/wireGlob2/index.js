module.exports = async({$wireGlob}) => {
  await $wireGlob('**/*.wire.js');
};
