import { useThemedStyles } from '@/hooks/use-themed-styles';
import type { AppTheme } from '@/constants/theme';
import { useContext, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { VisualStyleContext, textStyleForVisualStyle } from '../home/visual-style-context';

type MetadataRecord = Record<string, unknown>;

function metadataForUser(user: User): MetadataRecord[] {
  const records: unknown[] = [user.user_metadata, ...(user.identities ?? []).map((identity) => identity.identity_data)];
  return records.filter((record): record is MetadataRecord => Boolean(record) && typeof record === 'object' && !Array.isArray(record));
}

function firstMetadataString(records: MetadataRecord[], keys: string[]) {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return null;
}

export function getProfileDisplayName(user: User) {
  const records = metadataForUser(user);
  const name = firstMetadataString(records, ['full_name', 'name', 'display_name', 'preferred_username']);
  if (name) return name;
  const emailName = user.email?.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return emailName || 'Your account';
}

export function getProfileProviderLabel(user: User) {
  const provider = typeof user.app_metadata.provider === 'string'
    ? user.app_metadata.provider
    : user.identities?.find((identity) => identity.provider === 'google' || identity.provider === 'apple')?.provider;
  if (provider === 'google') return 'Google';
  if (provider === 'apple') return 'Apple';
  return 'Connected';
}

export function getProfileAvatarUri(user: User) {
  const records = metadataForUser(user);
  const candidate = firstMetadataString(records, ['picture', 'avatar_url', 'avatarUrl', 'photo_url', 'photoURL']);
  if (!candidate) return null;
  try {
    const uri = new URL(candidate);
    return uri.protocol === 'https:' && uri.hostname ? uri.toString() : null;
  } catch {
    return null;
  }
}

function initialsFor(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.length > 1
    ? words.slice(0, 2).map((word) => Array.from(word)[0] ?? '').join('')
    : Array.from(words[0] ?? 'D').slice(0, 2).join('');
  return initials.toLocaleUpperCase() || 'D';
}

export function ProfileAvatar({ name, uri }: { name: string; uri: string | null }) {
    const styles = useThemedStyles(createStyles);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const visualStyle = useContext(VisualStyleContext);
  const shouldShowImage = Boolean(uri && failedUri !== uri);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={shouldShowImage ? `Profile photo for ${name}` : `Profile initials for ${name}`}
      style={styles.avatar}
    >
      <View style={styles.fallback}>
        <Text accessible={false} style={[styles.initials, textStyleForVisualStyle(visualStyle)]}>{initialsFor(name)}</Text>
      </View>
      {shouldShowImage && uri ? (
        <Image
          accessible={false}
          source={{ uri }}
          resizeMode="cover"
          fadeDuration={0}
          onError={() => setFailedUri(uri)}
        style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}

const createStyles = (palette: AppTheme) => {   return StyleSheet.create({
  avatar: {
    width: 74,
    height: 74,
    overflow: 'hidden',
    borderRadius: 37,
    backgroundColor: palette.lightGreen,
  },
  fallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: palette.green,
    fontFamily: 'Satoshi',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
}); };
