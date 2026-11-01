import { type JSX } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <div className="container">
      <div className="welcome-container">
        <span className="title-welcome">{t('home.page.welcome_title')}</span>
        <p className="description-welcome">
          {t('home.page.welcome_description')}
        </p>
      </div>
      <div className="content-container">
        <Button
          className="button-join-meeting"
          title={t('home.page.join_meeting')}
          variant="primary"
          style={{ width: 374 }}
          onClick={openJoinMeetingDialog}
        />
        <Button
          className="button-create-meeting"
          title={t('home.page.create_meeting')}
          variant="outline"
          style={{ width: 374 }}
          onClick={openCreateMeetingDialog}
        />
        <SvgImage name="meetingGuideLine1" />
        <span className="title-create-meeting">
          {t('home.page.schedule_title')}
        </span>
        <span className="description-create-meeting">
          {t('home.page.schedule_description_before')}
          <span className="text-bold">{t('home.page.create_meeting')}</span>
          {t('home.page.schedule_description_after')}
        </span>
      </div>
    </div>
  );
}

export default Home;
