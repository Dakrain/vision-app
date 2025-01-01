import { ReactNode } from 'react';
import { Avatar as AvatarAntd, Typography } from 'antd';
import AvatarProps from './type';

export function Avatar({
  url,
  radius,
  name,
  className,
}: AvatarProps): ReactNode {
  // Checj url is valid using regex and not empty
  const urlRegex = /^(https?:\/\/)?[^\s/$.?#].[^\s]*$/i;
  if (!urlRegex.test(url) || url === '') {
    return (
      <AvatarAntd
        className={className}
        size={radius * 2}
        style={{
          backgroundColor: '#ff3c3c',
        }}
      >
        <Typography.Text style={{ color: 'white', fontSize: radius }}>
          {name[0]}
        </Typography.Text>
      </AvatarAntd>
    );
  }

  return (
    <AvatarAntd
      className={className}
      src={url}
      size={radius * 2}
      style={{
        backgroundColor: '#ff3c3c',
      }}
    >
      <Typography.Text style={{ color: 'white', fontSize: radius }}>
        {name[0]}
      </Typography.Text>
    </AvatarAntd>
  );
}
