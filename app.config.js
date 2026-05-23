module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    kakaoJsApiKey: process.env.KAKAO_JS_API_KEY || config.extra?.kakaoJsApiKey,
    kakaoRestApiKey: process.env.KAKAO_REST_API_KEY || config.extra?.kakaoRestApiKey,
  },
});
