'use client';

import { Avatar } from '@mui/material';

interface UserAvatarProps {
  name: string;
  avatar?: string | null;
  size?: number;
}

export function UserAvatar({ name, avatar, size = 40 }: UserAvatarProps) {
  if (avatar) {
    return <Avatar src={avatar} alt={name} sx={{ width: size, height: size }} />;
  }
  return (
    <Avatar sx={{ width: size, height: size, bgcolor: 'primary.main', fontSize: size * 0.4 }}>
      {name.charAt(0).toUpperCase()}
    </Avatar>
  );
}

export default UserAvatar;
