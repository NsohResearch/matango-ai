/**
 * Social Media OAuth Configuration and Helpers
 * 
 * This module provides OAuth 2.0 integration for:
 * - Instagram (via Meta/Facebook Graph API)
 * - Facebook (via Meta Graph API)
 * - YouTube (via Google OAuth)
 * - TikTok (via TikTok for Developers)
 * - LinkedIn (via LinkedIn Marketing API)
 * 
 * To enable each platform, add the corresponding environment variables:
 * - INSTAGRAM_CLIENT_ID, INSTAGRAM_CLIENT_SECRET
 * - FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET
 * - YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET
 * - TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
 * - LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
}

// Get the base URL for OAuth callbacks
function getBaseUrl(): string {
  // In production, use the actual domain
  return process.env.OAUTH_REDIRECT_BASE_URL || 
         process.env.VITE_APP_URL || 
         'http://localhost:3000';
}

// Platform configurations
export const socialOAuthConfigs: Record<string, () => OAuthConfig | null> = {
  instagram: () => {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    
    return {
      clientId,
      clientSecret,
      redirectUri: `${getBaseUrl()}/api/oauth/instagram/callback`,
      authUrl: 'https://api.instagram.com/oauth/authorize',
      tokenUrl: 'https://api.instagram.com/oauth/access_token',
      scopes: ['user_profile', 'user_media'],
    };
  },
  
  facebook: () => {
    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    
    return {
      clientId,
      clientSecret,
      redirectUri: `${getBaseUrl()}/api/oauth/facebook/callback`,
      authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'publish_to_groups'],
    };
  },
  
  youtube: () => {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    
    return {
      clientId,
      clientSecret,
      redirectUri: `${getBaseUrl()}/api/oauth/youtube/callback`,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly',
      ],
    };
  },
  
  tiktok: () => {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    if (!clientKey || !clientSecret) return null;
    
    return {
      clientId: clientKey,
      clientSecret,
      redirectUri: `${getBaseUrl()}/api/oauth/tiktok/callback`,
      authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
      tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
      scopes: ['user.info.basic', 'video.publish', 'video.upload'],
    };
  },
  
  linkedin: () => {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    
    return {
      clientId,
      clientSecret,
      redirectUri: `${getBaseUrl()}/api/oauth/linkedin/callback`,
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
      scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
    };
  },
};

// Generate OAuth authorization URL
export function generateAuthUrl(platform: string, state: string): string | null {
  const configFn = socialOAuthConfigs[platform];
  if (!configFn) return null;
  
  const config = configFn();
  if (!config) return null;
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
  });
  
  // Platform-specific adjustments
  if (platform === 'youtube') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }
  
  if (platform === 'tiktok') {
    params.set('client_key', config.clientId);
    params.delete('client_id');
  }
  
  return `${config.authUrl}?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  platform: string, 
  code: string
): Promise<OAuthTokens | null> {
  const configFn = socialOAuthConfigs[platform];
  if (!configFn) return null;
  
  const config = configFn();
  if (!config) return null;
  
  try {
    const body: Record<string, string> = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    };
    
    // Platform-specific adjustments
    if (platform === 'tiktok') {
      body.client_key = config.clientId;
      delete body.client_id;
    }
    
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body).toString(),
    });
    
    if (!response.ok) {
      console.error(`OAuth token exchange failed for ${platform}:`, await response.text());
      return null;
    }
    
    const data = await response.json();
    
    // Normalize response across platforms
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in 
        ? new Date(Date.now() + data.expires_in * 1000) 
        : undefined,
      tokenType: data.token_type,
      scope: data.scope,
    };
  } catch (error) {
    console.error(`OAuth token exchange error for ${platform}:`, error);
    return null;
  }
}

// Refresh access token
export async function refreshAccessToken(
  platform: string,
  refreshToken: string
): Promise<OAuthTokens | null> {
  const configFn = socialOAuthConfigs[platform];
  if (!configFn) return null;
  
  const config = configFn();
  if (!config) return null;
  
  try {
    const body: Record<string, string> = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    };
    
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body).toString(),
    });
    
    if (!response.ok) {
      console.error(`OAuth token refresh failed for ${platform}:`, await response.text());
      return null;
    }
    
    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in 
        ? new Date(Date.now() + data.expires_in * 1000) 
        : undefined,
      tokenType: data.token_type,
      scope: data.scope,
    };
  } catch (error) {
    console.error(`OAuth token refresh error for ${platform}:`, error);
    return null;
  }
}

// Get user profile from platform
export async function getUserProfile(
  platform: string,
  accessToken: string
): Promise<{ id: string; username: string; displayName?: string; avatarUrl?: string } | null> {
  try {
    let url: string;
    let headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
    };
    
    switch (platform) {
      case 'instagram':
        url = 'https://graph.instagram.com/me?fields=id,username';
        break;
      case 'facebook':
        url = 'https://graph.facebook.com/me?fields=id,name,picture';
        break;
      case 'youtube':
        url = 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true';
        break;
      case 'tiktok':
        url = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url';
        break;
      case 'linkedin':
        url = 'https://api.linkedin.com/v2/me';
        break;
      default:
        return null;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.error(`Failed to get ${platform} profile:`, await response.text());
      return null;
    }
    
    const data = await response.json();
    
    // Normalize response
    switch (platform) {
      case 'instagram':
        return {
          id: data.id,
          username: data.username,
        };
      case 'facebook':
        return {
          id: data.id,
          username: data.name,
          displayName: data.name,
          avatarUrl: data.picture?.data?.url,
        };
      case 'youtube':
        const channel = data.items?.[0];
        return channel ? {
          id: channel.id,
          username: channel.snippet?.title,
          displayName: channel.snippet?.title,
          avatarUrl: channel.snippet?.thumbnails?.default?.url,
        } : null;
      case 'tiktok':
        return {
          id: data.data?.user?.open_id,
          username: data.data?.user?.display_name,
          displayName: data.data?.user?.display_name,
          avatarUrl: data.data?.user?.avatar_url,
        };
      case 'linkedin':
        return {
          id: data.id,
          username: `${data.localizedFirstName} ${data.localizedLastName}`,
          displayName: `${data.localizedFirstName} ${data.localizedLastName}`,
        };
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error getting ${platform} profile:`, error);
    return null;
  }
}

// Check if platform is configured
export function isPlatformConfigured(platform: string): boolean {
  const configFn = socialOAuthConfigs[platform];
  if (!configFn) return false;
  return configFn() !== null;
}

// Get all configured platforms
export function getConfiguredPlatforms(): string[] {
  return Object.keys(socialOAuthConfigs).filter(isPlatformConfigured);
}
