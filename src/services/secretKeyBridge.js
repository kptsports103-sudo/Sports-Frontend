export const SECRET_KEY_CHALLENGE_CANCELLED = 'SECRET_KEY_CHALLENGE_CANCELLED';

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

export const isSecretKeyChallengeCancelled = (error) =>
  String(error?.code || '').trim() === SECRET_KEY_CHALLENGE_CANCELLED;
