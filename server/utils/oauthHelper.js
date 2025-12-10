/**
 * OAuth Helper Functions
 * Handles code exchange and user info retrieval for Google and GitHub
 */

export const exchangeCodeForToken = async (provider, code, redirectUri) => {
  if (provider === "google") {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error("Google OAuth credentials not configured");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error(
        "[Google OAuth] Token exchange failed:",
        JSON.stringify(tokenData)
      );
      throw new Error(
        `Google OAuth error: ${
          tokenData.error_description || "Token exchange failed"
        }`
      );
    }

    return tokenData.access_token;
  } else if (provider === "github") {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      throw new Error("GitHub OAuth credentials not configured");
    }

    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error(
        "[GitHub OAuth] Token exchange failed:",
        JSON.stringify(tokenData)
      );
      throw new Error(
        `GitHub OAuth error: ${
          tokenData.error_description || "Token exchange failed"
        }`
      );
    }

    return tokenData.access_token;
  }

  throw new Error("Unsupported OAuth provider");
};

export const getOAuthUserInfo = async (provider, accessToken) => {
  if (provider === "google") {
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const oauthUser = await userResponse.json();

    if (!oauthUser.email) {
      throw new Error("Email is required from Google account");
    }

    return {
      provider: "google",
      providerId: oauthUser.id,
      email: oauthUser.email,
      name: oauthUser.name || "User",
      avatar: oauthUser.picture,
      accessToken,
    };
  } else if (provider === "github") {
    const userResponse = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const oauthUser = await userResponse.json();

    // Get user email
    const emailResponse = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const emails = await emailResponse.json();
    const primaryEmail =
      emails.find((e) => e.primary)?.email || emails[0]?.email;

    if (!primaryEmail) {
      throw new Error("Email is required from GitHub account");
    }

    return {
      provider: "github",
      providerId: oauthUser.id,
      email: primaryEmail,
      name: oauthUser.name || oauthUser.login || "User",
      avatar: oauthUser.avatar_url,
      accessToken,
    };
  }

  throw new Error("Unsupported OAuth provider");
};

export const findOrCreateOAuthUser = async (User, oauthUser) => {
  const { provider, providerId, email, name, avatar, accessToken } = oauthUser;

  // Try to find by OAuth provider ID
  let user = await User.findOne({
    [`connectedAccounts.${provider}.id`]: providerId,
  });

  if (user) {
    // Update existing OAuth connection
    if (!user.connectedAccounts) {
      user.connectedAccounts = {};
    }
    user.connectedAccounts[provider] = {
      id: providerId,
      email,
      accessToken,
      connectedAt: new Date(),
    };
    await user.save();
    return user;
  }

  // Try to find by email
  user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    // Link OAuth to existing account
    if (!user.connectedAccounts) {
      user.connectedAccounts = {};
    }
    user.connectedAccounts[provider] = {
      id: providerId,
      email,
      accessToken,
      connectedAt: new Date(),
    };
    // Update avatar and name if not set
    if (!user.avatar) user.avatar = avatar;
    if (!user.fullName) user.fullName = name;
    await user.save();
    return user;
  }

  // Create new user
  user = new User({
    email: email.toLowerCase(),
    fullName: name,
    avatar,
    isEmailVerified: true, // OAuth users are automatically verified
    connectedAccounts: {
      [provider]: {
        id: providerId,
        email,
        accessToken,
        connectedAt: new Date(),
      },
    },
  });

  await user.save();
  return user;
};
