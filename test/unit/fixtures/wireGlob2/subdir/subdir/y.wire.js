module.exports = ({$set, $get}) => {
  $set('y', $get('x'));

  if (!global.__wireGlob2Called) {
    global.__wireGlob2Called = true;
    $set('calledTwice', false);
    return;
  }

  $set('calledTwice', true);
};
