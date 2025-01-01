import { type JSX } from 'react';
import './Home.scss';
import { Button } from '@/shared/components/Button';
import SvgImage from '../../../../../../assets/svg/images';

interface HomeProps {
  openJoinMeetingDialog: () => void;
  openCreateMeetingDialog: () => void;
}

function Home({
  openJoinMeetingDialog,
  openCreateMeetingDialog,
}: HomeProps): JSX.Element {
  return (
    <div className="container">
      <div className="welcome-container">
        <span className="title-welcome">Welcome to Vision 20</span>
        <p className="description-welcome">
          Here is something for you to get started...
        </p>
      </div>
      <div className="content-container">
        <Button
          className="button-join-meeting"
          title="Tham gia cuộc họp"
          variant="primary"
          style={{ width: 374 }}
          onClick={openJoinMeetingDialog}
        />
        <Button
          className="button-create-meeting"
          title="Tạo cuộc họp mới"
          variant="outline"
          style={{ width: 374 }}
          onClick={openCreateMeetingDialog}
        />
        <SvgImage name="meetingGuideLine1" />
        <span className="title-create-meeting">Lên lịch cho cuộc họp</span>
        <span className="description-create-meeting">
          Nhấn vào <span className="text-bold">Tạo cuộc họp mới</span> để có thể
          Bắt đầu cuộc họp tức thì hay Lên lịch cho cuộc họp.
        </span>
      </div>
    </div>
  );
}

export default Home;
