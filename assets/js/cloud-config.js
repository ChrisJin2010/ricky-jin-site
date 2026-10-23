/* ======================================================================
   Cloud service public config — returned by the platform at activation.
   These three values are the only ones safe to ship in front-end code:
   they identify the app and carry no permissions by themselves.
   Do not add any secret here.
   ====================================================================== */
window.RICKY_CLOUD_CONFIG = {
  endpoint: 'https://ricky-jin.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey: 'wbpk_NI3jg4B0DvSgdjLR3Cytk1_5vhTv5nRSp9E62ISKg0C3qABeQM0Ov5K'
};
