// Build-time settings (see EnvironmentPlugin in .erb/configs/webpack.config.base.ts).
export const API_BASE_URL = process.env.VISION_API_URL as string;
export const AGORA_APP_ID = process.env.VISION_AGORA_APP_ID as string;
