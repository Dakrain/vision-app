import React, { ReactNode } from 'react';
import { ReactComponent as MeetingGuideLine1 } from './img_conference_guide_1.svg';
import { ReactComponent as MeetingGuideLine2 } from './img_conference_guide_2.svg';

export interface ImageProps {
  name: string;
  style?: React.CSSProperties;
}

export default function SvgImage({ name, style = {} }: ImageProps): ReactNode {
  switch (name) {
    case 'meetingGuideLine1':
      return <MeetingGuideLine1 style={style} />;
    case 'meetingGuideLine2':
      return <MeetingGuideLine2 style={style} />;
    default:
      return null;
  }
}
