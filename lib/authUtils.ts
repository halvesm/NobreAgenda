import { supabase } from './supabase';

/**
 * Resets a user's password using an explicit access token.
 * This is useful when the automatic session recovery doesn't catch the hash token.
 * 
 * @param accessToken The token extracted from the recovery email link
 * @param newPassword The new password to set for the user
 */
export const resetPasswordWithToken = async (accessToken: string, refreshToken: string, newPassword: string) => {
    // 1. Manually set the session using the tokens
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
    });

    if (sessionError) throw sessionError;

    // 2. Update the user password
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (error) throw error;
    return data;
};
