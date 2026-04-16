let secretKeyChallengeHandler = null;

export const setSecretKeyChallengeHandler = (handler) => {
  secretKeyChallengeHandler = typeof handler === 'function' ? handler : null;
};

export const requestSecretKeyChallenge = (options = {}) => {
  if (typeof secretKeyChallengeHandler !== 'function') {
    return Promise.reject(new Error('Secret key prompt is not ready.'));
  }

  return secretKeyChallengeHandler(options);
};
